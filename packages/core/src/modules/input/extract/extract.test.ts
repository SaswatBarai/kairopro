import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { UploadMimeType } from "@kairopro/contracts";
import { sniffMime } from "../sniff";
import { extractByMime } from ".";

/** A minimal, valid single-page PDF containing a known text string. Offsets
 * are computed, not guessed, so the xref stays correct. */
function buildPdf(text: string): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = body.length;
  const xref =
    `xref\n0 ${objects.length + 1}\n` +
    "0000000000 65535 f \n" +
    offsets
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join("");
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body + xref + trailer, "latin1");
}

/** A minimal, valid DOCX (OOXML zip) with one paragraph of known text. */
function buildDocx(text: string): Buffer {
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

  return Buffer.from(
    zipSync({
      "[Content_Types].xml": Buffer.from(contentTypes, "utf8"),
      "_rels/.rels": Buffer.from(relationships, "utf8"),
      "word/document.xml": Buffer.from(document, "utf8"),
    }),
  );
}

describe("sniffMime", () => {
  it.each([
    ["pdf", buildPdf("x"), "application/pdf"],
    [
      "docx (zip)",
      buildDocx("x"),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    [
      "png",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "image/png",
    ],
    ["jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"],
    [
      "svg",
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      "image/svg+xml",
    ],
    ["markdown", Buffer.from("# Heading\n\n- item\n"), "text/markdown"],
    ["plain text", Buffer.from("just words"), "text/plain"],
  ] as [string, Buffer, UploadMimeType][])(
    "sniffs %s",
    (_label, buffer, expected) => {
      expect(sniffMime(buffer)).toBe(expected);
    },
  );

  it("returns null for unknown binaries and empty buffers", () => {
    expect(sniffMime(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBeNull();
    // Realistic GIF header: ASCII magic + binary screen descriptor with NULs.
    const gif = Buffer.alloc(15);
    gif.write("GIF89a", 0, "latin1");
    gif.set([0xf0, 0x00, 0x00, 0xf0, 0x00, 0x00, 0x80, 0x00, 0x00], 6);
    expect(sniffMime(gif)).toBeNull();
    expect(sniffMime(Buffer.alloc(0))).toBeNull();
  });
});

describe("extractByMime", () => {
  it("extracts the text from a real PDF", async () => {
    const text = await extractByMime(
      "application/pdf",
      buildPdf("KairoPro PDF smoke"),
    );
    expect(text).toContain("KairoPro PDF smoke");
  });

  it("extracts the text from a real DOCX", async () => {
    const text = await extractByMime(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buildDocx("KairoPro DOCX smoke"),
    );
    expect(text).toBe("KairoPro DOCX smoke");
  });

  it("passes TXT and MD content through", async () => {
    expect(await extractByMime("text/plain", Buffer.from("plain hello"))).toBe(
      "plain hello",
    );
    expect(
      await extractByMime("text/markdown", Buffer.from("# md hello")),
    ).toBe("# md hello");
  });

  it("corrupt files return null rather than throwing", async () => {
    const corruptPdf = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.alloc(64, 0x7f),
    ]);
    expect(await extractByMime("application/pdf", corruptPdf)).toBeNull();

    const corruptDocx = Buffer.concat([
      Buffer.from("PK\x03\x04", "latin1"),
      Buffer.alloc(64, 0x00),
    ]);
    expect(
      await extractByMime(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        corruptDocx,
      ),
    ).toBeNull();
  });

  it("images are never extracted — vision passthrough returns null", async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    expect(await extractByMime("image/png", png)).toBeNull();
  });
});
