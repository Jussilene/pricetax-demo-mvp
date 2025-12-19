export type MoneyBR = {
  raw: string;
  value: number; // em número normal
};

export type ContabilRow = {
  rawLine: string;

  // contexto
  group?: "ATIVO" | "PASSIVO" | "DRE" | "OUTROS";

  // campos
  code?: string | null;
  description?: string | null;
  classification?: string | null;

  saldoAtual?: MoneyBR | null;
  saldoAnterior?: MoneyBR | null;
  debito?: MoneyBR | null;
  credito?: MoneyBR | null;
};

export type ContabilParseResult = {
  rows: ContabilRow[];
  warnings: string[];
};

/**
 * Aceita:
 *  - 1.234,56
 *  - -1.234,56
 *  - (1.234,56)
 *  - 1.234,56-
 */
const moneyTokenRe = /\(?-?\d{1,3}(?:\.\d{3})*,\d{2}\)?-?/g;

function cleanSpaces(s: string) {
  return String(s ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoneyBR(token: string): MoneyBR | null {
  const raw = cleanSpaces(token);
  if (!raw) return null;

  let sign = 1;

  // (1.234,56)
  if (raw.startsWith("(") && raw.endsWith(")")) sign = -1;

  // 1.234,56-
  if (raw.endsWith("-")) sign = -1;

  // -1.234,56
  if (raw.startsWith("-")) sign = -1;

  // remove parênteses e sinais (mantém só dígitos . ,)
  const normalized = raw
    .replace(/[()]/g, "")
    .replace(/-/g, "")
    .trim();

  const value = Number(normalized.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return null;

  return { raw, value: value * sign };
}

// detecta se a linha é “título de seção” (ATIVO, PASSIVO, DRE etc)
function detectSectionHeader(line: string): ContabilRow["group"] | null {
  const up = cleanSpaces(line).toUpperCase();

  // casos comuns em balancetes
  if (up === "ATIVO" || up.startsWith("ATIVO ")) return "ATIVO";
  if (up === "PASSIVO" || up.startsWith("PASSIVO ")) return "PASSIVO";

  // DRE / RESULTADO
  if (
    up === "DRE" ||
    up.includes("DEMONSTRA") ||
    up.includes("RESULTADO") ||
    up.includes("D.R.E")
  )
    return "DRE";

  return null;
}

/**
 * Ex:
 *  "263 3.1 Receita ..." -> code=263, rest="3.1 Receita ..."
 *  "11 Caixa ..." -> code=11
 */
function extractLeadingCode(s: string): { code: string | null; rest: string } {
  const m = s.match(/^\s*(\d{1,6})\s+(.*)$/);
  if (!m) return { code: null, rest: s.trim() };
  return { code: m[1], rest: m[2].trim() };
}

/**
 * Tenta capturar uma "classificação" contábil (tipo 1.1 / 2.1.01 / 3.1.1.01 etc)
 * em qualquer lugar do início do texto (após o code).
 */
function extractFirstClassification(s: string): { classification: string | null; rest: string } {
  const txt = cleanSpaces(s);

  // procura no início (primeiro token)
  const mStart = txt.match(/^(\d{1,3}(?:\.\d{1,3})+)\s+(.*)$/);
  if (mStart) return { classification: mStart[1], rest: mStart[2].trim() };

  // procura "solta"
  const mAny = txt.match(/\b(\d{1,3}(?:\.\d{1,3})+)\b/);
  if (!mAny) return { classification: null, rest: txt };

  const cls = mAny[1];
  const rest = cleanSpaces(txt.replace(cls, ""));
  return { classification: cls, rest };
}

// tenta inferir grupo pela classificação (fallback quando não teve cabeçalho)
function inferGroupByClassification(classification?: string | null): ContabilRow["group"] | null {
  if (!classification) return null;
  const first = String(classification).trim()[0];
  if (first === "1") return "ATIVO";
  if (first === "2") return "PASSIVO";
  if (first === "3") return "DRE";
  return null;
}

function isHeaderLine(line: string) {
  const up = cleanSpaces(line).toUpperCase();

  // ignora cabeçalhos comuns
  if (up.includes("CÓDIGO") && up.includes("DESCRI") && up.includes("SALDO")) return true;
  if (up.includes("CODIGO") && up.includes("DESCRI") && up.includes("SALDO")) return true;

  // outros
  if (up.startsWith("EMPRESA") || up.startsWith("BALANCETE") || up.includes("PÁGINA")) return true;

  return false;
}

function mapMoneyTokens(tokens: string[]) {
  const parsed = tokens.map(parseMoneyBR).filter(Boolean) as MoneyBR[];
  if (!parsed.length) {
    return { saldoAtual: null, saldoAnterior: null, debito: null, credito: null };
  }

  // pega as últimas 4 colunas (padrão do balancete)
  const tail = parsed.slice(-4);

  if (tail.length === 4) {
    const [m1, m2, m3, m4] = tail;
    return { saldoAtual: m1, saldoAnterior: m2, debito: m3, credito: m4 };
  }

  if (tail.length === 3) {
    const [m1, m2, m3] = tail;
    return { saldoAtual: m1, saldoAnterior: m2, debito: m3, credito: null };
  }

  if (tail.length === 2) {
    const [m1, m2] = tail;
    return { saldoAtual: m1, saldoAnterior: m2, debito: null, credito: null };
  }

  return { saldoAtual: tail[0] ?? null, saldoAnterior: null, debito: null, credito: null };
}

export function parseContabilRowsFromText(text: string): ContabilParseResult {
  const warnings: string[] = [];
  if (!text || !text.trim()) {
    return { rows: [], warnings: ["Texto vazio extraído do PDF."] };
  }

  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ContabilRow[] = [];

  let currentGroup: ContabilRow["group"] = "OUTROS";

  for (const raw of lines) {
    const line = cleanSpaces(raw);

    // 1) atualiza contexto se for cabeçalho de seção
    const section = detectSectionHeader(line);
    if (section) {
      currentGroup = section;
      continue;
    }

    if (isHeaderLine(line)) continue;

    // 2) tokens monetários
    const moneyMatches = line.match(moneyTokenRe) ?? [];
    if (moneyMatches.length < 2) continue;

    const { saldoAtual, saldoAnterior, debito, credito } = mapMoneyTokens(moneyMatches);

    /**
     * ✅ CORREÇÃO PRINCIPAL:
     * Sempre corta o "pre" antes do PRIMEIRO valor monetário da linha.
     * (evita pegar 3.518.993 como se fosse "classificação 3.5")
     */
    const firstMoneyToken = moneyMatches[0];
    const idxFirst = firstMoneyToken ? line.indexOf(firstMoneyToken) : -1;
    const pre = idxFirst >= 0 ? line.slice(0, idxFirst) : line;
    const preClean = cleanSpaces(pre);

    // 4) extrai code -> classification -> description
    const { code, rest } = extractLeadingCode(preClean);
    const { classification, rest: descRest } = extractFirstClassification(rest);

    const description = cleanSpaces(descRest);

    // 5) grupo final
    const inferred = inferGroupByClassification(classification);
    const group =
      currentGroup && currentGroup !== "OUTROS"
        ? currentGroup
        : inferred ?? currentGroup ?? "OUTROS";

    rows.push({
      rawLine: line,
      group,
      code,
      classification,
      description: description || null,
      saldoAtual,
      saldoAnterior,
      debito,
      credito,
    });
  }

  if (!rows.length) warnings.push("Nenhuma linha contábil com valores foi detectada no texto.");

  return { rows, warnings };
}
