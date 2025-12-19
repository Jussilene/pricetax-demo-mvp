"use client";

import { useEffect, useState } from "react";
import ChatDrawer from "@/components/ChatDrawer";

export default function ChatFab() {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setJobId(localStorage.getItem("pt_lastJobId"));
    } catch {}
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          fixed bottom-6 right-6 z-40
          h-28 w-28 rounded-full
          bg-yellow-400 hover:bg-yellow-300
          shadow-2xl
          flex items-center justify-center
        "
        aria-label="Abrir chat"
        title="Abrir chat"
      >
        {/* Ícone “quadradinho” (igual o print 1) */}
        <svg
          width="52"
          height="52"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            fill="#000"
            d="M6.5 4.75h11A3.75 3.75 0 0 1 21.25 8.5v6A3.75 3.75 0 0 1 17.5 18.25H10.2l-3.55 2.45c-.55.38-1.3-.02-1.3-.7v-1.75A3.75 3.75 0 0 1 2.75 14.5v-6A3.75 3.75 0 0 1 6.5 4.75Z"
          />
        </svg>
      </button>

      <ChatDrawer open={open} onClose={() => setOpen(false)} jobId={jobId} />
    </>
  );
}
