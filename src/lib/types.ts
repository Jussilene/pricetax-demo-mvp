import type { NormalizedBaseRow } from "./normalizeBase";

export type PeriodMode = "mensal" | "trimestral" | "anual";

export type UploadMeta = {
  jobId: string;
  periodMode: PeriodMode;
  detectedYears: number[];
  files: { name: string; size: number; year?: number }[];
  createdAtISO: string;
};

export type Kpis = {
  receita_liquida: number;
  total_gastos_top10: number;
  concentracao_admin: number;
};

export type RowItem = {
  conta: string;
  debito: number;
  percent_receita: number;
};

export type AnalyzeResponse =
  | {
      ok: true;
      stage: "upload";
      meta: UploadMeta;
      message: string;
    }
  | {
      ok: true;
      stage: "analysis";
      meta: UploadMeta;

      // ✅ NOVO (não quebra nada porque é opcional)
      baseNormalizada?: NormalizedBaseRow[];

      kpis: Kpis;
      top10_gastos: RowItem[];
      top10_admin: RowItem[];
      resumo_executivo: string;
      checklist: string[];
      message: string;
    }
  | {
      ok: false;
      error: string;
      details?: any;
    };
