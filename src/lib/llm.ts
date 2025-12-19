// src/lib/llm.ts
import OpenAI from "openai";

type Msg = {
  role: "developer" | "user" | "assistant";
  content: string;
};

export async function runLlm(args: {
  instructions: string;
  input: Msg[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  const client = new OpenAI({ apiKey });

  const model = args.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const temperature = typeof args.temperature === "number" ? args.temperature : 0.4;
  const maxTokens = typeof args.maxTokens === "number" ? args.maxTokens : 700;

  // O endpoint de chat espera "system" (não "developer")
  const messages = [
    { role: "system" as const, content: args.instructions },
    ...args.input.map((m) => ({
      role: m.role === "developer" ? ("system" as const) : m.role,
      content: m.content,
    })),
  ];

  const resp = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return resp.choices?.[0]?.message?.content ?? "";
}
