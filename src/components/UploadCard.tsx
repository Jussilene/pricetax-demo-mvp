"use client";

import { useState } from "react";
import { PeriodMode } from "@/lib/types";

export function UploadCard({
  onAnalyze,
}: {
  onAnalyze: (file: File, mode: PeriodMode) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<PeriodMode>("ANUAL");

  return (
    <div className="rounded-xl border border-line bg-panel p-6">
      <h3 className="font-semibold">Upload do balancete</h3>

      {/* Select com destaque + opções legíveis */}
      <div className="mt-4">
        <label className="mb-2 block text-xs text-muted">
          Período de análise
        </label>

        <select
          className="w-full rounded-md border border-gold/40 bg-bg px-3 py-3 text-text shadow-glow outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
          value={mode}
          onChange={(e) => setMode(e.target.value as PeriodMode)}
        >
          <option className="bg-white text-black" value="ANUAL">
            Anual
          </option>
          <option className="bg-white text-black" value="TRIMESTRAL">
            Trimestral
          </option>
          <option className="bg-white text-black" value="MENSAL">
            Mensal
          </option>
        </select>
      </div>

      <input
        type="file"
        accept=".pdf"
        className="mt-4 w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-gold/40 file:bg-bg file:px-4 file:py-2 file:text-sm file:font-semibold file:text-text hover:file:bg-gold/10"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        className="mt-4 w-full rounded-md border border-gold/40 py-2 font-semibold hover:bg-gold/10 disabled:opacity-50"
        disabled={!file}
        onClick={() => file && onAnalyze(file, mode)}
      >
        Analisar
      </button>
    </div>
  );
}
