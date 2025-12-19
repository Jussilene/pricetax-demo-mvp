// src/components/Hero.tsx
"use client";

export function Hero() {
  return (
    <section className="pt-hero">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-12">
        <div className="max-w-3xl">
          <div className="pt-muted text-sm">
            Sistema inteligente para leitura e análise de balancetes
          </div>

          <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-6xl text-yellow-400">
            Clareza executiva
            <br />
            para decisões financeiras e tributárias
          </h1>

          <p className="mt-6 max-w-2xl text-sm md:text-base pt-muted">
            O PriceTax transforma PDFs contábeis em uma base normalizada, calcula
            KPIs por período, identifica variações relevantes e entrega insights
            acionáveis com suporte de IA tudo em uma visão pronta para diretoria.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl p-6 pt-surface">
            <div className="text-sm pt-muted">Entrada</div>
            <h3 className="mt-2 text-lg font-semibold">Upload de balancetes</h3>
            <p className="mt-2 text-sm pt-muted">
              Envie 2 a 4 PDFs (mensal, trimestral ou anual). O sistema detecta
              período/ano e organiza os dados automaticamente.
            </p>
          </div>

          <div className="rounded-2xl p-6 pt-surface">
            <div className="text-sm pt-muted">Inteligência</div>
            <h3 className="mt-2 text-lg font-semibold">
              KPIs + rankings + alertas
            </h3>
            <p className="mt-2 text-sm pt-muted">
              Base contábil limpa, séries por período, top gastos (Pareto),
              variações críticas e pontos de atenção por impacto.
            </p>
          </div>

          <div className="rounded-2xl p-6 pt-surface">
            <div className="text-sm pt-muted">Entrega</div>
            <h3 className="mt-2 text-lg font-semibold">
              Painel executivo + chat IA
            </h3>
            <p className="mt-2 text-sm pt-muted">
              Visualizações claras, narrativa executiva automática e checklist
              prático com chat para orientar próximos passos e decisões.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
