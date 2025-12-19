import "server-only";
import fs from "fs";
import path from "path";

export type DocChunkHit = {
  docKey: string;
  title: string;
  score: number;
  preview: string;
};

function safeReadJson(p: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreText(text: string, qTokens: string[]) {
  const t = normalize(text);
  let score = 0;
  for (const tok of qTokens) {
    if (!tok) continue;
    // peso maior pra match exato
    if (t.includes(tok)) score += 3;
    // match parcial leve
    if (tok.length >= 5) {
      const root = tok.slice(0, Math.min(7, tok.length));
      if (t.includes(root)) score += 1;
    }
  }
  return score;
}

function makePreview(text: string, qTokens: string[]) {
  const raw = (text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  // tenta achar primeiro token e recortar em volta
  const lower = raw.toLowerCase();
  const hitTok = qTokens.find((t) => t && lower.includes(t)) || "";
  const idx = hitTok ? lower.indexOf(hitTok) : -1;
  if (idx >= 0) {
    const start = Math.max(0, idx - 120);
    const end = Math.min(raw.length, idx + 240);
    return (start > 0 ? "..." : "") + raw.slice(start, end) + (end < raw.length ? "..." : "");
  }
  return raw.slice(0, 320) + (raw.length > 320 ? "..." : "");
}

export function searchSeededDocs(query: string, opts?: { limit?: number }) {
  const limit = opts?.limit ?? 6;

  const base = path.join(process.cwd(), "data", "docs");
  if (!fs.existsSync(base)) return [];

  const q = normalize(query);
  const qTokens = q.split(" ").filter(Boolean).slice(0, 12);

  const docKeys = fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const hits: DocChunkHit[] = [];

  for (const docKey of docKeys) {
    const dir = path.join(base, docKey);

    // tenta ler chunks.json (se existir)
    const chunksPath = path.join(dir, "chunks.json");
    const textPath = path.join(dir, "text.txt");

    let chunks: string[] = [];

    if (fs.existsSync(chunksPath)) {
      const parsed = safeReadJson(chunksPath);
      // aceitamos formatos comuns
      if (Array.isArray(parsed)) chunks = parsed.map(String);
      if (parsed?.chunks && Array.isArray(parsed.chunks)) chunks = parsed.chunks.map(String);
    }

    // fallback: text.txt vira 1 chunk grande (não é ideal, mas funciona)
    if (!chunks.length && fs.existsSync(textPath)) {
      chunks = [fs.readFileSync(textPath, "utf-8")];
    }

    const title = docKey;

    for (const c of chunks) {
      const sc = scoreText(c, qTokens);
      if (sc <= 0) continue;

      hits.push({
        docKey,
        title,
        score: sc,
        preview: makePreview(c, qTokens),
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
