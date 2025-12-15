import { RowItem } from "@/lib/types";
import { formatBRL, formatPercent } from "@/lib/format";

export function Top10Table({
  title,
  rows,
}: {
  title: string;
  rows: RowItem[];
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-6">
      <h3 className="mb-4 font-semibold">{title}</h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="py-2 text-left">Conta</th>
            <th className="py-2 text-right">Débito</th>
            <th className="py-2 text-right">% Receita</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line">
              <td className="py-2">{r.conta}</td>
              <td className="py-2 text-right">{formatBRL(r.debito)}</td>
              <td className="py-2 text-right">
                {formatPercent(r.percent_receita)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
