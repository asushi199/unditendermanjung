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
    document.body.classList.add("print-landscape");
    listRegistrationsExport().then(setRows);
    fetchStats().then(setStats);
    return () => document.body.classList.remove("print-landscape");
  }, []);

  useEffect(() => {
    if (autoPrint && rows.length > 0) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint, rows.length]);

  return (
    <div className="print-report print-report--register">
      <div className="print-toolbar no-print">
        <p className="print-tip">
          Tip cetak: <strong>Landscape</strong>, margin <strong>Minimum</strong>. Senarai panjang — biar
          skala 100%; nama panjang akan turun baris.
        </p>
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

      <table className="print-table print-table--register">
        <thead>
          <tr>
            <th className="col-bil">Bil</th>
            <th className="col-num">Nombor</th>
            <th className="col-co">Nama Syarikat</th>
            <th className="col-kt">Kaunter</th>
            <th className="col-time">Tarikh & Masa (MYT)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.draw_number}-${i}`}>
              <td className="col-bil">{i + 1}</td>
              <td className="col-num num">{r.draw_number}</td>
              <td className="col-co print-cell-wrap">{r.company_name}</td>
              <td className="col-kt">{r.counter_id}</td>
              <td className="col-time">{r.registered_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="print-empty">Tiada pendaftaran lagi.</p>}
    </div>
  );
}
