"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TopbarProps = {
  variant?: "home" | "dashboard";
};

type Theme = "dark" | "light";

export default function Topbar({ variant = "home" }: TopbarProps) {
  const [theme, setTheme] = useState<Theme>("dark");

  // aplica no <html> para os tokens do globals.css
  useEffect(() => {
    const stored =
      (typeof window !== "undefined" &&
        (localStorage.getItem("pt_theme") as Theme | null)) ||
      "dark";

    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pt_theme", next);
  }

  return (
    <header className="sticky top-0 z-50 border-b pt-border bg-[var(--pt-bg)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="leading-tight">
            {/* 🔹 Nome maior */}
            <div className="text-base font-semibold md:text-lg">
              PriceTax
            </div>

            {/* 🔹 Subtítulo um pouco maior */}
            <div className="text-sm pt-muted md:text-[13px]">
              Análise Inteligente de Balancetes
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          {/* BOTÃO TOGGLE CLARO / ESCURO */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="relative h-8 w-14 rounded-full border pt-btn transition-colors"
          >
            <span
              className={`absolute top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-[var(--panel)] text-sm shadow transition-all
                ${theme === "dark" ? "left-1" : "left-7"}
              `}
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </span>
          </button>

          {variant === "home" ? (
            <Link
              href="/dashboard"
              className="rounded-xl px-4 py-2 text-sm font-semibold pt-btn-primary"
            >
              Painel
            </Link>
          ) : (
            <>
              <Link
                href="/"
                className="rounded-xl px-4 py-2 text-sm font-semibold pt-btn-ghost"
              >
                Início
              </Link>

              <Link
                href="/dashboard"
                className="rounded-xl px-4 py-2 text-sm font-semibold pt-btn-primary"
              >
                Painel
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
