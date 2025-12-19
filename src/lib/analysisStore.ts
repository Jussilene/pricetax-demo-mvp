// src/lib/analysisStore.ts
import "server-only";
import { db } from "@/lib/db";

export function saveAnalysisRun(args: {
  userEmail?: string | null;
  jobId: string;
  payload: any;
}) {
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO analysis_runs (userEmail, jobId, createdAt, payloadJson)
    VALUES (@userEmail, @jobId, @createdAt, @payloadJson)
  `);

  stmt.run({
    userEmail: args.userEmail ?? null,
    jobId: args.jobId,
    createdAt,
    payloadJson: JSON.stringify(args.payload ?? {}),
  });
}

export function getLatestAnalysisRun(args?: { userEmail?: string | null; jobId?: string | null }) {
  const userEmail = args?.userEmail ?? null;
  const jobId = args?.jobId ?? null;

  if (jobId) {
    const row = db
      .prepare(
        `SELECT * FROM analysis_runs WHERE jobId = ? ORDER BY id DESC LIMIT 1`
      )
      .get(jobId) as any;

    return row ? { ...row, payload: safeJson(row.payloadJson) } : null;
  }

  if (userEmail) {
    const row = db
      .prepare(
        `SELECT * FROM analysis_runs WHERE userEmail = ? ORDER BY id DESC LIMIT 1`
      )
      .get(userEmail) as any;

    return row ? { ...row, payload: safeJson(row.payloadJson) } : null;
  }

  const row = db.prepare(`SELECT * FROM analysis_runs ORDER BY id DESC LIMIT 1`).get() as any;
  return row ? { ...row, payload: safeJson(row.payloadJson) } : null;
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
