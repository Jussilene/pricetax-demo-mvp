"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  const apply = (t: Theme) => {
    setThemeState(t);

    // ✅ mantém seu atributo atual
    document.documentElement.setAttribute("data-theme", t);

    // ✅ ISSO é o que faz o Tailwind dark: funcionar corretamente
    document.documentElement.classList.toggle("dark", t === "dark");

    localStorage.setItem("pt_theme", t);
  };

  useEffect(() => {
    const saved = (localStorage.getItem("pt_theme") as Theme | null) ?? "dark";
    apply(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      theme,
      toggle: () => apply(theme === "dark" ? "light" : "dark"),
      setTheme: (t: Theme) => apply(t),
    }),
    [theme]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
