"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  const apply = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("pt_theme", t);

    // mantém seu atributo
    document.documentElement.setAttribute("data-theme", t);

    // ✅ ISSO resolve o “continua black”
    document.documentElement.classList.toggle("dark", t === "dark");
  };

  useEffect(() => {
    const saved = (localStorage.getItem("pt_theme") as Theme | null) ?? "dark";
    apply(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
  }

  return (
    <button
      onClick={toggle}
      className="pt-btn rounded-xl px-4 py-2 text-sm font-semibold"
      type="button"
      aria-label="Alternar tema"
      title="Alternar tema"
    >
      {theme === "dark" ? "Claro" : "Escuro"}
    </button>
  );
}
