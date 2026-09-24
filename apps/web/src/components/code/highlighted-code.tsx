import { useMemo } from "react";

import { tokenize, type TokenKind } from "@/lib/highlight";

const TOKEN_CLASS: Record<TokenKind, string> = {
  comment: "text-zinc-500",
  string: "text-brand-cyan",
  keyword: "text-brand-purple-light",
  number: "text-brand-green",
  type: "text-sky-300",
  plain: "text-zinc-300",
};

interface HighlightedCodeProps {
  text: string;
  /** A blinking cursor after the last character — for code still being
   * written. */
  cursor?: boolean;
}

/** Source text with a line-number gutter and light syntax colouring. Safe to
 * render on a half-written file. */
export function HighlightedCode({
  text,
  cursor = false,
}: HighlightedCodeProps) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const lineCount = text.split("\n").length;

  return (
    <div className="flex gap-3 font-mono-tech text-[12px] leading-[1.6]">
      <div aria-hidden className="select-none text-right text-zinc-600">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="min-w-0 flex-1 select-text whitespace-pre">
        <code>
          {tokens.map((token, i) => (
            <span className={TOKEN_CLASS[token.kind]} key={i}>
              {token.text}
            </span>
          ))}
          {cursor && (
            <span className="ml-px inline-block h-[14px] w-[7px] animate-pulse bg-brand-cyan align-middle" />
          )}
        </code>
      </pre>
    </div>
  );
}
