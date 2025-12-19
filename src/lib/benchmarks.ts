// src/lib/benchmarks.ts
import fs from "fs";
import path from "path";

type BenchmarkRule = {
  bom: number;
  ok: number;
  alerta: number;
  descricao?: string;
};

type Benchmarks = Record<string, BenchmarkRule>;

let cachedBenchmarks: Benchmarks | null = null;

function loadBenchmarks(): Benchmarks {
  if (cachedBenchmarks) return cachedBenchmarks;

  const filePath = path.join(process.cwd(), "data", "benchmarks.json");

  if (!fs.existsSync(filePath)) {
    cachedBenchmarks = {};
    return cachedBenchmarks;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  cachedBenchmarks = JSON.parse(raw) as Benchmarks;
  return cachedBenchmarks;
}

export function compareToBenchmarks(metrics: Record<string, number | null>) {
  const benchmarks = loadBenchmarks();

  const results: Array<{
    key: string;
    value: number;
    status: "bom" | "ok" | "alerta";
    descricao?: string;
  }> = [];

  for (const key of Object.keys(metrics)) {
    const value = Number(metrics[key]);
    const rule = benchmarks[key];

    if (!rule || !Number.isFinite(value)) continue;

    let status: "bom" | "ok" | "alerta" = "alerta";

    if (value >= rule.bom) status = "bom";
    else if (value >= rule.ok) status = "ok";

    results.push({
      key,
      value,
      status,
      descricao: rule.descricao,
    });
  }

  return results;
}

function fmtPct(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(2)}%`;
}

function labelForKey(key: string) {
  const map: Record<string, string> = {
    margem_liquida_pct: "Margem líquida",
    margem_bruta_pct: "Margem bruta",
    desp_admin_receita_pct: "Desp. admin / receita",
  };
  return map[key] || key;
}

// ✅ texto curto para o chat (referência), sem "inventar mercado real"
export function getBenchmarksText(pack: any, opts?: { maxLines?: number }): string {
  const maxLines = opts?.maxLines ?? 8;

  const latest = pack?.latest ?? {};

  // Tenta achar nomes comuns
  const mLiq = latest?.margem_liquida_pct ?? latest?.margemLiquidaPct ?? null;
  const mBru = latest?.margem_bruta_pct ?? latest?.margemBrutaPct ?? null;

  // desp admin / receita: tenta direto, senão calcula se tiver receita/desp
  const receita = Number(latest?.receita_liquida ?? latest?.receitaLiquida ?? NaN);
  const despAdmin = Number(latest?.despesas_admin ?? latest?.despesasAdmin ?? NaN);

  const despAdminPct =
    Number.isFinite(receita) && receita !== 0 && Number.isFinite(despAdmin)
      ? (despAdmin / receita) * 100
      : (latest?.desp_admin_receita_pct ?? latest?.despAdminReceitaPct ?? null);

  // Chaves esperadas no benchmarks.json
  const metrics: Record<string, number | null> = {
    margem_liquida_pct: Number.isFinite(Number(mLiq)) ? Number(mLiq) : null,
    margem_bruta_pct: Number.isFinite(Number(mBru)) ? Number(mBru) : null,
    desp_admin_receita_pct: Number.isFinite(Number(despAdminPct)) ? Number(despAdminPct) : null,
  };

  const rows = compareToBenchmarks(metrics);
  if (!rows.length) return "";

  const statusEmoji: Record<"bom" | "ok" | "alerta", string> = {
    bom: "🟢",
    ok: "🟡",
    alerta: "🔴",
  };

  const lines = rows.slice(0, maxLines).map((r) => {
    const label = labelForKey(r.key);
    const desc = r.descricao ? ` — ${r.descricao}` : "";
    return `${statusEmoji[r.status]} ${label}: ${fmtPct(r.value)}${desc}`;
  });

  return lines.join("\n");
}
