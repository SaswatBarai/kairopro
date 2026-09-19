import { z } from "zod";
import { NotFoundError, ValidationError } from "../../../lib/errors";
import type { Tool, ToolResult } from "./registry";
import { truncateOutput } from "./safety";

/**
 * File tools (Phase 9 / AI-2): the agent's read/write access to a project's
 * workspace. Every path goes through `WorkspaceStore`
 * (`readFile`/`writeFile`/`listFiles`/`deleteEntry`), which is what
 * actually enforces confinement — these tools never touch the filesystem
 * directly.
 */

function toResult(output: string): ToolResult {
  const { content, truncated } = truncateOutput(output);
  return { output: content, truncated };
}

function isEnoent(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "ENOENT"
  );
}

const ReadFileInput = z.object({ path: z.string().min(1) });

export const readFileTool: Tool<z.infer<typeof ReadFileInput>> = {
  name: "read_file",
  description: "Read a file's contents from the project workspace.",
  inputSchema: ReadFileInput,
  async run(input, context) {
    try {
      const contents = await context.workspace.readFile(
        context.projectId,
        input.path,
      );
      return toResult(contents);
    } catch (cause) {
      if (isEnoent(cause)) {
        throw new NotFoundError({
          message: `File not found: ${input.path}`,
          cause,
        });
      }
      throw cause;
    }
  },
};

const WriteFileInput = z.object({
  path: z.string().min(1),
  contents: z.string(),
});

export const writeFileTool: Tool<z.infer<typeof WriteFileInput>> = {
  name: "write_file",
  description:
    "Write a file in the project workspace, creating parent directories as needed. Overwrites an existing file.",
  inputSchema: WriteFileInput,
  async run(input, context) {
    await context.workspace.writeFile(
      context.projectId,
      input.path,
      input.contents,
    );
    return toResult(
      `Wrote ${Buffer.byteLength(input.contents, "utf8")} bytes to ${input.path}`,
    );
  },
};

const EditFileInput = z.object({
  path: z.string().min(1),
  match: z.string().min(1),
  replacement: z.string(),
});

export const editFileTool: Tool<z.infer<typeof EditFileInput>> = {
  name: "edit_file",
  description:
    "Replace an exact, unique substring in a workspace file. Fails if the match is missing or appears more than once.",
  inputSchema: EditFileInput,
  async run(input, context) {
    let contents: string;
    try {
      contents = await context.workspace.readFile(
        context.projectId,
        input.path,
      );
    } catch (cause) {
      if (isEnoent(cause)) {
        throw new NotFoundError({
          message: `File not found: ${input.path}`,
          cause,
        });
      }
      throw cause;
    }

    const occurrences = countOccurrences(contents, input.match);
    if (occurrences === 0) {
      throw new ValidationError({
        message: `No match found in ${input.path}`,
        details: { path: input.path },
      });
    }
    if (occurrences > 1) {
      throw new ValidationError({
        message: `Match is ambiguous in ${input.path}: ${occurrences} occurrences found, expected exactly 1`,
        details: { path: input.path, occurrences },
      });
    }

    // Manual splice, not String.replace: the replacement is arbitrary
    // agent-generated text, and String.replace treats "$&"/"$1"/etc. in the
    // replacement as special patterns even for a literal-string search.
    const start = contents.indexOf(input.match);
    const updated =
      contents.slice(0, start) +
      input.replacement +
      contents.slice(start + input.match.length);
    await context.workspace.writeFile(context.projectId, input.path, updated);
    return toResult(`Replaced 1 occurrence in ${input.path}`);
  },
};

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count++;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

const DeleteFileInput = z.object({ path: z.string().min(1) });

export const deleteFileTool: Tool<z.infer<typeof DeleteFileInput>> = {
  name: "delete_file",
  description:
    "Delete a file or directory in the project workspace. Refuses the workspace root.",
  inputSchema: DeleteFileInput,
  async run(input, context) {
    await context.workspace.deleteEntry(context.projectId, input.path);
    return toResult(`Deleted ${input.path}`);
  },
};

const ListFilesInput = z.object({ path: z.string().min(1).optional() });

export const listFilesTool: Tool<z.infer<typeof ListFilesInput>> = {
  name: "list_files",
  description:
    "List files in the project workspace, recursively, under an optional relative path.",
  inputSchema: ListFilesInput,
  async run(input, context) {
    const files = await context.workspace.listFiles(
      context.projectId,
      input.path,
    );
    return toResult(files.length ? files.join("\n") : "(empty)");
  },
};
