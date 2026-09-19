import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import multer from "multer";
import { Readable } from "node:stream";
import { MAX_UPLOAD_BYTES } from "@kairopro/contracts";
import {
  createFileInputs,
  listInputs,
  saveTextInput,
  ValidationError,
  type IncomingUpload,
} from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string }> };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
});

function runMulterMiddleware(req: Request): Promise<{
  files: Express.Multer.File[];
  fields: Record<string, string>;
}> {
  return new Promise(async (resolve, reject) => {
    try {
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return reject(
          new ValidationError({ message: "Expected multipart/form-data" }),
        );
      }

      const arrayBuffer = await req.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const nodeReq: any = Readable.from(buffer);

      nodeReq.headers = Object.fromEntries(req.headers.entries());
      nodeReq.headers["content-length"] = String(buffer.length);
      nodeReq.method = req.method;

      const fakeRes = {} as any;
      upload.any()(nodeReq, fakeRes, (err: any) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
              return reject(
                new ValidationError({
                  message: "Files must be 10MB or smaller",
                }),
              );
            }
            return reject(
              new ValidationError({
                message: err.message,
                details: { code: err.code },
              }),
            );
          }
          return reject(err);
        }
        resolve({
          files: (nodeReq.files as Express.Multer.File[]) || [],
          fields: (nodeReq.body as Record<string, string>) || {},
        });
      });
    } catch (cause) {
      reject(cause);
    }
  });
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const inputs = await listInputs(id, ctx);
    return NextResponse.json(inputs);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getRequestContext();
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const text =
        typeof body?.text === "string"
          ? body.text
          : typeof body?.content === "string"
            ? body.content
            : typeof body === "string"
              ? body
              : body;
      const input = await saveTextInput(id, text, ctx);
      revalidatePath(`/projects/${id}`);
      return NextResponse.json(input, { status: 201 });
    }

    if (contentType.includes("multipart/form-data")) {
      const { files, fields } = await runMulterMiddleware(req);
      if (files.length > 0) {
        const incoming: IncomingUpload[] = files.map((file) => ({
          buffer: file.buffer,
          originalName: file.originalname,
        }));
        const created = await createFileInputs(id, incoming, ctx);
        revalidatePath(`/projects/${id}`);
        return NextResponse.json(created, { status: 201 });
      }

      if (fields.text !== undefined) {
        const input = await saveTextInput(id, fields.text, ctx);
        revalidatePath(`/projects/${id}`);
        return NextResponse.json(input, { status: 201 });
      }

      throw new ValidationError({ message: "No files were uploaded" });
    }

    throw new ValidationError({
      message:
        "Unsupported Content-Type — expected multipart/form-data or application/json",
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
