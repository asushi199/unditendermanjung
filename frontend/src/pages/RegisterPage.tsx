import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CompanyResult,
  createCompany,
  deleteRegistration,
  fetchStats,
  registerCompany,
  searchCompanies,
} from "../api";
import PpdHeader from "../components/PpdHeader";

export default function RegisterPage() {
  const { counterId } = useParams();
  const counter = counterId
    ? Math.min(4, Math.max(1, parseInt(counterId, 10) || 1))
    : 1;
  const sharedCounter = !counterId;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [selected, setSelected] = useState<CompanyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    draw_number: string;
    company_name: string;
  } | null>(null);
  const [stats, setStats] = useState({ registration_count: 0, total_companies: 0 });
  const [deleteNum, setDeleteNum] = useState("");
  const [deletePin, setDeletePin] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newMsg, setNewMsg] = useState("");

  const refreshStats = useCallback(() => {
    fetchStats().then(setStats);
  }, []);

  useEffect(() => {
    refreshStats();
    const t = setInterval(refreshStats, 5000);
    return () => clearInterval(t);
  }, [refreshStats]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchCompanies(query).then(setResults);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function handleRegister() {
    if (!selected || selected.registered) return;
    setLoading(true);
    setError("");
    setSuccess(null);
    try {
      const res = await registerCompany(selected.id, counter);
      setSuccess({ draw_number: res.draw_number, company_name: res.company_name });
      setSelected(null);
      setQuery("");
      setResults([]);
      refreshStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCompany() {
    if (!newName.trim() || !newPin) return;
    setNewMsg("");
    setError("");
    setLoading(true);
    try {
      const created = await createCompany(newName.trim(), newPin);
      setNewMsg(`Syarikat ditambah: ${created.name}. Boleh daftar sekarang.`);
      refreshStats();
      setNewName("");
      setNewPin("");
      const item: CompanyResult = {
        id: created.id,
        name: created.name,
        registered: false,
        draw_number: null,
      };
      setSelected(item);
      setQuery(created.name);
      setResults([item]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteNum.trim() || !deletePin) return;
    setDeleteMsg("");
    setError("");
    setLoading(true);
    try {
      const r = await deleteRegistration(deleteNum, deletePin);
      setDeleteMsg(
        `Dipadam: ${r.draw_number} (${r.company_name}).${
          r.number_reused ? " Nombor boleh daftar semula." : ""
        }`
      );
      setDeleteNum("");
      refreshStats();
      if (query.trim().length >= 2) searchCompanies(query).then(setResults);
    } catch (e) {
      setDeleteMsg("");
      setError(e instanceof Error ? e.message : "Ralat padam");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell register-page">
      <div className="page-full-header">
        <PpdHeader
          pageRole={sharedCounter ? "Pendaftaran Syarikat" : `Pendaftaran — Kaunter ${counter}`}
          showNav={false}
        />
      </div>

      <div className="register-v2">
      <p className="register-v2-stats">
        Kaunter <strong>{counter}</strong> · Berdaftar: <strong>{stats.registration_count}</strong>
        {stats.total_companies != null && stats.total_companies > 0 && (
          <> · Senarai syarikat: {stats.total_companies}</>
        )}
        {" · "}
        <Link to="/">Kaunter lain</Link>
        {" · "}
        <Link to="/semak">Semak data</Link>
      </p>

      {sharedCounter && (
        <div className="register-v2-pick-counter">
          <p>Pilih kaunter:</p>
          <div className="home-counter-row">
            {[1, 2, 3, 4].map((n) => (
              <Link key={n} to={`/register/${n}`}>
                Kaunter {n}
              </Link>
            ))}
          </div>
        </div>
      )}

      {success && (
        <div className="register-v2-success">
          <p className="lbl">Nombor Undian</p>
          <p className="num">{success.draw_number}</p>
          <p className="co">{success.company_name}</p>
          <button className="btn primary large" onClick={() => setSuccess(null)}>
            Daftar Seterusnya
          </button>
        </div>
      )}

      {!success && !sharedCounter && (
        <div className="register-v2-main">
          <label>Cari nama syarikat</label>
          <input
            className="register-v2-search"
            type="search"
            placeholder="Min. 2 huruf..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />

          {results.length > 0 && (
            <ul className="register-v2-results">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={selected?.id === c.id ? "on" : ""}
                    disabled={c.registered}
                    onClick={() => !c.registered && setSelected(c)}
                  >
                    {c.name}
                    {c.registered && <em> — {c.draw_number}</em>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <div className="register-v2-confirm">
              <p>{selected.name}</p>
              <button className="btn primary large" onClick={handleRegister} disabled={loading}>
                {loading ? "..." : "Daftar & Dapatkan Nombor"}
              </button>
            </div>
          )}

          {error && <p className="register-v2-err">{error}</p>}
        </div>
      )}

      <details className="register-v2-new">
        <summary>Daftar syarikat baru (tambah ke senarai)</summary>
        <p className="hint">
          Untuk syarikat tambahan yang tiada dalam senarai asal. Perlu PIN penyelia.
          Syarikat baharu boleh didaftarkan dengan nombor undian seterusnya (tiada had kuota).
        </p>
        <input
          type="text"
          placeholder="Nama syarikat penuh"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          type="password"
          placeholder="PIN penyelia"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
        />
        <button
          type="button"
          className="btn secondary"
          onClick={handleAddCompany}
          disabled={loading || newName.trim().length < 3 || !newPin}
        >
          Tambah syarikat
        </button>
        {newMsg && <p className="register-v2-ok">{newMsg}</p>}
      </details>

      <section className="register-v2-delete">
        <h3>Padam pendaftaran silap</h3>
        <p className="hint">Perlu PIN penyelia. Hanya nombor terakhir boleh guna semula.</p>
        <div className="register-v2-delete-row">
          <input
            placeholder="Nombor (cth 042)"
            value={deleteNum}
            onChange={(e) => setDeleteNum(e.target.value.replace(/\D/g, ""))}
          />
          <input
            type="password"
            placeholder="PIN"
            value={deletePin}
            onChange={(e) => setDeletePin(e.target.value)}
          />
          <button type="button" className="btn danger" onClick={handleDelete} disabled={loading}>
            Padam
          </button>
        </div>
        {deleteMsg && <p className="register-v2-ok">{deleteMsg}</p>}
      </section>
      </div>
    </div>
  );
}
