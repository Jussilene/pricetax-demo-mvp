"use client";

import { useState } from "react";
import { UploadCard } from "@/components/UploadCard";
import { KpiCards } from "@/components/KpiCards";
import { Top10Table } from "@/components/Top10Table";
import { InsightsPanel } from "@/components/InsightsPanel";
import { AnalyzeResponse, PeriodMode } from "@/lib/types";

export default function Dashboard() {
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze(file: File, mode: PeriodMode) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("modo_periodo", mode);
      formData.append("preset", "A"); // padrão quando vier PDF

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  async function loadPreset(preset: "A" | "B" | "C") {
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="rounded-xl border border-line bg-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Dashboard (Demo)</h2>
            <p className="mt-1 text-sm text-muted">
              Use os balancetes fictícios para testar rapidamente (sem PDF).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadPreset("A")}
              className="rounded-full border border-gold/40 px-4 py-2 text-sm font-semibold hover:bg-gold/10"
            >
              Balancete A
            </button>
            <button
              onClick={() => loadPreset("B")}
              className="rounded-full border border-gold/40 px-4 py-2 text-sm font-semibold hover:bg-gold/10"
            >
              Balancete B
            </button>
            <button
              onClick={() => loadPreset("C")}
              className="rounded-full border border-gold/40 px-4 py-2 text-sm font-semibold hover:bg-gold/10"
            >
              Balancete C
            </button>
          </div>
        </div>
      </div>

      <UploadCard onAnalyze={analyze} />

      {loading && (
        <div className="rounded-xl border border-line bg-panel p-4 text-sm text-muted">
          Gerando análise...
        </div>
      )}

      <KpiCards data={data} />

      {data && (
        <>
          <Top10Table title="Top 10 Gastos" rows={data.top10_gastos} />
          <Top10Table
            title="Top 10 Despesas Administrativas"
            rows={data.top10_admin}
          />
          <InsightsPanel data={data} />
        </>
      )}
    </main>
  );
}
