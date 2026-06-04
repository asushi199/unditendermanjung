import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchStats, listRegistrationsExport } from "../api";

type Row = {
  draw_number: string;
  company_name: string;
  counter_id: number;
  registered_at: string;
};

export default function PrintRegistrationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Record<string, number | string | boolean | null>>({});
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("cetak") === "1";

  useEffect(() => {
    listRegistrationsExport().then(setRows);
    fetchStats().then(setStats);
  }, []);

  useEffect(() => {
    if (autoPrint && rows.length > 0) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint, rows.length]);

  return (
    <div className="print-report">
      <div className="print-toolbar no-print">
        <button type="button" className="btn primary" onClick={() => window.print()}>
          Cetak / Simpan PDF
        </button>
        <a className="btn secondary" href="/api/registrations/export" download>
          Muat turun CSV
        </a>
        <Link className="btn secondary" to="/admin">
          Kembali
        </Link>
      </div>

      <header className="print-header">
        <h1>Senarai Pendaftaran Syarikat</h1>
        <p className="print-meta">
          Kerja Undi Bilangan 1 Tahun 2026 · Dicetak: {new Date().toLocaleString("ms-MY")}
        </p>
        <p className="print-meta">
          Jumlah berdaftar: <strong>{stats.registration_count as number}</strong>
          {stats.total_companies != null && (
            <>
              {" "}
              · Senarai syarikat: <strong>{stats.total_companies as number}</strong>
            </>
          )}
        </p>
      </header>

      <table className="print-table">
        <thead>
          <tr>
            <th>Bil</th>
            <th>Nombor Undian</th>
            <th>Nama Syarikat</th>
            <th>Kaunter</th>
            <th>Tarikh & Masa (MYT)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.draw_number}-${i}`}>
              <td>{i + 1}</td>
              <td className="num">{r.draw_number}</td>
              <td>{r.company_name}</td>
              <td>{r.counter_id}</td>
              <td>{r.registered_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="print-empty">Tiada pendaftaran lagi.</p>}
    </div>
  );
}
