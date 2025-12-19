"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";

type ChatMsg = {
  id: string;
  role: Role;
  text: string;
  ts: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  jobId: string | null;
};

function storageKey(jobId: string | null) {
  return `pt_chat_messages_${jobId || "nojob"}`;
}

export default function ChatDrawer({ open, onClose, jobId }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  // ✅ carrega histórico ao abrir
  useEffect(() => {
    if (!open) return;

    try {
      const raw = localStorage.getItem(storageKey(jobId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}

    // mensagem inicial
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text:
          "Oi! 👋\n" +
          "Eu sou a assistende da PriceTax e posso te ajudar a entender os resultados do balancete, os gráficos do painel, o Pareto e sugerir um plano de redução de custos.\n\n" +
          "Exemplos:\n" +
          "• “quais são os 3 maiores gastos?”\n" +
          "• “por que a margem líquida ficou negativa?”\n" +
          "• “me dê um plano de corte de custo em 7 dias e em 30 dias”\n" +
          "• “gera um PDF do relatório com as ações”",
        ts: Date.now(),
      },
    ]);
  }, [open, jobId]);

  // ✅ salva histórico sempre
  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(storageKey(jobId), JSON.stringify(messages));
    } catch {}
  }, [messages, open, jobId]);

  // ✅ auto-scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, open]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  // ✅ manda só o final para não estourar
  const historyPayload = useMemo(() => {
    return messages.slice(-14).map((m) => ({
      role: m.role,
      text: m.text,
      ts: m.ts,
    }));
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setInput("");

    const userMsg: ChatMsg = { id: uid(), role: "user", text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          jobId,
          history: historyPayload,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Falha no /api/chat (HTTP ${res.status}).`);
      }

      const replyText = String(data.reply ?? "").trim() || "(Sem resposta.)";
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", text: replyText, ts: Date.now() }]);
    } catch (e: any) {
      setError(e?.message || "Erro ao enviar mensagem.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function gerarPdfRelatorio() {
    try {
      setError(null);

      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          transcript: messages.map((m) => ({ role: m.role, text: m.text, ts: m.ts })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Falha ao gerar PDF (HTTP ${res.status}).`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_pricetax_${jobId || "sem_job"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Erro ao gerar PDF.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="
          pointer-events-auto
          fixed right-6 top-20
          w-[720px] max-w-[96vw]
          h-[82vh]
          overflow-hidden
          pt-chat-drawer
        "
        style={{ borderRadius: 10 }}
      >
        {/* Header */}
        <div className="pt-chat-header px-4 py-3">
          <div>
            <h2 className="pt-chat-title text-sm font-semibold">Chat IA</h2>
            <p className="pt-chat-sub text-xs">
              Contexto: {jobId ? `jobId ${jobId}` : "sem jobId"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="pt-chat-btn px-3 py-2 text-xs" title="Fechar">
              Fechar
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={listRef} className="h-[calc(82vh-140px)] overflow-auto px-4 py-4">
          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "pt-chat-bubble-user max-w-[82%] whitespace-pre-wrap px-4 py-3"
                      : "pt-chat-bubble-assistant max-w-[82%] whitespace-pre-wrap px-4 py-3"
                  }
                  style={{ borderRadius: 10 }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="pt-chat-bubble-assistant max-w-[82%] whitespace-pre-wrap px-4 py-3" style={{ borderRadius: 10 }}>
                  Pensando...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 pt-chat-error p-2 text-xs">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="pt-chat-footer p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Pergunte algo (ex: "margem líquida negativa", "top 3 gastos", "plano de redução de custos")'
            className="pt-chat-input min-h-[72px] w-full resize-none outline-none"
          />

          <div className="mt-2 flex items-center justify-between">
            <span className="pt-chat-hint text-xs">Enter envia • Shift+Enter quebra linha</span>

            <button
              onClick={send}
              disabled={!canSend}
              className={
                "rounded-md px-4 py-2 text-sm font-semibold transition " +
                (canSend ? "pt-chat-send" : "pt-chat-send-disabled")
              }
            >
              Enviar
            </button>
          </div>

          {/* (opcional) botão PDF caso você queira expor no chat */}
          {/* <button onClick={gerarPdfRelatorio} className="mt-2 pt-chat-btn px-3 py-2 text-xs">
            Gerar PDF
          </button> */}
        </div>
      </div>
    </div>
  );
}
