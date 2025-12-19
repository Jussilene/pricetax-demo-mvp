"use client";

import { useRef, useState } from "react";
import type { AnalyzeResponse, PeriodMode } from "@/lib/types";

export default function UploadCard({
  onResult,
}: {
  onResult: (r: AnalyzeResponse) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("trimestral");
  const [loading, setLoading] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setFiles(list);
  };

  async function submit() {
    try {
      setLoading(true);

      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("periodMode", periodMode);

      const res = await fetch("/api/analyze", { method: "POST", body: form });

      // parse seguro (evita erro quando backend retorna HTML/erro)
      const text = await res.text();
      let data: AnalyzeResponse;

      try {
        data = JSON.parse(text) as AnalyzeResponse;
      } catch {
        data = {
          ok: false,
          error: "Resposta inválida do servidor.",
          details: text?.slice(0, 500),
        } as any;
      }

      onResult(data);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Falha no upload/processamento";
      onResult({ ok: false, error: message } as any);
    } finally {
      setLoading(false);
    }
  }

  const fileLabel =
    files.length === 0
      ? "Nenhum arquivo selecionado"
      : files.length === 1
      ? files[0].name
      : `${files.length} arquivos selecionados`;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Enviar Balancetes</h1>
          <p className="pt-muted mt-1 text-sm">
            Envie 2 a 4 PDFs e inclua o ano no nome (ex:
            Balancete_2024_T1.pdf).
          </p>
        </div>

        <select
          value={periodMode}
          onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
          className="pt-input rounded-xl px-3 py-2 text-sm"
        >
          <option value="mensal">Mensal</option>
          <option value="trimestral">Trimestral</option>
          <option value="anual">Anual</option>
        </select>
      </div>

      <div className="pt-surface mt-5 rounded-2xl p-5">
        <div className="text-sm font-semibold">Selecione os PDFs do balancete</div>
        <div className="pt-muted mt-1 text-xs">
          Dica: use nomes com ano (ex: 2024) para validação automática.
        </div>

        {/* ✅ campo + botão "Incluir arquivo" */}
        <div className="mt-4 flex items-center gap-3">
          <div className="pt-input flex-1 rounded-xl px-4 py-3 text-sm truncate">
            {fileLabel}
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="pt-btn-primary rounded-full px-5 py-3 text-sm font-semibold"
          >
            Incluir arquivo
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf"
            onChange={onPick}
            className="hidden"
          />
        </div>

        <div className="pt-muted mt-2 text-xs">Selecionados: {files.length}</div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={loading || files.length === 0}
        className="pt-btn-primary mt-5 w-full rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Processando..." : "Validar e Armazenar"}
      </button>
    </div>
  );
}
