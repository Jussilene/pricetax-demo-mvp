import Topbar from "@/components/Topbar";
import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <main className="pt-bg min-h-screen">
      <Topbar variant="home" />
      <Hero />

      {/* Seção: Apresentação do sistema */}
      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="pt-card rounded-3xl p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="pt-muted text-sm">
                Sistema inteligente de análise financeira
              </div>

              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
                Visão executiva e insights estratégicos a partir de balancetes
              </h2>

              <p className="pt-muted mt-3 text-sm leading-relaxed">
                O sistema PriceTax realiza a leitura estruturada de balancetes,
                consolida períodos e transforma dados contábeis em indicadores,
                rankings e narrativas executivas para apoiar decisões financeiras
                e tributárias com clareza.
              </p>

              <p className="pt-muted mt-3 text-sm leading-relaxed">
                A proposta é reduzir o esforço operacional e ampliar a
                capacidade analítica, entregando uma visão objetiva para
                controladoria, financeiro e diretoria.
              </p>
            </div>

            {/* Painel ilustrativo (apresentacional) */}
            <div className="pt-surface rounded-2xl p-5 lg:w-[420px]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Visão consolidada</div>
                <div className="pt-muted text-xs">Painel executivo</div>
              </div>

              {/* ✅ AJUSTE 2: cards com alinhamento central correto */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-line bg-panel p-3 text-center flex flex-col items-center justify-center">
                  <div className="pt-muted text-xs">Receita</div>
                  <div className="mt-1 text-sm font-semibold leading-tight">
                    Consolidada
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-panel p-3 text-center flex flex-col items-center justify-center">
                  <div className="pt-muted text-xs">Despesas</div>
                  <div className="mt-1 text-sm font-semibold leading-tight">
                    Classificadas
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-panel p-3 text-center flex flex-col items-center justify-center">
                  <div className="pt-muted text-xs">Variações</div>
                  <div className="mt-1 text-sm font-semibold leading-tight">
                    Detectadas
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-line bg-panel p-4">
                <div className="text-sm font-semibold">Camadas de inteligência</div>
                <ul className="pt-muted mt-2 list-disc space-y-1 pl-5 text-xs">
                  <li>KPIs financeiros por período</li>
                  <li>Rankings por impacto</li>
                  <li>Alertas e pontos de atenção</li>
                  <li>Narrativa executiva automática</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Funcionamento do sistema */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-6 pb-14">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">
            Funcionamento do sistema
          </h2>
          <p className="pt-muted mt-1 text-sm">
            Um fluxo estruturado para transformar dados contábeis em decisão.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="pt-card rounded-2xl p-6">
            <div className="pt-muted text-sm">Entrada</div>
            <h3 className="mt-2 text-lg font-semibold">
              Leitura de balancetes
            </h3>
            <p className="pt-muted mt-2 text-sm">
              O sistema interpreta balancetes mensais, trimestrais ou anuais,
              identificando períodos, contas e estruturas contábeis.
            </p>
          </div>

          <div className="pt-card rounded-2xl p-6">
            <div className="pt-muted text-sm">Processamento</div>
            <h3 className="mt-2 text-lg font-semibold">
              Normalização e análise
            </h3>
            <p className="pt-muted mt-2 text-sm">
              Os dados são normalizados em uma base única, permitindo cálculos
              de KPIs, séries históricas, rankings e variações relevantes.
            </p>
          </div>

          <div className="pt-card rounded-2xl p-6">
            <div className="pt-muted text-sm">Entrega</div>
            <h3 className="mt-2 text-lg font-semibold">
              Visão executiva e insights
            </h3>
            <p className="pt-muted mt-2 text-sm">
              Os resultados são apresentados em painéis claros, com apoio de IA
              para interpretação, priorização e sugestões de ação.
            </p>
          </div>
        </div>
      </section>

      {/* Seção: Diferenciais */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="pt-card rounded-3xl p-8">
          <h2 className="text-xl font-semibold md:text-2xl">
            Diferenciais do sistema
          </h2>
          <p className="pt-muted mt-2 text-sm">
            Inteligência aplicada além da simples visualização de dados.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="pt-surface rounded-2xl p-5">
              <div className="text-sm font-semibold">
                Base contábil normalizada
              </div>
              <p className="pt-muted mt-2 text-sm">
                Estrutura padronizada para análise consistente entre períodos,
                empresas e cenários.
              </p>
            </div>

            <div className="pt-surface rounded-2xl p-5">
              <div className="text-sm font-semibold">
                Identificação de riscos e oportunidades
              </div>
              <p className="pt-muted mt-2 text-sm">
                Detecção automática de concentrações, desvios e variações
                relevantes nos dados financeiros.
              </p>
            </div>

            <div className="pt-surface rounded-2xl p-5">
              <div className="text-sm font-semibold">Indicadores executivos</div>
              <p className="pt-muted mt-2 text-sm">
                KPIs, rankings e gráficos preparados para leitura rápida por
                tomadores de decisão.
              </p>
            </div>

            <div className="pt-surface rounded-2xl p-5">
              <div className="text-sm font-semibold">Narrativa orientada à ação</div>
              <p className="pt-muted mt-2 text-sm">
                Interpretação automática dos números com checklist de ações
                sugeridas para curto e médio prazo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé institucional */}
      <footer className="mx-auto max-w-6xl px-6 pb-10">
        <div className="pt-muted text-xs">
          © {new Date().getFullYear()} PriceTax — Sistema inteligente de análise
          financeira e tributária.
        </div>
      </footer>
    </main>
  );
}
