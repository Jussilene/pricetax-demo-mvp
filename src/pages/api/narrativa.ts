import type { NextApiRequest, NextApiResponse } from "next";
import { gerarNarrativa } from "@/services/narrativa.service";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const payload = req.body;

    const out = gerarNarrativa({
      periodos: payload?.periodos ?? [],
      kpisPorPeriodo: payload?.kpisPorPeriodo ?? {},
      topGastos: payload?.topGastos ?? [],
    });

    return res.status(200).json({ ok: true, ...out });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: "Falha ao gerar narrativa",
      details: String(err?.message || err),
    });
  }
}
