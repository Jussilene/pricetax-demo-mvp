import { AnalyzeResponse } from "@/lib/types";
import { formatBRL, formatPercent } from "@/lib/format";

export function KpiCards({ data }: { data: AnalyzeResponse | null }) {
  if (!data) return null;

  const { receita_liquida, total_gastos_top10, concentracao_admin } = data.kpis;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-xl border border-line bg-panel p-4">
        <p className="text-sm text-muted">Receita Líquida</p>
        <p className="text-xl font-semibold">{formatBRL(receita_liquida)}</p>
      </div>

      <div className="rounded-xl border border-line bg-panel p-4">
        <p className="text-sm text-muted">Top 10 Gastos</p>
        <p className="text-xl font-semibold">
          {formatBRL(total_gastos_top10)}
        </p>
      </div>

      <div className="rounded-xl border border-line bg-panel p-4">
        <p className="text-sm text-muted">Concentração Admin</p>
        <p className="text-xl font-semibold">
          {formatPercent(concentracao_admin)}
        </p>
      </div>
    </div>
  );
}
    