import type { AnalyzeResponse } from "@/lib/types";

export function InsightsPanel({ data }: { data: AnalyzeResponse | null }) {
  if (!data) return null;
  if (!data.ok) return null;
  if (data.stage !== "analysis") return null;

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/10 p-6">
      <h3 className="font-semibold">Resumo Executivo</h3>
      <p className="mt-3 text-sm">{data.resumo_executivo}</p>

      <h4 className="mt-6 text-sm font-semibold">Checklist de Ações</h4>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        {data.checklist.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
