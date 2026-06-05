import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchProjects, fetchReserves, ProjectRow, ReserveRow } from "../api";

export default function PrintResultsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [reserves, setReserves] = useState<ReserveRow[]>([]);
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("cetak") === "1";

  useEffect(() => {
    document.body.classList.add("print-landscape");
    fetchProjects().then(setProjects);
    fetchReserves().then(setReserves);
    return () => document.body.classList.remove("print-landscape");
  }, []);

  useEffect(() => {
    if (autoPrint && projects.some((p) => p.completed)) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint, projects]);

  const done = projects.filter((p) => p.completed);
  const reservesDone = reserves.filter((r) => r.completed);

  return (
    <div className="print-report print-report--results">
      <div className="print-toolbar no-print">
        <p className="print-tip">
          Tip cetak: pilih <strong>Landscape (Lanskap)</strong>, margin <strong>Minimum</strong>, dan
          skala <strong>100%</strong>. Nama syarikat panjang akan turun baris secara automatik.
        </p>
        <button type="button" className="btn primary" onClick={() => window.print()}>
          Cetak / Simpan PDF
        </button>
        <a className="btn secondary" href="/api/draw-results/export" download>
          Muat turun CSV
        </a>
        <Link className="btn secondary" to="/admin">
          Kembali
        </Link>
      </div>

      <header className="print-header">
        <h1>Keputusan Undian Projek</h1>
        <p className="print-meta">
          Kerja Undi Bilangan 1 Tahun 2026 · Dicetak: {new Date().toLocaleString("ms-MY")}
        </p>
        <p className="print-meta">
          Selesai: <strong>{done.length}</strong> / {projects.length} projek
        </p>
      </header>

      <table className="print-table print-table--results">
        <thead>
          <tr>
            <th className="col-bil">Bil</th>
            <th className="col-kod">Kod</th>
            <th className="col-school">Sekolah</th>
            <th className="col-amt">Peruntukan</th>
            <th className="col-num">Nombor</th>
            <th className="col-co">Syarikat Berjaya</th>
          </tr>
        </thead>
        <tbody>
          {done.map((p) => (
            <tr key={p.id}>
              <td className="col-bil">{p.bil}</td>
              <td className="col-kod">{p.kod_sekolah}</td>
              <td className="col-school print-cell-wrap">{p.school}</td>
              <td className="col-amt">{p.amount_display}</td>
              <td className="col-num num">{p.result_number}</td>
              <td className="col-co print-cell-wrap">{p.result_company ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {done.length === 0 && <p className="print-empty">Tiada keputusan direkodkan lagi.</p>}

      {reservesDone.length > 0 && (
        <>
          <header className="print-header print-header--sub">
            <h2>Syarikat Simpanan</h2>
            <p className="print-meta">
              Selesai: <strong>{reservesDone.length}</strong> / {reserves.length}
            </p>
          </header>
          <table className="print-table print-table--results">
            <thead>
              <tr>
                <th className="col-bil">Simpanan</th>
                <th className="col-school">Label</th>
                <th className="col-num">Nombor</th>
                <th className="col-co">Syarikat</th>
              </tr>
            </thead>
            <tbody>
              {reservesDone.map((r) => (
                <tr key={r.slot}>
                  <td className="col-bil">{r.slot}</td>
                  <td className="col-school print-cell-wrap">{r.label}</td>
                  <td className="col-num num">{r.result_number}</td>
                  <td className="col-co print-cell-wrap">{r.result_company ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
