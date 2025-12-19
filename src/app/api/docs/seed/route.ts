import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ingestDocument } from "@/lib/ingestDocs";

export const runtime = "nodejs";

export async function POST() {
  try {
    // ✅ procura primeiro em src/seed_docs (teu caso), e faz fallback pra /seed_docs
    const base1 = path.join(process.cwd(), "src", "seed_docs");
    const base2 = path.join(process.cwd(), "seed_docs");
    const base = fs.existsSync(base1) ? base1 : base2;

    const items = [
      { docKey: "tcc", title: "TCC PriceTax", file: "tcc.pdf" },
      { docKey: "livro", title: "Livro do Projeto", file: "livro.pdf" },
      { docKey: "formulas", title: "Fórmulas / Análise Lineares", file: "formulas.pdf" },
    ];

    const results = [];

    for (const it of items) {
      const full = path.join(base, it.file);

      if (!fs.existsSync(full)) {
        results.push({ docKey: it.docKey, ok: false, error: `Arquivo não encontrado: ${full}` });
        continue;
      }

      const bytes = new Uint8Array(fs.readFileSync(full));
      results.push(
        await ingestDocument({
          docKey: it.docKey,
          title: it.title,
          fileBytes: bytes,
          originalFileName: it.file,
          saveOriginalPdf: true,
        })
      );
    }

    return NextResponse.json({ ok: true, baseUsed: base, results }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao seedar docs." },
      { status: 500 }
    );
  }
}
