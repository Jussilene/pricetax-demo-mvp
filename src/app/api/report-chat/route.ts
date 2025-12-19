import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getLatestAnalysisRun } from "@/lib/analysisStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function brMoney(n: any) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function brPct(n: any) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(2)}%`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const jobId = body?.jobId ? String(body.jobId) : null;
    const transcript = Array.isArray(body?.transcript) ? body.transcript : [];

    const run = getLatestAnalysisRun({ jobId });
    if (!run?.payload) {
      return NextResponse.json({ ok: false, error: "JobId não encontrado." }, { status: 404 });
    }

    const payload = run.payload;
    const result = payload?.result || payload?.analysis || payload?.data || null;

    const tccArr = result?.tccKpis?.byPeriod ?? [];
    const latest = Array.isArray(tccArr) && tccArr.length ? tccArr[tccArr.length - 1] : null;

    const top = Array.isArray(result?.topGastos) ? result.topGastos.slice(0, 8) : [];

    const period = latest?.period ?? "—";
    const receita = latest?.receita_liquida ?? null;
    const lucro = latest?.lucro_liquido ?? null;
    const despAdmin = latest?.despesas_admin ?? null;
    const mBruta = latest?.margem_bruta_pct ?? null;
    const mLiq = latest?.margem_liquida_pct ?? null;

    // plano coerente (texto)
    const plano7 = [
      "1) Renegociar / atacar os 3 maiores itens do Pareto (impacto imediato).",
      "2) Congelar despesas administrativas não essenciais (compras e contratos novos).",
      "3) Revisar recorrências (serviços/terceiros/licenças) e cortar duplicidades.",
      "4) Ajustar aprovações: qualquer gasto acima de X precisa validação.",
    ];

    const plano30 = [
      "1) Reestruturar centros de custo e criar metas por área.",
      "2) Revisar CMV/CPV e margem bruta por linha/atividade (onde estiver sangrando).",
      "3) Implantar rotina semanal: Pareto + despesas admin/receita + margem líquida.",
      "4) Padronizar fornecedores e contratos para reduzir variação e desperdício.",
    ];

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const page = pdf.addPage([595.28, 841.89]); // A4
    let y = 800;

    const draw = (text: string, size = 11, bold = false) => {
      page.drawText(text, { x: 50, y, size, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 7;
    };

    // capa
    draw("PriceTax", 22, true);
    draw("Relatório de Análise do Balancete + Plano de Redução de Custos", 13, true);
    y -= 6;
    draw(`Período base: ${period}`, 11);
    draw(`JobId: ${run.jobId}`, 10);
    draw(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 10);
    y -= 14;

    draw("1) Resumo Executivo", 14, true);
    draw(`Receita Líquida: ${brMoney(receita)}`);
    draw(`Lucro Líquido: ${brMoney(lucro)}`);
    draw(`Despesas Administrativas: ${brMoney(despAdmin)}`);
    draw(`Margem Bruta: ${brPct(mBruta)}`);
    draw(`Margem Líquida: ${brPct(mLiq)}`);
    y -= 10;

    draw("2) Top Gastos (Pareto)", 14, true);
    if (!top.length) {
      draw("— Pareto não disponível neste job.");
    } else {
      top.forEach((it: any, idx: number) => {
        const label = it?.label ?? it?.description ?? `Item ${idx + 1}`;
        const val = it?.value ?? it?.valor ?? it?.total ?? null;
        draw(`${idx + 1}. ${label}: ${brMoney(val)}`, 10);
      });
    }
    y -= 10;

    draw("3) Plano de Redução de Custos", 14, true);
    draw("✅ 7 dias (quick wins)", 12, true);
    plano7.forEach((l) => draw(`• ${l}`, 10));
    y -= 6;
    draw("✅ 30 dias (estrutural)", 12, true);
    plano30.forEach((l) => draw(`• ${l}`, 10));
    y -= 10;

    draw("4) Evidências desta conversa (resumo)", 14, true);
    const last = transcript.slice(-10);
    if (!last.length) {
      draw("— Sem transcript enviado.");
    } else {
      last.forEach((m: any) => {
        const role = m?.role === "user" ? "Você" : "IA";
        const txt = String(m?.text ?? "").replace(/\s+/g, " ").slice(0, 120);
        draw(`${role}: ${txt}${txt.length >= 120 ? "..." : ""}`, 9);
      });
    }

    const bytes = await pdf.save();

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio_pricetax_${run.jobId}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Falha ao gerar PDF." }, { status: 500 });
  }
}
