export type PeriodMode = "ANUAL" | "TRIMESTRAL" | "MENSAL";

export type RowItem = {
  conta: string;
  debito: number;
  percent_receita: number;
};

export type AnalyzeResponse = {
  empresa: string;
  periodo: string;
  modo_periodo: PeriodMode;
  kpis: {
    receita_liquida: number;
    total_gastos_top10: number;
    admin_total_top10: number;
    concentracao_admin: number;
  };
  top10_gastos: RowItem[];
  top10_admin: RowItem[];
  resumo_executivo: string;
  checklist: string[];
};
