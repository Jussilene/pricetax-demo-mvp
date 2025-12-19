import type { ParsedBalancete } from "@/lib/balanceteParser";
import { parseContabilRowsFromText } from "@/lib/contabilParser";
import { buildNormalizedBase, type NormalizedBaseRow } from "@/lib/normalizeBase";
import { computeTccKpisFromBase, type TccKpiResult } from "@/lib/kpiEngine";

type PeriodMode = "mensal" | "trimestral" | "anual";
type PeriodLabel = string; // "T1/2024" | "2024-01" | "2024" | "01/01/2024..31/03/2024" etc

type KPIBlock = {
  ativoTotal: number;
  passivoTotal: number;
  dreTotal?: number;
  linhasDetectadas: number;
};

type SeriesPoint = {
  period: PeriodLabel;
  value: number;
};

export type AnalyzeEngineResult = {
  summary: {
    totalFiles: number;
    yearsDetected: number[];
    warnings: string[];
    rowsDetected: number;
  };

  files: Array<{
    fileName: string;
    pages: number;
    detectedYear?: number | null;
    sample: string;
  }>;

  baseNormalizada: NormalizedBaseRow[];
  tccKpis: TccKpiResult;

  kpis: {
    byPeriod: Array<{ period: PeriodLabel; kpis: KPIBlock }>;
  };

  series: {
    ativoTotal: SeriesPoint[];
    passivoTotal: SeriesPoint[];
    dreTotal: SeriesPoint[];
  };

  rankings: {
    topSaldosAtivo: Array<{
      code?: string | null;
      description?: string | null;
      value: number;
      period: PeriodLabel;
    }>;
    topSaldosPassivo: Array<{
      code?: string | null;
      description?: string | null;
      value: number;
      period: PeriodLabel;
    }>;
    topVariacoes: Array<{
      key: string;
      code?: string | null;
      description?: string | null;
      from: PeriodLabel;
      to: PeriodLabel;
      delta: number;
      deltaPct: number | null;
    }>;
  };

  alerts: Array<{
    level: "info" | "warning";
    message: string;
  }>;

  periodos?: PeriodLabel[];
  kpisPorPeriodo?: Record<
    string,
    {
      receitaLiquida?: number;
      despAdmin?: number;
      lucroLiquido?: number;
    }
  >;
  distribuicaoGrupos?: Record<string, number>;
  topGastos?: Array<{ label: string; value: number }>;
};

