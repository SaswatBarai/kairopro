import { describe, expect, it } from "vitest";
import { tokenize } from "./highlight";

const SAMPLE = `import { z } from "zod";
// a comment
/* block
   comment */
export const Task = z.object({ id: z.string(), n: 42 });
const s = \`tpl \${x}\`;
model User {
  id String @id
}
`;

const kinds = (code: string) =>
  tokenize(code).map((t) => `${t.kind}:${t.text}`);

describe("tokenize", () => {
  it("classifies keywords, strings, numbers, comments and types", () => {
    expect(kinds('const a = "x"; // hi')).toEqual([
      "keyword:const",
      "plain: a = ",
      'string:"x"',
      "plain:; ",
      "comment:// hi",
    ]);
    expect(kinds("n = 42")).toContain("number:42");
    expect(kinds("z.object(Task)")).toContain("type:Task");
    expect(kinds("model User {")[0]).toBe("keyword:model");
  });

  it("is lossless for every prefix, so a half-written file is safe to render", () => {
    for (let i = 0; i <= SAMPLE.length; i++) {
      const prefix = SAMPLE.slice(0, i);
      expect(
        tokenize(prefix)
          .map((t) => t.text)
          .join(""),
      ).toBe(prefix);
    }
  });

  it("lets an unterminated block comment or string run to the end", () => {
    expect(tokenize("/* still writing").at(-1)).toEqual({
      kind: "comment",
      text: "/* still writing",
    });
    expect(tokenize('const a = "still').at(-1)!.text).toContain("still");
  });

  it("does not treat a keyword inside a longer word as a keyword", () => {
    expect(kinds("constant = 1")).not.toContain("keyword:constant");
    expect(kinds("format")).not.toContain("keyword:for");
  });

  it("handles empty input", () => {
    expect(tokenize("")).toEqual([]);
  });
});
