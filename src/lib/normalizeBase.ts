// src/lib/normalizeBase.ts
import type { ContabilParseResult, ContabilRow } from "./contabilParser";

export type NormalizedBaseRow = {
  period?: string | null; // ex: "2024-12" ou "Dez/2024" (depende do que vocês usam)
  year?: number | null;

  group?: ContabilRow["group"];
  code?: string | null;
  classification?: string | null;
  description?: string | null;

  saldoAtual?: number | null;
  saldoAnterior?: number | null;
  debito?: number | null;
  credito?: number | null;
};

function cleanStr(s: unknown): string | null {
  const v = typeof s === "string" ? s.trim() : "";
  return v ? v : null;
}

/**
 * Normaliza as rows do parser para uma "base limpa" (array único).
 * Você pode passar period/year vindo do request do Analyze (ou inferir do PDF depois).
 */
export function buildNormalizedBase(
  parsed: ContabilParseResult,
  meta?: { period?: string | null; year?: number | null }
): NormalizedBaseRow[] {
  const period = meta?.period ?? null;
  const year = meta?.year ?? null;

  return (parsed?.rows ?? [])
    .map((r): NormalizedBaseRow | null => {
      const code = r.code ?? null;
      const classification = r.classification ?? null;
      const description = r.description ?? null;

      // remove linhas “vazias” (sem identificação e sem valores)
      const hasId = !!(cleanStr(code) || cleanStr(classification) || cleanStr(description));
      const hasAnyValue =
        (r.saldoAtual?.value ?? null) !== null ||
        (r.saldoAnterior?.value ?? null) !== null ||
        (r.debito?.value ?? null) !== null ||
        (r.credito?.value ?? null) !== null;

      if (!hasId && !hasAnyValue) return null;

      return {
        period,
        year,
        group: r.group,

        code: cleanStr(code),
        classification: cleanStr(classification),
        description: cleanStr(description),

        saldoAtual: r.saldoAtual?.value ?? null,
        saldoAnterior: r.saldoAnterior?.value ?? null,
        debito: r.debito?.value ?? null,
        credito: r.credito?.value ?? null,
      };
    })
    .filter(Boolean) as NormalizedBaseRow[];
}
