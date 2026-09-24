export type TokenKind =
  "comment" | "string" | "keyword" | "number" | "type" | "plain";

export interface Token {
  kind: TokenKind;
  text: string;
}

/**
 * A deliberately small tokenizer for the languages a build writes
 * (TypeScript/TSX, Prisma, JSON) — enough to make streamed code readable
 * without shipping a highlighter. It runs on a file that is still being
 * written, so it must never throw or drop text on a partial input:
 * concatenating the tokens always gives back the input exactly, and an
 * unterminated string or comment at the end simply runs to the end.
 */

const KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "default",
  "const",
  "let",
  "var",
  "function",
  "async",
  "await",
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "throw",
  "new",
  "class",
  "extends",
  "implements",
  "interface",
  "type",
  "enum",
  "as",
  "in",
  "of",
  "typeof",
  "instanceof",
  "void",
  "static",
  "readonly",
  "public",
  "private",
  "protected",
  "true",
  "false",
  "null",
  "undefined",
  "this",
  // Prisma
  "model",
  "datasource",
  "generator",
]);

const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*(?:"|$)|'(?:[^'\\\n]|\\.)*(?:'|$)|`(?:[^`\\]|\\[\s\S])*(?:`|$))|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)/g;

export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  const push = (kind: TokenKind, text: string) => {
    if (!text) return;
    const last = tokens.at(-1);
    if (last && last.kind === kind && kind === "plain") last.text += text;
    else tokens.push({ kind, text });
  };

  let cursor = 0;
  for (const match of code.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    push("plain", code.slice(cursor, index));
    const [text, comment, string, number, word] = match;
    if (comment !== undefined) push("comment", text);
    else if (string !== undefined) push("string", text);
    else if (number !== undefined) push("number", text);
    else if (word !== undefined) {
      if (KEYWORDS.has(word)) push("keyword", text);
      else if (/^[A-Z]/.test(word)) push("type", text);
      else push("plain", text);
    }
    cursor = index + text.length;
  }
  push("plain", code.slice(cursor));
  return tokens;
}
