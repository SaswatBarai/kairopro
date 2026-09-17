import type { InputKind, Prisma } from "@kairopro/db";
import { db } from "../../platform/db/client";

/** DB access for project inputs — business rules live in the service. */
export type InputRow = Prisma.InputGetPayload<{}>;

export function listInputsByProject(projectId: string): Promise<InputRow[]> {
  return db.input.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}

export function findTextInput(projectId: string): Promise<InputRow | null> {
  return db.input.findFirst({
    where: { projectId, kind: "TEXT" },
    orderBy: { createdAt: "asc" },
  });
}

export function countFileInputs(projectId: string): Promise<number> {
  return db.input.count({ where: { projectId, kind: "FILE" } });
}

export function findInputById(inputId: string): Promise<InputRow | null> {
  return db.input.findUnique({ where: { id: inputId } });
}

export function createInput(
  data: Prisma.InputUncheckedCreateInput,
): Promise<InputRow> {
  return db.input.create({ data });
}

export function updateInput(
  inputId: string,
  data: Prisma.InputUncheckedUpdateInput,
): Promise<InputRow> {
  return db.input.update({ where: { id: inputId }, data });
}

export async function deleteInputRow(inputId: string): Promise<void> {
  await db.input.delete({ where: { id: inputId } });
}

export async function deleteInputsByStoredNames(
  projectId: string,
  storedNames: string[],
): Promise<void> {
  if (storedNames.length === 0) return;
  await db.input.deleteMany({
    where: { projectId, storedName: { in: storedNames } },
  });
}

export type { InputKind };
