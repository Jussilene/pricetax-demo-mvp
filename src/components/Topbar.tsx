import Link from "next/link";

export function Topbar() {
  return (
    <header className="border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-xl font-semibold">
          Price<span className="text-gold">Tax</span>
        </span>

        <nav className="hidden gap-6 text-sm text-muted md:flex">
          <a href="#">Home</a>
          <a href="#">Soluções</a>
          <a href="#">Contato</a>
        </nav>

        <Link
          href="/dashboard"
          className="rounded-full border border-gold/40 px-5 py-2 text-sm font-semibold hover:bg-gold/10"
        >
          Acessar
        </Link>
      </div>
    </header>
  );
}
