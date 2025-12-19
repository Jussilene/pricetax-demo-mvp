// src/lib/balanceteParser.ts
import path from "path";
import * as pdfParseModule from "pdf-parse";

export type ParsedBalancete = {
  fileName: string;
  pages: number;
  text: string;
  perPageText: string[]; // (aqui é "chunks" por blocos, não página real)
  detectedYear?: number | null;
};

function guessYearFromName(fileName: string): number | null {
  const m = fileName.match(/(19|20)\d{2}/);
  if (!m) return null;
  const y = Number(m[0]);
  return Number.isFinite(y) ? y : null;
}

// ✅ Polyfills mínimos (Node não tem DOM) — mantemos só pra evitar crashes em alguns builds
function ensureDomPolyfills() {
  const g: any = globalThis as any;
  if (typeof g.DOMMatrix === "undefined") g.DOMMatrix = class DOMMatrix {};
  if (typeof g.ImageData === "undefined") g.ImageData = class ImageData {};
  if (typeof g.Path2D === "undefined") g.Path2D = class Path2D {};
}

function pickPdfParseFn(mod: any): ((buffer: Buffer, opts?: any) => Promise<any>) | null {
  if (!mod) return null;

  const candidates = [mod, mod.default, mod.PDFParse, mod.pdfParse, mod.parse];

  for (const c of candidates) {
    if (typeof c === "function") return c;
  }
  return null;
}

/**
 * ✅ Ajuste: em vez de require() dinâmico (que quebra no Next/webpack),
 * usamos import estático e escolhemos a função exportada.
 */
function loadPdfParseFn(): (buffer: Buffer, opts?: any) => Promise<any> {
  ensureDomPolyfills();

  const fn = pickPdfParseFn(pdfParseModule as any);
  if (fn) return fn;

  const keys = pdfParseModule ? Object.keys(pdfParseModule as any) : [];
  throw new Error(
    `Não consegui obter a função do pdf-parse via import estático. Keys: ${JSON.stringify(keys)}`
  );
}

export async function parseBalancetePDF(
  fileBytes: Uint8Array,
  fileName: string
): Promise<ParsedBalancete> {
  const pdfParse = loadPdfParseFn();

  const buffer = Buffer.from(fileBytes);

  // ✅ IMPORTANTE:
  // NÃO usar pagerender retornando "" porque isso zera o texto.
  // Só pedimos o parse padrão e deixamos o pdf-parse extrair o texto.
  const data = await pdfParse(buffer, { max: 0 });

  const text = (data?.text ?? "").toString();

  return {
    fileName: path.basename(fileName),
    pages: Number(data?.numpages ?? 0),
    text,
    perPageText: text.split(/\n{2,}/g), // blocos por espaçamento (quebra “natural”)
    detectedYear: guessYearFromName(fileName),
  };
}
