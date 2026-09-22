/**
 * Shapes of each `Spec.content` JSON blob. `@kairopro/contracts` keeps
 * `Spec.content` opaque (`z.json()`) — the real per-type schemas live
 * server-side in `packages/core/src/modules/agent/validators/*`, which the
 * frontend can't import (server-only). These are hand-mirrored, read-only
 * copies of those shapes for rendering — never used to validate or write.
 */

export interface PrdPersona {
  name: string;
  description: string;
}

export interface PrdUserStory {
  persona: string;
  story: string;
}

export interface PrdAssumption {
  questionId: string;
  assumption: string;
}

export interface PrdPermissionRule {
  role: string;
  entity: string;
  actions: string[];
}

export interface PrdBusinessRules {
  invariants: string[];
  permissionMatrix: PrdPermissionRule[];
  validationRules: string[];
  moneyRules: string[];
  sideEffects: string[];
}

export interface PrdContent {
  overview: string;
  goals: string[];
  nonGoals: string[];
  personas: PrdPersona[];
  userStories: PrdUserStory[];
  assumptions: PrdAssumption[];
  businessRules: PrdBusinessRules;
}

export interface DataModelContent {
  schema: string;
}

export interface DesignContent {
  markdown: string;
}

export interface AppStructurePage {
  route: string;
  personas: string[];
}

export interface AppStructureEndpoint {
  method: string;
  path: string;
  requestType: string;
  responseType: string;
}

export interface AppStructureComponent {
  name: string;
  responsibility: string;
}

export interface AppStructureContent {
  pages: AppStructurePage[];
  endpoints: AppStructureEndpoint[];
  components: AppStructureComponent[];
}

/** Best-effort — a lightweight regex reader, not a real Prisma parser. Good
 * enough to render a schema visually; never used to validate or write. */
export interface ParsedPrismaField {
  name: string;
  type: string;
  attributes: string;
  isId: boolean;
  isUnique: boolean;
  isRelation: boolean;
}

export interface ParsedPrismaModel {
  name: string;
  fields: ParsedPrismaField[];
}

export interface ParsedPrismaEnum {
  name: string;
  values: string[];
}

export function parsePrismaSchema(schema: string): {
  models: ParsedPrismaModel[];
  enums: ParsedPrismaEnum[];
} {
  const models: ParsedPrismaModel[] = [];
  const enums: ParsedPrismaEnum[] = [];

  const blockRe = /(model|enum)\s+(\w+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(schema)) !== null) {
    const [, kind, name, body] = match;
    const lines = body!
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("//"));

    if (kind === "enum") {
      enums.push({
        name: name!,
        values: lines.filter((l) => !l.startsWith("@@")),
      });
      continue;
    }

    const fields: ParsedPrismaField[] = [];
    for (const line of lines) {
      if (line.startsWith("@@")) continue;
      const parts = line.split(/\s+/);
      const fieldName = parts[0];
      const type = parts[1];
      if (!fieldName || !type) continue;
      const attributes = parts.slice(2).join(" ");
      fields.push({
        name: fieldName,
        type,
        attributes,
        isId: attributes.includes("@id"),
        isUnique: attributes.includes("@unique"),
        isRelation: false,
      });
    }
    models.push({ name: name!, fields });
  }

  const modelNames = new Set(models.map((m) => m.name));
  for (const model of models) {
    for (const field of model.fields) {
      const base = field.type.replace(/[[\]?]/g, "");
      if (modelNames.has(base)) field.isRelation = true;
    }
  }

  return { models, enums };
}
