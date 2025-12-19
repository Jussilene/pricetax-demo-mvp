// src/lib/seedDocs.ts
import "server-only";
import fs from "fs";
import path from "path";
import { ingestDocument } from "@/lib/ingestDocs";

export type SeedDoc = {
  docKey: string;   // "tcc" | "livro" | "formulas"
  title: string;
  filePath: string; // caminho absoluto
  mime: string;     // application/pdf ou text/plain
};

function projectRoot() {
  return process.cwd();
}

function seedDir() {
  return path.join(projectRoot(), "src", "seed_docs");
}

export function listSeedDocs(): SeedDoc[] {
  const dir = seedDir();

  const docs: SeedDoc[] = [
    {
      docKey: "tcc",
      title: "TCC PriceTax",
      filePath: path.join(dir, "tcc.pdf"),
      mime: "application/pdf",
    },
    {
      docKey: "livro",
      title: "Livro do Projeto",
      filePath: path.join(dir, "livro.pdf"),
      mime: "application/pdf",
    },
    {
      docKey: "formulas",
      title: "Documento de Fórmulas (Análise Linhares / Fórmulas)",
      filePath: path.join(dir, "formulas.pdf"), // pode trocar pra formulas.txt/md
      mime: "application/pdf",
    },
  ];

  return docs;
}

export async function seedAllDocs() {
  const docs = listSeedDocs();

  const results: any[] = [];

  for (const d of docs) {
    if (!fs.existsSync(d.filePath)) {
      results.push({
        ok: false,
        docKey: d.docKey,
        title: d.title,
        error: `Arquivo não encontrado: ${d.filePath}`,
      });
      continue;
    }

    const bytes = fs.readFileSync(d.filePath);

    const res = await ingestDocument({
      docKey: d.docKey,
      title: d.title,
      // salva o “arquivo fonte” em /data/docs/<docKey>/original.*
      originalFile: {
        fileName: path.basename(d.filePath),
        mime: d.mime,
        bytes,
      },
      // e também extrai texto + chunks pro SQLite
      // (o ingestDocument decide como extrair dependendo do mime)
      text: null,
    });

    results.push(res);
  }

  return results;
}
