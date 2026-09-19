import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  CredentialServiceSchema,
  PutCredentialInputSchema,
} from "@kairopro/contracts";
import {
  ValidationError,
  deleteCredential,
  putCredential,
} from "@kairopro/core";
import { toErrorResponse } from "@/lib/api";
import { getRequestContext } from "@/lib/request-context";

type RouteContext = { params: Promise<{ id: string; service: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { id, service } = await params;
    const serviceResult = CredentialServiceSchema.safeParse(service);
    if (!serviceResult.success) {
      throw new ValidationError({
        message: `Unknown credential service: ${service}`,
        details: serviceResult.error.flatten(),
      });
    }

    const body = await req.json();
    const parsed = PutCredentialInputSchema.safeParse({
      service: serviceResult.data,
      values: body?.values,
    });
    if (!parsed.success) {
      throw new ValidationError({
        message: "Invalid credential values",
        details: parsed.error.flatten(),
      });
    }

    const ctx = await getRequestContext();
    const result = await putCredential(id, parsed.data, ctx);
    revalidatePath(`/projects/${id}`);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id, service } = await params;
    const serviceResult = CredentialServiceSchema.safeParse(service);
    if (!serviceResult.success) {
      throw new ValidationError({
        message: `Unknown credential service: ${service}`,
        details: serviceResult.error.flatten(),
      });
    }

    const ctx = await getRequestContext();
    await deleteCredential(id, serviceResult.data, ctx);
    revalidatePath(`/projects/${id}`);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
