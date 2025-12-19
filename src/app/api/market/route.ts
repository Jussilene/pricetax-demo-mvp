// src/app/api/market/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickString(x: any) {
  const s = String(x ?? "").trim();
  return s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = pickString(searchParams.get("q"));
    if (!q) return NextResponse.json({ ok: true, items: [], sources: [] }, { status: 200 });

    // DuckDuckGo Instant Answer (sem key)
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Falha ao buscar mercado (HTTP ${res.status})` }, { status: 200 });
    }

    const data = await res.json().catch(() => null);

    const items: string[] = [];
    const sources: Array<{ title: string; url: string }> = [];

    // Abstract
    if (data?.AbstractText) {
      items.push(String(data.AbstractText).slice(0, 280));
      if (data?.AbstractURL) {
        sources.push({
          title: String(data?.Heading || "DuckDuckGo / Fonte"),
          url: String(data.AbstractURL),
        });
      }
    }

    // RelatedTopics
    const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
    for (const rt of related.slice(0, 8)) {
      // alguns itens vêm aninhados
      if (rt?.Text && rt?.FirstURL) {
        items.push(String(rt.Text).slice(0, 220));
        sources.push({ title: String(rt.Text).slice(0, 60), url: String(rt.FirstURL) });
      } else if (Array.isArray(rt?.Topics)) {
        for (const sub of rt.Topics.slice(0, 2)) {
          if (sub?.Text && sub?.FirstURL) {
            items.push(String(sub.Text).slice(0, 220));
            sources.push({ title: String(sub.Text).slice(0, 60), url: String(sub.FirstURL) });
          }
        }
      }
    }

    // fallback
    if (!items.length) {
      items.push("Benchmarks financeiros variam por setor/porte. Use referências públicas e valide com comparáveis diretos.");
    }

    return NextResponse.json(
      {
        ok: true,
        query: q,
        items: items.slice(0, 10),
        sources: sources.slice(0, 10),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro ao buscar mercado." }, { status: 200 });
  }
}