function safeNumber(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function brRound(n: number, digits = 2) {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function guessYearFromText(text: string): number | null {
  const m = text.match(/\b(19|20)\d{2}\b/);
  if (!m) return null;
  const y = Number(m[0]);
  return Number.isFinite(y) ? y : null;
}

function guessPeriodFromText(text: string): string | null {
  const m = text.match(
    /PER[IÍ]ODO[:\s]*([0-3]\d\/[01]\d\/\d{4})\s*[-–]\s*([0-3]\d\/[01]\d\/\d{4})/i
  );
  if (!m) return null;
  return `${m[1]}..${m[2]}`;
}

function toMonthlyLabelFromRange(range: string): string | null {
  // range: "dd/mm/yyyy..dd/mm/yyyy"
  const m = range.match(/^(\d{2})\/(\d{2})\/(\d{4})\.\.(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;

  const mm1 = m[2];
  const yyyy1 = m[3];
  const mm2 = m[5];
  const yyyy2 = m[6];

  // só vira mensal se começar e terminar no mesmo mês/ano
  if (mm1 === mm2 && yyyy1 === yyyy2) return `${yyyy1}-${mm1}`;
  return null;
}

function monthFromName(fileName: string): string | null {
  const up = fileName.toUpperCase();

  const map: Record<string, string> = {
    JAN: "01",
    FEV: "02",
    MAR: "03",
    ABR: "04",
    MAI: "05",
    JUN: "06",
    JUL: "07",
    AGO: "08",
    SET: "09",
    OUT: "10",
    NOV: "11",
    DEZ: "12",
  };

  for (const k of Object.keys(map)) {
    if (up.includes(k)) return map[k];
  }

  // tenta padrões comuns: _01, -01, M01, MES01 (sem confundir com ano)
  const m = up.match(/(?:\bM(?:ES)?\s*|[_-])([01]\d)\b/);
  if (m) {
    const mm = m[1];
    if (mm >= "01" && mm <= "12") return mm;
  }

  return null;
}

function detectPeriodLabel(file: ParsedBalancete, mode: PeriodMode): PeriodLabel {
  const name = file.fileName.toUpperCase();
  const y = file.detectedYear ?? guessYearFromText(file.text ?? "") ?? null;

  // se anual → usa ano
  if (mode === "anual") {
    if (y) return String(y);
    return file.fileName;
  }

  // se mensal → tenta montar YYYY-MM
  if (mode === "mensal") {
    const range = guessPeriodFromText(file.text ?? "");
    if (range) {
      const monthly = toMonthlyLabelFromRange(range);
      if (monthly) return monthly;
    }

    const mm = monthFromName(name);
    if (mm && y) return `${y}-${mm}`;

    // fallback: se tiver ano, pelo menos não força T*
    if (y) return String(y);
    return file.fileName;
  }

  // trimestral (comportamento atual)
  const trim = name.match(/(\d)\s*TRIM/);
  if (trim && y) return `T${trim[1]}/${y}`;

  const t = name.match(/\bT([1-4])\b/);
  if (t && y) return `T${t[1]}/${y}`;

  const p = guessPeriodFromText(file.text ?? "");
  if (p) return p;

  if (y) return String(y);
  return file.fileName;
}

function sumByGroup(rows: ReturnType<typeof parseContabilRowsFromText>["rows"]) {
  let ativo = 0;
  let passivo = 0;
  let dre = 0;

  for (const r of rows) {
    const v = safeNumber(r.saldoAtual?.value ?? 0);
    if (r.group === "ATIVO") ativo += v;
    else if (r.group === "PASSIVO") passivo += v;
    else if (r.group === "DRE") dre += v;
  }

  return {
    ativoTotal: brRound(ativo),
    passivoTotal: brRound(passivo),
    dreTotal: brRound(dre),
  };
}

function mkKey(code?: string | null, desc?: string | null) {
  const c = (code ?? "").trim();
  const d = (desc ?? "").trim().toUpperCase();
  if (c) return `C:${c}|D:${d}`;
  return `D:${d}`;
}

function topN<T>(arr: T[], n: number, score: (x: T) => number) {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n);
}

function isLikelyExpense(descRaw: any) {
  const d = String(descRaw ?? "").toUpperCase();
  if (!d.trim()) return false;

  if (d.includes("RECEITA")) return false;
  if (d.includes("FATUR")) return false;

  if (d.includes("DESP")) return true;
  if (d.includes("CUST")) return true;
  if (d.includes("CMV")) return true;
  if (d.includes("CPV")) return true;
  if (d.includes("SERV")) return true;
  if (d.includes("SAL")) return true;
  if (d.includes("HONOR")) return true;
  if (d.includes("ALUG")) return true;
  if (d.includes("ENCARG")) return true;
  if (d.includes("IMPOST")) return true;
  if (d.includes("TAXA")) return true;

  return true;
}

function labelFromRow(r: NormalizedBaseRow) {
  const cls = r.classification ? String(r.classification).trim() : "";
  const desc = r.description ? String(r.description).trim() : "";
  if (cls && desc) return `${cls} — ${desc}`;
  if (desc) return desc;
  if (cls) return cls;
  return "Conta";
}

export function computeFromBalancetes(
  parsed: ParsedBalancete[],
  periodMode: PeriodMode = "trimestral"
): AnalyzeEngineResult {
  const warnings: string[] = [];
  const alerts: Array<{ level: "info" | "warning"; message: string }> = [];

  const filesOut = parsed.map((p) => ({
    fileName: p.fileName,
    pages: p.pages,
    detectedYear: p.detectedYear ?? null,
    sample: (p.text ?? "").slice(0, 1200) || "(sem texto extraído)",
  }));

  const perFile = parsed.map((p) => {
    const period = detectPeriodLabel(p, periodMode);

    const parsedRows = parseContabilRowsFromText(p.text ?? "");
    if (parsedRows.warnings?.length) {
      for (const w of parsedRows.warnings) warnings.push(`[${p.fileName}] ${w}`);
    }

    const sums = sumByGroup(parsedRows.rows);

    return {
      fileName: p.fileName,
      period,
      year: p.detectedYear ?? guessYearFromText(p.text ?? "") ?? null,
      rows: parsedRows.rows,
      warnings: parsedRows.warnings ?? [],
      sums,
    };
  });

  const baseNormalizada: NormalizedBaseRow[] = perFile.flatMap((f) =>
    buildNormalizedBase(
      { rows: f.rows, warnings: f.warnings },
      { period: f.period, year: f.year }
    )
  );

  const tccKpis = computeTccKpisFromBase(baseNormalizada);

  if (perFile.length < 2) {
    alerts.push({ level: "warning", message: "Envie pelo menos 2 períodos para comparação." });
  }

  const kpisByPeriod = perFile.map((f) => ({
    period: f.period,
    kpis: {
      ativoTotal: f.sums.ativoTotal,
      passivoTotal: f.sums.passivoTotal,
      dreTotal: f.sums.dreTotal,
      linhasDetectadas: f.rows.length,
    },
  }));

  const series = {
    ativoTotal: perFile.map((f) => ({ period: f.period, value: f.sums.ativoTotal })),
    passivoTotal: perFile.map((f) => ({ period: f.period, value: f.sums.passivoTotal })),
    dreTotal: perFile.map((f) => ({ period: f.period, value: f.sums.dreTotal })),
  };

  const topAtivo: Array<{ code?: string | null; description?: string | null; value: number; period: PeriodLabel }> = [];
  const topPassivo: Array<{ code?: string | null; description?: string | null; value: number; period: PeriodLabel }> = [];

  for (const f of perFile) {
    for (const r of f.rows) {
      const v = safeNumber(r.saldoAtual?.value ?? 0);
      if (!v) continue;

      if (r.group === "ATIVO") {
        topAtivo.push({
          code: r.code ?? null,
          description: r.description ?? null,
          value: brRound(v),
          period: f.period,
        });
      } else if (r.group === "PASSIVO") {
        topPassivo.push({
          code: r.code ?? null,
          description: r.description ?? null,
          value: brRound(v),
          period: f.period,
        });
      }
    }
  }

  const topSaldosAtivo = topN(topAtivo, 10, (x) => x.value);
  const topSaldosPassivo = topN(topPassivo, 10, (x) => x.value);

  const map = new Map<
    string,
    { code?: string | null; description?: string | null; values: Record<string, number> }
  >();

  for (const f of perFile) {
    for (const r of f.rows) {
      const v = safeNumber(r.saldoAtual?.value ?? 0);
      if (!Number.isFinite(v)) continue;

      const key = mkKey(r.code, r.description);
      const prev = map.get(key) ?? {
        code: r.code ?? null,
        description: r.description ?? null,
        values: {},
      };
      prev.values[f.period] = brRound(v);
      map.set(key, prev);
    }
  }

  const firstPeriod = perFile[0]?.period;
  const lastPeriod = perFile[perFile.length - 1]?.period;

  const variacoes: AnalyzeEngineResult["rankings"]["topVariacoes"] = [];

  if (firstPeriod && lastPeriod && firstPeriod !== lastPeriod) {
    for (const [key, obj] of map.entries()) {
      const a = safeNumber(obj.values[firstPeriod]);
      const b = safeNumber(obj.values[lastPeriod]);

      if (!a && !b) continue;

      const delta = brRound(b - a);
      const deltaPct = a !== 0 ? brRound(((b - a) / Math.abs(a)) * 100) : null;

      if (Math.abs(delta) < 0.01) continue;

      variacoes.push({
        key,
        code: obj.code ?? null,
        description: obj.description ?? null,
        from: firstPeriod,
        to: lastPeriod,
        delta,
        deltaPct,
      });
    }
  }

  const topVariacoes = topN(variacoes, 15, (x) => Math.abs(x.delta));

  if (topVariacoes.length) {
    const maior = topVariacoes[0];
    if (maior.deltaPct !== null && Math.abs(maior.deltaPct) >= 50) {
      alerts.push({
        level: "warning",
        message: `Variação alta detectada: ${maior.description ?? maior.code ?? "Conta"} mudou ${maior.deltaPct}% (${maior.from} → ${maior.to}).`,
      });
    } else {
      alerts.push({
        level: "info",
        message: `Maior variação no período: ${maior.description ?? maior.code ?? "Conta"} (${maior.from} → ${maior.to}).`,
      });
    }
  }

  if (tccKpis.notes?.length) {
    for (const n of tccKpis.notes) {
      alerts.push({ level: "info", message: n });
    }
  }

  const yearsDetected = Array.from(
    new Set(
      perFile
        .map((f) => f.year)
        .filter((x): x is number => typeof x === "number" && Number.isFinite(x))
    )
  ).sort();

  const rowsDetected = perFile.reduce((acc, f) => acc + (f.rows?.length ?? 0), 0);

  const periodos: PeriodLabel[] = perFile.map((f) => f.period);

  const kpisPorPeriodo: AnalyzeEngineResult["kpisPorPeriodo"] = {};
  const tccPeriods = Array.isArray(tccKpis?.byPeriod) ? tccKpis.byPeriod : [];

  for (const p of tccPeriods) {
    const period = String((p as any)?.period ?? "");
    if (!period) continue;

    kpisPorPeriodo[period] = {
      receitaLiquida: safeNumber((p as any)?.receita_liquida),
      despAdmin: safeNumber((p as any)?.despesas_admin),
      lucroLiquido: safeNumber((p as any)?.lucro_liquido),
    };
  }

  const lastSums = perFile[perFile.length - 1]?.sums;
  const distribuicaoGrupos: AnalyzeEngineResult["distribuicaoGrupos"] = {
    ATIVO: safeNumber(lastSums?.ativoTotal),
    PASSIVO: safeNumber(lastSums?.passivoTotal),
    DRE: safeNumber(lastSums?.dreTotal),
  };

  function toNumBR(v: any) {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;

    const raw = String(v ?? "").trim();
    if (!raw) return 0;

    let s = raw;
    let neg = false;
    if (s.startsWith("(") && s.endsWith(")")) {
      neg = true;
      s = s.slice(1, -1);
    }

    s = s.replace(/\s+/g, "");
    s = s.replace(/[^\d.,-]/g, "");

    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",") && !s.includes(".")) {
      s = s.replace(",", ".");
    }

    const n = Number(s);
    const out = Number.isFinite(n) ? n : 0;
    return neg ? -out : out;
  }

  const topGastos: Array<{ label: string; value: number }> = [];

  if (lastPeriod) {
    const mapGastos = new Map<string, { label: string; value: number }>();

    for (const r of baseNormalizada) {
      if (String(r?.period ?? "") !== String(lastPeriod ?? "")) continue;

      const vRaw = r.debito ?? r.saldoAtual ?? r.credito ?? r.saldoAnterior ?? 0;

      const v = Math.abs(toNumBR(vRaw));
      if (v < 0.01) continue;

      if (!isLikelyExpense(r.description)) continue;

      const label = labelFromRow(r);
      const key = `${String(r.classification ?? "")}|${String(r.description ?? "")}`.toUpperCase();

      const prev = mapGastos.get(key) ?? { label, value: 0 };
      prev.value = brRound(prev.value + v);
      mapGastos.set(key, prev);
    }

    const list = Array.from(mapGastos.values());
    const ordered = topN(list, 10, (x) => x.value);
    for (const item of ordered) topGastos.push(item);
  }

  return {
    summary: {
      totalFiles: parsed.length,
      yearsDetected,
      warnings,
      rowsDetected,
    },
    files: filesOut,

    baseNormalizada,
    tccKpis,

    kpis: { byPeriod: kpisByPeriod },
    series,
    rankings: {
      topSaldosAtivo,
      topSaldosPassivo,
      topVariacoes,
    },
    alerts,

    periodos,
    kpisPorPeriodo,
    distribuicaoGrupos,
    topGastos,
  };
}
