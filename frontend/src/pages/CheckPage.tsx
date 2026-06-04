import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CompanyInspectRow,
  ProjectRow,
  fetchStats,
  inspectCompanies,
  inspectProjects,
} from "../api";
import PpdHeader from "../components/PpdHeader";

type Tab = "companies" | "projects";

export default function CheckPage() {
  const [tab, setTab] = useState<Tab>("companies");
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<CompanyInspectRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [stats, setStats] = useState({ total_companies: 0, total_projects: 0 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "companies") {
        const q = query.trim();
        setCompanies(await inspectCompanies(q.length >= 2 ? q : "", 100));
      } else {
        setProjects(await inspectProjects(query.trim().length >= 1 ? query : ""));
      }
      fetchStats().then((s) =>
        setStats({
          total_companies: s.total_companies as number,
          total_projects: s.total_projects as number,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [tab, query]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="page-shell semak-page">
      <div className="page-full-header">
        <PpdHeader pageRole="Semak Data" showNav={false} />
      </div>

      <div className="semak-content">
        <p className="semak-intro">
          Semak nama syarikat dan maklumat projek sebelum / semasa hari acara.{" "}
          <Link to="/daftar">← Kembali ke Daftar</Link>
        </p>

        <div className="semak-tabs">
          <button
            type="button"
            className={tab === "companies" ? "on" : ""}
            onClick={() => setTab("companies")}
          >
            Syarikat ({stats.total_companies})
          </button>
          <button
            type="button"
            className={tab === "projects" ? "on" : ""}
            onClick={() => setTab("projects")}
          >
            Projek ({stats.total_projects})
          </button>
        </div>

        <input
          className="semak-search"
          type="search"
          placeholder={
            tab === "companies"
              ? "Cari nama / gred / negeri (kosong = senarai awal)..."
              : "Cari bil / kod sekolah / nama sekolah..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {loading && <p className="semak-loading">Memuatkan...</p>}

        {tab === "companies" && !loading && (
          <div className="semak-table-wrap">
            <table className="semak-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Nama syarikat</th>
                  <th>Gred</th>
                  <th>Negeri</th>
                  <th>Daerah</th>
                  <th>Sumber</th>
                  <th>Pendaftaran</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className={c.source === "manual" ? "manual" : ""}>
                    <td>{c.csv_no ?? "—"}</td>
                    <td className="name">{c.name}</td>
                    <td>{c.grade || "—"}</td>
                    <td>{c.state || "—"}</td>
                    <td>{c.district || "—"}</td>
                    <td>
                      <span className={`semak-badge ${c.source}`}>
                        {c.source === "manual" ? "Baru" : "Import"}
                      </span>
                    </td>
                    <td>
                      {c.registered ? (
                        <strong>
                          {c.draw_number}
                          {c.counter_id ? ` (K${c.counter_id})` : ""}
                        </strong>
                      ) : (
                        <span className="muted">Belum</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {companies.length === 0 && (
              <p className="semak-empty">Tiada rekod. Cuba kata kunci lain.</p>
            )}
          </div>
        )}

        {tab === "projects" && !loading && (
          <ul className="semak-proj-list">
            {projects.map((p) => (
              <li key={p.id} className={p.completed ? "done" : ""}>
                <div className="semak-proj-head">
                  <span className="bil">#{p.bil}</span>
                  <span className="kod">{p.kod_sekolah}</span>
                  {p.completed && <span className="semak-badge done">Selesai</span>}
                </div>
                <p className="school">{p.school}</p>
                <p className="amt">{p.amount_display}</p>
                <p className="title">{p.title}</p>
                {p.completed && (
                  <p className="result">
                    Keputusan: <strong>{p.result_number}</strong> — {p.result_company}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {tab === "projects" && !loading && projects.length === 0 && (
          <p className="semak-empty">Tiada projek dijumpai.</p>
        )}
      </div>
    </div>
  );
}
