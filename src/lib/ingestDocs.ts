import "server-only";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { parseBalancetePDF } from "@/lib/balanceteParser";

type IngestArgs = {
  docKey: string;
  title: string;
  fileBytes?: Uint8Array | null;
  originalFileName?: string | null;
  saveOriginalPdf?: boolean; // default true
  text?: string | null;      // opcional (se quiser forçar texto)
};

function nowISO() {
  return new Date().toISOString();
}

function chunkText(text: string, maxChars = 1800) {
  const cleaned = text.replace(/\r/g, "");
  const parts = cleaned.split(/\n{2,}/g).map((s) => s.trim()).filter(Boolean);

  const chunks: string[] = [];
  let buf = "";

  for (const p of parts) {
    if ((buf + "\n\n" + p).length > maxChars) {
      if (buf.trim()) chunks.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

export async function ingestDocument(args: IngestArgs) {
  const createdAt = nowISO();
  const updatedAt = createdAt;

  let uploaded = false;
  let savedPath: string | null = null;

  // 1) salva PDF original (se veio)
  if (args.fileBytes && args.saveOriginalPdf !== false) {
    const dir = path.join(process.cwd(), "data", "docs", args.docKey);
    fs.mkdirSync(dir, { recursive: true });

    savedPath = path.join(dir, "original.pdf");
    fs.writeFileSync(savedPath, Buffer.from(args.fileBytes));
    uploaded = true;
  }

  // 2) pega texto: prioriza args.text, senão extrai do pdf
  let text = (args.text ?? "").trim();
  if (!text && args.fileBytes) {
    const parsed = await parseBalancetePDF(args.fileBytes, args.originalFileName || "doc.pdf");
    text = (parsed.text || "").trim();
  }

  // 3) upsert doc
  const existing = db
    .prepare(`SELECT id FROM docs WHERE docKey = ?`)
    .get(args.docKey) as any;

  if (!existing) {
    db.prepare(`
      INSERT INTO docs (docKey, title, originalFileName, savedPath, createdAt, updatedAt)
      VALUES (@docKey, @title, @originalFileName, @savedPath, @createdAt, @updatedAt)
    `).run({
      docKey: args.docKey,
      title: args.title,
      originalFileName: args.originalFileName ?? null,
      savedPath,
      createdAt,
      updatedAt,
    });
  } else {
    db.prepare(`
      UPDATE docs
      SET title=@title, originalFileName=@originalFileName, savedPath=@savedPath, updatedAt=@updatedAt
      WHERE docKey=@docKey
    `).run({
      docKey: args.docKey,
      title: args.title,
      originalFileName: args.originalFileName ?? null,
      savedPath,
      updatedAt,
    });

    // limpa chunks antigos (pra reseedar sem duplicar)
    db.prepare(`DELETE FROM doc_chunks WHERE docId = (SELECT id FROM docs WHERE docKey = ?)`)
      .run(args.docKey);
  }

  const row = db.prepare(`SELECT id FROM docs WHERE docKey = ?`).get(args.docKey) as any;
  const docId = row.id as number;

  // 4) salva chunks + FTS
  const chunks = text ? chunkText(text) : [];
  const insert = db.prepare(`
    INSERT INTO doc_chunks (docId, chunkIndex, content, createdAt)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (let i = 0; i < chunks.length; i++) {
      insert.run(docId, i, chunks[i], createdAt);
    }
  });
  tx();

  return {
    ok: true,
    docKey: args.docKey,
    title: args.title,
    uploaded,
    originalFileName: args.originalFileName ?? null,
    savedPath,
    textIngested: !!text,
    chunks: chunks.length,
  };
}
