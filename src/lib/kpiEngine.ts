// src/lib/kpiEngine.ts
import type { NormalizedBaseRow } from "@/lib/normalizeBase";

export type TccKpiPeriod = {
  period: string;
  year?: number | null;

  receita_liquida: number;
  receita_bruta: number;
  deducoes: number;

  cmv_cpv: number;
  despesas_admin: number;
  despesas_comerciais: number;
  outras_despesas: number;

  lucro_bruto: number | null;
  resultado_operacional: number | null;
  lucro_liquido: number | null;

  margem_bruta_pct: number | null;
  margem_liquida_pct: number | null;

  buckets: Array<{ key: string; total: number; lines: number }>;
};

export type TccKpiResult = {
  byPeriod: TccKpiPeriod[];
  notes: string[];
};

function brRound(n: number, digits = 2) {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(input: unknown): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * NORMALIZA classificações compactadas:
 * 351.1 → 3.5.1.1
 * 371.1 → 3.7.1.1
 * 3511  → 3.5.1.1
 * 3711  → 3.7.1.1
 */
function normalizeClassification(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  if (/^[1-3]\.\d/.test(raw)) return raw;

  const m = raw.match(/^([1-3])(\d)(\d)\.(\d+)$/);
  if (m) return `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;

  const m2 = raw.match(/^([1-3])(\d)(\d)(\d)$/);
  if (m2) return `${m2[1]}.${m2[2]}.${m2[3]}.${m2[4]}`;

  return raw;
}

// matchers
const RX = {
  receitaLiquida: [
    "RECEITA LIQUIDA",
    "RECEITA LIQ",
    "RECEITAS LIQUIDAS",
    "RECEITA OPERACIONAL LIQUIDA",
    "ROL",
  ],
  receitaBruta: [
    "RECEITA BRUTA",
    "RECEITA OPERACIONAL BRUTA",
    "VENDAS BRUTAS",
    "FATURAMENTO BRUTO",
  ],
  deducoes: [
    "DEDUCOES",
    "DEDUCAO",
    "DEVOLUCOES",
    "ABATIMENTOS",
    "CANCELAMENTOS",
    "ICMS",
    "ISS",
    "PIS",
    "COFINS",
  ],
  cmvCpv: [
    "CMV",
    "CPV",
    "CUSTO",
    "CUSTOS",
    "CUSTO DAS MERCADORIAS",
    "CUSTO DOS PRODUTOS",
    "CUSTO DOS SERVICOS",
    "CUSTO DOS SERVICOS PRESTADOS",
    "CSP",
  ],
  despesasAdmin: [
    "DESPESAS ADMIN",
    "DESPESAS ADMINISTRATIVAS",
    "DESPESA ADMIN",
    "ADMINISTRATIVAS",
  ],
  despesasComerciais: [
    "DESPESAS COMERC",
    "DESPESAS COMERCIAIS",
    "DESPESAS DE VENDAS",
    "MARKETING",
    "PROPAGANDA",
    "PUBLICIDADE",
  ],
  outrasDespesas: [
    "OUTRAS DESPESAS",
    "DESPESAS GERAIS",
    "DESPESAS OPERACIONAIS",
    "DESPESAS FINANCEIRAS",
    "CUSTOS FINANCEIROS",
    "DESPESAS",
  ],
  lucroBruto: ["LUCRO BRUTO", "RESULTADO BRUTO"],
  resultadoOperacional: ["RESULTADO OPERACIONAL", "LUCRO OPERACIONAL", "EBIT"],
  lucroLiquido: [
    "LUCRO LIQUIDO",
    "RESULTADO LIQUIDO",
    "RESULTADO DO EXERCICIO",
    "LUCRO/PREJUIZO DO EXERCICIO",
    "LUCRO OU PREJUIZO",
  ],
};

function matchAny(desc: string, patterns: string[]) {
  return patterns.some((p) => desc.includes(p));
}

/**
 * Valor efetivo DRE
 */
function effectiveValue(r: NormalizedBaseRow): number {
  const sa = safeNum(r.saldoAtual);
  if (Math.abs(sa) > 1e-9) return sa;

  const sb = safeNum(r.saldoAnterior);
  if (Math.abs(sb) > 1e-9) return sb;

  const d = safeNum(r.debito);
  const c = safeNum(r.credito);
  if (Math.abs(d) > 1e-9 || Math.abs(c) > 1e-9) return d - c;

  return 0;
}

// bucket
function bucketKey(classification: unknown): string | null {
  const c = normalizeClassification(classification);
  if (!c) return null;
  const m = c.match(/^(\d{1,3}\.\d{1,3})/);
  return m ? m[1] : null;
}

/**
 * ✅ AJUSTE CRÍTICO AQUI
 * Tudo que começa com 3.x é DRE, inclusive OUTROS (371.1)
 */
function isDreRelevantRow(r: NormalizedBaseRow) {
  const grp = r.group;
  const cls = normalizeClassification(r.classification);

  if (grp === "DRE") return true;
  if (cls.startsWith("3")) return true;

  if (grp === "ATIVO" || grp === "PASSIVO") return false;

  const desc = normalizeText(r.description ?? "");
  if (!desc) return false;

  return (
    matchAny(desc, RX.receitaLiquida) ||
    matchAny(desc, RX.receitaBruta) ||
    matchAny(desc, RX.deducoes) ||
    matchAny(desc, RX.cmvCpv) ||
    matchAny(desc, RX.despesasAdmin) ||
    matchAny(desc, RX.despesasComerciais) ||
    matchAny(desc, RX.outrasDespesas) ||
    matchAny(desc, RX.lucroBruto) ||
    matchAny(desc, RX.resultadoOperacional) ||
    matchAny(desc, RX.lucroLiquido)
  );
}

function computeBuckets(rows: NormalizedBaseRow[]) {
  const map = new Map<string, { total: number; lines: number }>();

  for (const r of rows) {
    const k = bucketKey(r.classification);
    if (!k) continue;

    const prev = map.get(k) ?? { total: 0, lines: 0 };
    prev.total += effectiveValue(r);
    prev.lines += 1;
    map.set(k, prev);
  }

  return Array.from(map.entries())
    .map(([key, v]) => ({ key, total: brRound(v.total), lines: v.lines }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

function sumByMatchAbs(rows: NormalizedBaseRow[], patterns: string[]): number {
  let s = 0;
  for (const r of rows) {
    const desc = normalizeText(r.description ?? "");
    if (desc && matchAny(desc, patterns)) s += Math.abs(effectiveValue(r));
  }
  return brRound(s);
}

function sumByBucketAbs(rows: NormalizedBaseRow[], keys: string[]): number {
  let s = 0;
  for (const r of rows) {
    const k = bucketKey(r.classification);
    if (k && keys.includes(k)) s += Math.abs(effectiveValue(r));
  }
  return brRound(s);
}

/**
 * ✅ NOVO: fallback por classificação/prefixo (resolve o "despesas_admin zerado")
 * - Funciona mesmo se o bucket virar "3.7" (por normalização) ou se vier "371.1" compactado.
 */
function sumByClassificationPrefixAbs(rows: NormalizedBaseRow[], prefixes: string[]): number {
  let s = 0;

  for (const r of rows) {
    const raw = String(r.classification ?? "").trim();
    const cls = normalizeClassification(r.classification);

    const hit = prefixes.some((p) => {
      const pp = String(p).trim();
      if (!pp) return false;
      return raw.startsWith(pp) || cls.startsWith(pp);
    });

    if (hit) s += Math.abs(effectiveValue(r));
  }

  return brRound(s);
}

function pct(num: number, den: number): number | null {
  if (!den) return null;
  return brRound((num / den) * 100);
}

export function computeTccKpisFromBase(base: NormalizedBaseRow[]): TccKpiResult {
  const notes: string[] = [];
  const byPeriodMap = new Map<string, NormalizedBaseRow[]>();

  for (const r of base ?? []) {
    if (!r.period || !isDreRelevantRow(r)) continue;
    const arr = byPeriodMap.get(r.period) ?? [];
    arr.push(r);
    byPeriodMap.set(r.period, arr);
  }

  const byPeriod = Array.from(byPeriodMap.entries()).map(([period, rows]) => {
    const year = rows.find((x) => typeof x.year === "number")?.year ?? null;
    const buckets = computeBuckets(rows);

    let receita_liquida = sumByMatchAbs(rows, RX.receitaLiquida);
    let receita_bruta = sumByMatchAbs(rows, RX.receitaBruta);
    let deducoes = sumByMatchAbs(rows, RX.deducoes);

    if (!receita_bruta) receita_bruta = sumByBucketAbs(rows, ["3.1"]);
    if (!deducoes) deducoes = sumByBucketAbs(rows, ["3.2"]);
    if (!receita_liquida && receita_bruta) receita_liquida = brRound(receita_bruta - deducoes);

    let cmv_cpv = sumByMatchAbs(rows, RX.cmvCpv);
    if (!cmv_cpv) cmv_cpv = sumByBucketAbs(rows, ["3.3", "3.4", "3.5"]);

    // ✅ AQUI: só melhora o "pegar despesas admin"
    let despesas_admin = sumByMatchAbs(rows, RX.despesasAdmin);

    // 1) tenta buckets comuns (quando bucketKey vira "3.7"/"3.8")
    if (!despesas_admin) despesas_admin = sumByBucketAbs(rows, ["3.7", "3.8"]);

    // 2) fallback robusto por prefixo (cobre 371.1 compactado e 3.7.1.1 normalizado)
    if (!despesas_admin) {
      despesas_admin = sumByClassificationPrefixAbs(rows, [
        "3.7",     // normalizado (3.7.x.x)
        "3.8",     // normalizado (3.8.x.x)
        "371.1",   // compactado (se vier assim no base)
        "381.1",   // compactado (se vier assim no base)
        "3.7.1",   // se quiser travar mais no bloco 3.7.1.*
        "3.8.1",   // idem
      ]);
    }

    const despesas_comerciais = sumByMatchAbs(rows, RX.despesasComerciais);
    const outras_despesas = sumByMatchAbs(rows, RX.outrasDespesas);

    const lucro_bruto = receita_liquida ? brRound(receita_liquida - cmv_cpv) : null;
    const resultado_operacional =
      lucro_bruto !== null ? brRound(lucro_bruto - despesas_admin - despesas_comerciais - outras_despesas) : null;

    return {
      period,
      year,
      receita_liquida,
      receita_bruta,
      deducoes,
      cmv_cpv,
      despesas_admin,
      despesas_comerciais,
      outras_despesas,
      lucro_bruto,
      resultado_operacional,
      lucro_liquido: resultado_operacional,
      margem_bruta_pct: lucro_bruto !== null ? pct(lucro_bruto, receita_liquida) : null,
      margem_liquida_pct: resultado_operacional !== null ? pct(resultado_operacional, receita_liquida) : null,
      buckets,
    };
  });

  return { byPeriod, notes };
}
