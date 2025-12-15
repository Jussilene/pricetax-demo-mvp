import { NextResponse } from "next/server";

function makeResponse(preset: string) {
  const base = {
    empresa: "Empresa Demo",
    periodo: "2024",
    modo_periodo: "ANUAL",
  };

  if (preset === "A") {
    return {
      ...base,
      empresa: "Balancete Demo A (Indústria)",
      kpis: {
        receita_liquida: 52000000,
        total_gastos_top10: 19500000,
        admin_total_top10: 4200000,
        concentracao_admin: 0.48,
      },
      top10_gastos: [
        { conta: "Fretes e Carretos", debito: 3600000, percent_receita: 0.0692 },
        { conta: "Juros Pagos", debito: 8200000, percent_receita: 0.1577 },
        { conta: "Pessoal (Total)", debito: 1750000, percent_receita: 0.0337 },
        { conta: "Manutenção Industrial", debito: 980000, percent_receita: 0.0188 },
        { conta: "Energia Elétrica", debito: 720000, percent_receita: 0.0138 },
        { conta: "Serviços de Terceiros", debito: 690000, percent_receita: 0.0133 },
        { conta: "Combustíveis", debito: 520000, percent_receita: 0.01 },
        { conta: "Seguros", debito: 410000, percent_receita: 0.0079 },
        { conta: "Viagens", debito: 260000, percent_receita: 0.005 },
        { conta: "Materiais de Escritório", debito: 170000, percent_receita: 0.0033 },
      ],
      top10_admin: [
        { conta: "Salários Administrativos", debito: 1100000, percent_receita: 0.0212 },
        { conta: "Benefícios (VA/VR)", debito: 520000, percent_receita: 0.01 },
        { conta: "Serviços Contábeis/Consultoria", debito: 480000, percent_receita: 0.0092 },
        { conta: "Aluguel/Condomínio", debito: 420000, percent_receita: 0.0081 },
        { conta: "TI (Softwares/Licenças)", debito: 380000, percent_receita: 0.0073 },
        { conta: "Telefonia/Internet", debito: 140000, percent_receita: 0.0027 },
        { conta: "Material de Escritório", debito: 170000, percent_receita: 0.0033 },
        { conta: "Treinamentos", debito: 120000, percent_receita: 0.0023 },
        { conta: "Despesas Bancárias", debito: 210000, percent_receita: 0.004 },
        { conta: "Viagens Administrativas", debito: 260000, percent_receita: 0.005 },
      ],
      resumo_executivo:
        "O perfil de custos indica alta pressão financeira por juros e logística. A concentração administrativa está acima do ideal, sugerindo revisão de estrutura e renegociação de contratos críticos.",
      checklist: [
        "Renegociar fretes (leilão de transportadoras, rotas, SLA e volumetria).",
        "Revisar dívida/juros: simular troca de indexador, alongamento e amortização.",
        "Auditar contratos de terceiros e serviços recorrentes (corte de redundâncias).",
        "Implantar orçamento por centro de custo (admin x produção) com metas mensais.",
        "Criar política de compras (3 cotações + aprovação por faixa de valor).",
      ],
    };
  }

  if (preset === "B") {
    return {
      ...base,
      empresa: "Balancete Demo B (Serviços)",
      kpis: {
        receita_liquida: 12800000,
        total_gastos_top10: 6100000,
        admin_total_top10: 2600000,
        concentracao_admin: 0.62,
      },
      top10_gastos: [
        { conta: "Folha Operacional", debito: 2400000, percent_receita: 0.1875 },
        { conta: "Marketing/Anúncios", debito: 900000, percent_receita: 0.0703 },
        { conta: "Ferramentas SaaS", debito: 620000, percent_receita: 0.0484 },
        { conta: "Comissões", debito: 520000, percent_receita: 0.0406 },
        { conta: "Impostos/Taxas", debito: 460000, percent_receita: 0.0359 },
        { conta: "Aluguel", debito: 380000, percent_receita: 0.0297 },
        { conta: "Consultorias", debito: 320000, percent_receita: 0.025 },
        { conta: "Viagens", debito: 210000, percent_receita: 0.0164 },
        { conta: "Treinamentos", debito: 150000, percent_receita: 0.0117 },
        { conta: "Despesas Bancárias", debito: 140000, percent_receita: 0.0109 },
      ],
      top10_admin: [
        { conta: "SaaS / Licenças", debito: 620000, percent_receita: 0.0484 },
        { conta: "Aluguel/Infra", debito: 380000, percent_receita: 0.0297 },
        { conta: "Administrativo (Pessoal)", debito: 740000, percent_receita: 0.0578 },
        { conta: "Contabilidade", debito: 190000, percent_receita: 0.0148 },
        { conta: "Jurídico", debito: 160000, percent_receita: 0.0125 },
        { conta: "Telefonia/Internet", debito: 120000, percent_receita: 0.0094 },
        { conta: "Materiais/Expediente", debito: 90000, percent_receita: 0.007 },
        { conta: "Despesas Bancárias", debito: 140000, percent_receita: 0.0109 },
        { conta: "Seguros", debito: 80000, percent_receita: 0.0063 },
        { conta: "Outros", debito: 80000, percent_receita: 0.0063 },
      ],
      resumo_executivo:
        "A empresa de serviços apresenta alta concentração de despesas administrativas e custo de ferramentas. Há oportunidade imediata em otimização de SaaS, revisão de estrutura e reequilíbrio entre marketing e CAC.",
      checklist: [
        "Inventariar SaaS e cancelar/negociar licenças não utilizadas.",
        "Definir teto de gasto em marketing por canal com meta de CAC/ROI.",
        "Revisar quadro administrativo e automatizar rotinas (redução de horas).",
        "Renegociar aluguel/infra e migrar para modelo híbrido, se aplicável.",
        "Criar política de viagens e treinamentos com aprovação e ROI esperado.",
      ],
    };
  }

  // preset C
  return {
    ...base,
    empresa: "Balancete Demo C (Varejo)",
    kpis: {
      receita_liquida: 8600000,
      total_gastos_top10: 5400000,
      admin_total_top10: 1900000,
      concentracao_admin: 0.44,
    },
    top10_gastos: [
      { conta: "CMV (Mercadorias)", debito: 3200000, percent_receita: 0.3721 },
      { conta: "Fretes (Entrada/Saída)", debito: 520000, percent_receita: 0.0605 },
      { conta: "Taxas de Cartão", debito: 410000, percent_receita: 0.0477 },
      { conta: "Folha (Loja)", debito: 680000, percent_receita: 0.0791 },
      { conta: "Aluguel", debito: 360000, percent_receita: 0.0419 },
      { conta: "Quebras/Perdas", debito: 240000, percent_receita: 0.0279 },
      { conta: "Marketing", debito: 190000, percent_receita: 0.0221 },
      { conta: "Energia", debito: 140000, percent_receita: 0.0163 },
      { conta: "Manutenção", debito: 110000, percent_receita: 0.0128 },
      { conta: "Segurança", debito: 80000, percent_receita: 0.0093 },
    ],
    top10_admin: [
      { conta: "Administrativo (Pessoal)", debito: 520000, percent_receita: 0.0605 },
      { conta: "Contabilidade", debito: 130000, percent_receita: 0.0151 },
      { conta: "TI / Sistemas", debito: 180000, percent_receita: 0.0209 },
      { conta: "Jurídico", debito: 90000, percent_receita: 0.0105 },
      { conta: "Taxas Bancárias", debito: 70000, percent_receita: 0.0081 },
      { conta: "Telefonia/Internet", debito: 60000, percent_receita: 0.007 },
      { conta: "Materiais/Expediente", debito: 50000, percent_receita: 0.0058 },
      { conta: "Serviços Gerais", debito: 280000, percent_receita: 0.0326 },
      { conta: "Viagens", debito: 40000, percent_receita: 0.0047 },
      { conta: "Outros", debito: 100000, percent_receita: 0.0116 },
    ],
    resumo_executivo:
      "No varejo, CMV e taxas de cartão dominam a estrutura de custos. As melhores alavancas de economia são negociação com fornecedores, gestão de perdas, revisão de taxas e otimização logística.",
    checklist: [
      "Renegociar fornecedores (prazo, desconto por volume, bonificações).",
      "Atacar perdas/quebras: inventário cíclico e controle de ruptura.",
      "Revisar taxas de cartão (adquirente, antecipação e mix de parcelas).",
      "Otimizar fretes com regras de frete grátis e rotas por região.",
      "Implantar metas de margem por categoria e ajuste de preços baseado em giro.",
    ],
  };
}

export async function POST(req: Request) {
  // aceita tanto form-data quanto json (pra facilitar demo)
  const contentType = req.headers.get("content-type") || "";
  let preset = "A";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    preset = body?.preset || "A";
  } else {
    const form = await req.formData().catch(() => null);
    preset = (form?.get("preset") as string) || "A";
  }

  return NextResponse.json(makeResponse(preset));
}
