type KpisPeriodo = {
  receitaLiquida?: number;
  despAdmin?: number;
  lucroLiquido?: number;
  margemLiquida?: number; // 0..1
};

type DistribuicaoGrupos = {
  ATIVO?: number;
  PASSIVO?: number;
  DRE?: number;
};

type NarrativeInput = {
  periodos: string[];
  kpisPorPeriodo: Record<string, KpisPeriodo>;
  topGastos: Array<{ label: string; value: number }>;

  // opcionais (não quebram nada se não vierem)
  distribuicaoGrupos?: DistribuicaoGrupos;
  thresholds?: {
    // 0..1
    receitaQuedaWarn?: number;      // ex: 0.10
    receitaQuedaCrit?: number;      // ex: 0.25
    adminAltaWarn?: number;         // ex: 0.15
    adminAltaCrit?: number;         // ex: 0.25
    concentracaoTop3Warn?: number;  // ex: 0.45
    concentracaoTop3Crit?: number;  // ex: 0.60
  };
};

type AlertLevel = "info" | "warning" | "critical";

type Alert = {
  level: AlertLevel;
  message: string;
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function safeNum(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function sortPeriodos(periodos: string[]) {
  // Ordena T1/2024, T2/2024... T4/2025 corretamente
  const parse = (p: string) => {
    const m = String(p).match(/T\s*(\d)\s*\/\s*(\d{4})/i);
    if (!m) return { ok: false, raw: p, y: 0, q: 0 };
    const q = Number(m[1]);
    const y = Number(m[2]);
    if (!Number.isFinite(q) || !Number.isFinite(y)) return { ok: false, raw: p, y: 0, q: 0 };
    return { ok: true, raw: p, y, q };
  };

  const parsed = periodos.map(parse);
  const hasAny = parsed.some((x) => x.ok);

  // Se não bate o formato, mantém ordem original (não inventa)
  if (!hasAny) return periodos;

  return parsed
    .slice()
    .sort((a, b) => a.y - b.y || a.q - b.q || String(a.raw).localeCompare(String(b.raw)))
    .map((x) => x.raw);
}

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function severityFromDelta(deltaAbs: number, warn: number, crit: number): AlertLevel {
  if (deltaAbs >= crit) return "critical";
  if (deltaAbs >= warn) return "warning";
  return "info";
}

function makeNextSteps(items: Array<{ p: "P1" | "P2" | "P3"; text: string }>) {
  const order = { P1: 1, P2: 2, P3: 3 } as const;
  return items
    .slice()
    .sort((a, b) => order[a.p] - order[b.p])
    .map((x) => `${x.p} — ${x.text}`);
}

export function gerarNarrativa(input: NarrativeInput) {
  const thresholds = {
    receitaQuedaWarn: 0.10,
    receitaQuedaCrit: 0.25,
    adminAltaWarn: 0.15,
    adminAltaCrit: 0.25,
    concentracaoTop3Warn: 0.45,
    concentracaoTop3Crit: 0.60,
    ...(input.thresholds || {}),
  };

  const periodosRaw = Array.isArray(input.periodos) ? input.periodos : [];
  const periodos = sortPeriodos(periodosRaw);

  const k = input.kpisPorPeriodo || {};
  const top = (input.topGastos || []).slice(0, 10);

  const pUlt = periodos[periodos.length - 1] || null;
  const pAnt = periodos[periodos.length - 2] || null;

  const ult = pUlt ? k[pUlt] || {} : {};
  const ant = pAnt ? k[pAnt] || {} : {};

  const receitaUlt = safeNum(ult.receitaLiquida);
  const receitaAnt = safeNum(ant.receitaLiquida);

  const lucroUlt = safeNum(ult.lucroLiquido);
  const lucroAnt = safeNum(ant.lucroLiquido);

  const adminUlt = safeNum(ult.despAdmin);
  const adminAnt = safeNum(ant.despAdmin);

  // Margem líquida: usa se vier, senão calcula
  const margemUlt =
    Number.isFinite(Number(ult.margemLiquida))
      ? clamp01(Number(ult.margemLiquida))
      : receitaUlt !== 0
      ? clamp01(lucroUlt / receitaUlt)
      : null;

  const margemAnt =
    Number.isFinite(Number(ant.margemLiquida))
      ? clamp01(Number(ant.margemLiquida))
      : receitaAnt !== 0
      ? clamp01(lucroAnt / receitaAnt)
      : null;

  const varReceita = pAnt && receitaAnt !== 0 ? (receitaUlt - receitaAnt) / receitaAnt : null;
  const varAdmin = pAnt && adminAnt !== 0 ? (adminUlt - adminAnt) / adminAnt : null;

  // Para lucro, evita “estourar” % quando lucro anterior é muito baixo/negativo
  const baseLucro = Math.max(Math.abs(lucroAnt), 1);
  const varLucro = pAnt ? (lucroUlt - lucroAnt) / baseLucro : null;

  // Pareto: concentração Top 3
  const top3 = top.slice(0, 3);
  const totalTop = top.reduce((acc, t) => acc + safeNum(t.value), 0);
  const totalTop3 = top3.reduce((acc, t) => acc + safeNum(t.value), 0);
  const concTop3 = totalTop > 0 ? totalTop3 / totalTop : null;

  const alertas: Alert[] = [];

  // Queda receita
  if (varReceita !== null) {
    if (varReceita < 0) {
      const sev = severityFromDelta(Math.abs(varReceita), thresholds.receitaQuedaWarn, thresholds.receitaQuedaCrit);
      if (sev !== "info") {
        alertas.push({
          level: sev,
          message: `Queda de Receita Líquida (${pAnt} → ${pUlt}): ${pct(varReceita)}.`,
        });
      } else {
        alertas.push({
          level: "info",
          message: `Receita Líquida variou (${pAnt} → ${pUlt}): ${pct(varReceita)}.`,
        });
      }
    } else if (Math.abs(varReceita) >= thresholds.receitaQuedaWarn) {
      alertas.push({
        level: "info",
        message: `Receita Líquida em alta (${pAnt} → ${pUlt}): ${pct(varReceita)}.`,
      });
    }
  }

  // Admin alta
  if (varAdmin !== null) {
    if (varAdmin >= thresholds.adminAltaWarn) {
      const sev = severityFromDelta(varAdmin, thresholds.adminAltaWarn, thresholds.adminAltaCrit);
      alertas.push({
        level: sev,
        message: `Alta em Despesas Administrativas (${pAnt} → ${pUlt}): ${pct(varAdmin)}.`,
      });
    } else if (varAdmin <= -thresholds.adminAltaWarn) {
      alertas.push({
        level: "info",
        message: `Redução em Despesas Administrativas (${pAnt} → ${pUlt}): ${pct(varAdmin)}.`,
      });
    }
  }

  // Lucro negativo
  if (pUlt && lucroUlt < 0) {
    alertas.push({
      level: "critical",
      message: `Lucro Líquido negativo no período mais recente (${pUlt}).`,
    });
  } else if (pUlt && margemUlt !== null && margemUlt < 0.02) {
    alertas.push({
      level: "warning",
      message: `Margem líquida muito apertada no período mais recente (${pUlt}): ${pct(margemUlt)}.`,
    });
  }

  // Concentração Pareto
  if (concTop3 !== null) {
    const sev = severityFromDelta(concTop3, thresholds.concentracaoTop3Warn, thresholds.concentracaoTop3Crit);
    if (sev !== "info") {
      alertas.push({
        level: sev,
        message: `Concentração de gastos: Top 3 representam ${pct(concTop3)} do total do ranking (indicativo de dependência/risco).`,
      });
    }
  }

  // Ordena alertas por severidade
  const sevOrder: Record<AlertLevel, number> = { critical: 1, warning: 2, info: 3 };
  alertas.sort((a, b) => sevOrder[a.level] - sevOrder[b.level]);

  // Texto Top Gastos (5 itens)
  const top5 = top.slice(0, 5);
  const topTxt = top5.length
    ? top5.map((t, i) => `${i + 1}. ${String(t.label ?? "—")} — ${brl(safeNum(t.value))}`).join("\n")
    : "Sem ranking de gastos disponível.";

  // Tendência do ano (se tiver 4+ períodos no mesmo padrão Tn/AAAA)
  let tendenciaTxt = "";
  if (periodos.length >= 4) {
    const firstP = periodos[0];
    const lastP = periodos[periodos.length - 1];
    const first = k[firstP] || {};
    const last = k[lastP] || {};
    const r0 = safeNum(first.receitaLiquida);
    const r1 = safeNum(last.receitaLiquida);
    const l0 = safeNum(first.lucroLiquido);
    const l1 = safeNum(last.lucroLiquido);

    const trendR = r0 !== 0 ? (r1 - r0) / Math.abs(r0) : null;
    const trendL = Math.max(Math.abs(l0), 1) !== 0 ? (l1 - l0) / Math.max(Math.abs(l0), 1) : null;

    const arrow = (v: number | null) => (v === null ? "—" : v > 0 ? "↑" : v < 0 ? "↓" : "→");

    tendenciaTxt =
      `Tendência no período analisado (${firstP} → ${lastP}): ` +
      `Receita ${arrow(trendR)} ${trendR === null ? "N/D" : pct(trendR)} | ` +
      `Lucro ${arrow(trendL)} ${trendL === null ? "N/D" : pct(trendL)}.`;
  }

  // Resumo executivo (2–5 parágrafos, mais humano)
  const resumoParts: string[] = [];

  resumoParts.push(
    `No período mais recente (${pUlt || "N/D"}), a empresa registrou ` +
      `Receita Líquida de ${brl(receitaUlt)} e Lucro Líquido de ${brl(lucroUlt)}.` +
      (margemUlt !== null ? ` A margem líquida estimada ficou em ${pct(margemUlt)}.` : "")
  );

  if (pAnt) {
    resumoParts.push(
      `Em relação ao período anterior (${pAnt}), a Receita ` +
        `${varReceita === null ? "não pôde ser comparada" : `variou ${pct(varReceita)}`}` +
        ` e o Lucro ` +
        `${varLucro === null ? "não pôde ser comparado" : `variou ${pct(varLucro)}`}` +
        `.`
    );
  } else {
    resumoParts.push(`Ainda não há período anterior suficiente para comparação automática.`);
  }

  resumoParts.push(
    `As Despesas Administrativas no período mais recente foram ${brl(adminUlt)}` +
      (pAnt ? ` (${varAdmin === null ? "variação N/D" : `variação de ${pct(varAdmin)} vs ${pAnt}`}).` : ".") +
      ` Em termos práticos: despesas administrativas acima do esperado pressionam margem e reduzem capacidade de investimento.`
  );

  if (lucroUlt < 0) {
    resumoParts.push(
      `Importante: o resultado líquido ficou negativo no período mais recente. ` +
        `Isso não significa “pânico”, mas pede ação rápida e priorizada: ` +
        `corrigir vazamentos de custos, renegociar itens recorrentes e revisar mix/preço para recuperar margem nos próximos 30 dias.`
    );
  } else {
    resumoParts.push(
      `Os principais centros de gasto no recorte analisado foram:\n${topTxt}`
    );
  }

  if (tendenciaTxt) {
    resumoParts.push(tendenciaTxt);
  }

  // Checklist acionável por cenário + próximos passos P1/P2/P3
  const checklist: string[] = [];
  const nextSteps: Array<{ p: "P1" | "P2" | "P3"; text: string }> = [];

  // Base (sempre útil)
  checklist.push("Validar se o período/ano detectados estão corretos (evita comparação errada).");
  checklist.push("Revisar os 5 maiores gastos (Pareto) e confirmar: recorrência, contrato, e se é custo fixo ou variável.");

  // Cenários
  const receitaCaindo = varReceita !== null && varReceita <= -thresholds.receitaQuedaWarn;
  const adminSubindo = varAdmin !== null && varAdmin >= thresholds.adminAltaWarn;
  const lucroNegativo = lucroUlt < 0;

  if (lucroNegativo) {
    checklist.push("Montar plano de 30 dias: cortar/renegociar Top 3 gastos + revisar despesas administrativas.");
    checklist.push("Revisar precificação/mix e identificar produtos/serviços com margem negativa.");
    checklist.push("Definir meta semanal: reduzir despesas e recuperar margem (acompanhamento por período).");

    nextSteps.push({ p: "P1", text: "Atacar Top 3 gastos (renegociação/corte) e reduzir despesas administrativas já neste ciclo." });
    nextSteps.push({ p: "P1", text: "Revisar preço/mix (itens com margem baixa) e priorizar vendas de maior contribuição." });
    nextSteps.push({ p: "P2", text: "Criar rotina de acompanhamento: Receita, Admin e Lucro por período com metas." });
    nextSteps.push({ p: "P3", text: "Mapear oportunidades de automação/processo para reduzir custo operacional recorrente." });
  } else {
    if (adminSubindo) {
      checklist.push("Abrir detalhamento de despesas administrativas e separar: recorrente x não recorrente.");
      checklist.push("Definir meta de % de admin sobre Receita para o próximo período e acompanhar.");

      nextSteps.push({ p: "P1", text: "Detalhar despesas administrativas e eliminar itens não essenciais/duplicados." });
      nextSteps.push({ p: "P2", text: "Renegociar contratos recorrentes (aluguel, serviços, licenças, etc.)." });
    }

    if (receitaCaindo) {
      checklist.push("Revisar funil comercial e causas de queda (ticket, volume, cancelamentos, sazonalidade).");
      checklist.push("Avaliar reajustes de preço e campanhas para recuperar Receita sem sacrificar margem.");

      nextSteps.push({ p: "P1", text: "Diagnosticar rapidamente a causa da queda de receita (volume x preço x mix)." });
      nextSteps.push({ p: "P2", text: "Ajustar estratégia comercial (mix, upsell, retenção) com foco em margem." });
    }

    checklist.push("Checar variações > thresholds nas contas e justificar (eventos não recorrentes).");
    checklist.push("Transformar parte das despesas em investimento (processos/automação) apenas após estabilizar margem.");

    if (nextSteps.length === 0) {
      nextSteps.push({ p: "P1", text: "Manter governança: acompanhar Receita, Admin, Lucro e Margem por período." });
      nextSteps.push({ p: "P2", text: "Reduzir dependência do Top 3 gastos (alternativas/negociação) para reduzir risco." });
      nextSteps.push({ p: "P3", text: "Criar plano de eficiência: automações/processos que reduzam custo recorrente." });
    }
  }

  const alertasTxt = alertas.map((a) => `${a.level.toUpperCase()}: ${a.message}`);

  // ✅ mantém o contrato atual (strings e arrays), só melhora conteúdo
  const resumoExecutivo = resumoParts.filter(Boolean).slice(0, 5).join("\n\n");

  const checklistFinal = [
    ...checklist,
    "",
    "Próximos passos (prioridade):",
    ...makeNextSteps(nextSteps),
  ].filter((x) => x !== undefined) as string[];

  return {
    resumoExecutivo,
    alertas: alertasTxt,
    checklist: checklistFinal,
  };
}
