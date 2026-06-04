import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchProjects, ProjectRow } from "../api";

export default function PrintResultsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("cetak") === "1";

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (autoPrint && projects.some((p) => p.completed)) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint, projects]);

  const done = projects.filter((p) => p.completed);

  return (
    <div className="print-report">
      <div className="print-toolbar no-print">
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

      <table className="print-table">
        <thead>
          <tr>
            <th>Bil</th>
            <th>Kod</th>
            <th>Sekolah</th>
            <th>Peruntukan</th>
            <th>Nombor</th>
            <th>Syarikat Berjaya</th>
          </tr>
        </thead>
        <tbody>
          {done.map((p) => (
            <tr key={p.id}>
              <td>{p.bil}</td>
              <td>{p.kod_sekolah}</td>
              <td>{p.school}</td>
              <td>{p.amount_display}</td>
              <td className="num">{p.result_number}</td>
              <td>{p.result_company}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {done.length === 0 && <p className="print-empty">Tiada keputusan direkodkan lagi.</p>}
    </div>
  );
}
