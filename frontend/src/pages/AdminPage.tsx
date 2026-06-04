import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PpdHeader from "../components/PpdHeader";
import {
  ProjectRow,
  fetchProjects,
  fetchStats,
  nextProject,
  resetRehearsal,
  revealProject,
  showWaitingScreen,
  submitWinner,
  triggerBackup,
  liveSyncOptions,
  useLiveState,
} from "../api";

export default function AdminPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawInput, setDrawInput] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<Record<string, number | string | null>>({});
  const [busy, setBusy] = useState(false);
  const [revising, setRevising] = useState(false);
  const [resetPwd, setResetPwd] = useState("");
  const liveState = useLiveState(liveSyncOptions());
  const submittingRef = useRef(false);

  const load = useCallback(() => {
    fetchProjects().then((list) => {
      setProjects(list);
      setSelectedId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list.find((p) => !p.completed)?.id ?? list[0]?.id ?? null;
      });
    });
    fetchStats().then(setStats);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const selected = projects.find((p) => p.id === selectedId);
  const isActiveProject =
    !!selected && !selected.completed && liveState?.project?.id === selected.id;
  const awaitingConfirm = isActiveProject && liveState?.phase === "winner";

  async function selectAndProject(p: ProjectRow) {
    setSelectedId(p.id);
    setDrawInput("");
    setError("");
    setRevising(false);
    if (p.completed) {
      setMessage("Projek ini telah selesai.");
      return;
    }
    setBusy(true);
    try {
      await revealProject(p.id);
      setMessage(`Projek #${p.bil} ditayar ke skrin.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat");
    } finally {
      setBusy(false);
    }
  }

  async function submitNumber(num: string) {
    if (num.length !== 3 || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      await submitWinner(num);
      setRevising(false);
      setMessage(`Keputusan ${num.padStart(3, "0")} dipaparkan.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat");
      setDrawInput("");
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  }

  useEffect(() => {
    if (liveState?.phase !== "winner") {
      setRevising(false);
    }
  }, [liveState?.phase]);

  useEffect(() => {
    const digits = drawInput.replace(/\D/g, "");
    if (!digits) return;
    const n = parseInt(digits, 10);
    if (n < 1) return;
    if (n < 1000 && digits.length < 3) return;
    const formatted = n < 1000 ? digits.padStart(3, "0") : String(n);
    if (liveState?.phase === "project") {
      submitNumber(formatted);
    } else if (liveState?.phase === "winner" && revising) {
      submitNumber(formatted);
    }
  }, [drawInput, liveState?.phase, revising]);

  async function handleNext() {
    setBusy(true);
    setError("");
    try {
      await nextProject();
      const list = await fetchProjects();
      setProjects(list);
      const nxt = list.find((p) => !p.completed);
      setDrawInput("");
      if (nxt) {
        setSelectedId(nxt.id);
        await revealProject(nxt.id);
        setMessage(`Projek #${nxt.bil} ditayar. Masukkan nombor undian.`);
      } else {
        setMessage("Semua projek selesai.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat");
    } finally {
      setBusy(false);
      load();
    }
  }

  async function handleWaiting() {
    setBusy(true);
    setError("");
    try {
      await showWaitingScreen();
      setMessage("Skrin paparan: menunggu.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell admin-v2-page">
      <div className="page-full-header">
        <PpdHeader pageRole="Panel Urusetia" showNav={false} />
      </div>

      <div className="admin-v2">
      <div className="admin-v2-bar">
        <span>
          Daftar <b>{stats.registration_count as number}</b>
          {stats.total_companies != null && <> · Senarai <b>{stats.total_companies as number}</b></>}
        </span>
        <span>
          Projek <b>{stats.projects_completed as number}</b>/{stats.total_projects as number}
        </span>
        <span>
          Skrin: <b>{liveState?.phase ?? "idle"}</b>
        </span>
        <div className="admin-v2-bar-btns">
          <button type="button" className="btn secondary" onClick={handleWaiting} disabled={busy}>
            Skrin Menunggu
          </button>
          <Link className="btn accent" to="/display" target="_blank">
            Paparan
          </Link>
          <Link className="btn secondary" to="/">
            Utama
          </Link>
        </div>
      </div>

      {message && <div className="admin-v2-msg ok">{message}</div>}
      {error && <div className="admin-v2-msg err">{error}</div>}

      <div className="admin-v2-body">
        <aside className="admin-v2-list">
          <h3>Projek — klik untuk tayar</h3>
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`admin-v2-proj ${selectedId === p.id ? "on" : ""} ${p.completed ? "done" : ""}`}
                  onClick={() => selectAndProject(p)}
                  disabled={busy}
                >
                  <span className="n">#{p.bil}</span>
                  <span className="s">{p.school}</span>
                  {p.completed && (
                    <span className="r">
                      {p.result_number} {p.result_company}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="admin-v2-work">
          {selected ? (
            <>
              <div className="admin-v2-proj-info">
                <h2>
                  #{selected.bil} — {selected.school}
                </h2>
                <p className="amt">{selected.amount_display}</p>
                <p className="ttl">{selected.title}</p>
              </div>

              {selected.completed ? (
                <div className="admin-v2-completed">
                  <p className="lbl">Keputusan (disahkan)</p>
                  <p className="num">{selected.result_number}</p>
                  <p className="co">{selected.result_company}</p>
                </div>
              ) : (
                <>
              <div className="admin-v2-draw">
                <label htmlFor="dn">Nombor undian (auto papar bila lengkap)</label>
                <input
                  id="dn"
                  className="admin-v2-num"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="001"
                  value={drawInput}
                  autoFocus
                  disabled={
                    busy ||
                    !isActiveProject ||
                    (liveState?.phase === "winner" && !revising) ||
                    (liveState?.phase !== "project" && liveState?.phase !== "winner")
                  }
                  onChange={(e) => setDrawInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                {awaitingConfirm && !revising && liveState?.winning_company && (
                  <p className="admin-v2-winner-name">{liveState.winning_company.name}</p>
                )}
                {awaitingConfirm && !revising && (
                  <p className="admin-v2-done-hint">
                    Keputusan dipapar. Tekan «Kemaskini» jika silap, atau «Projek Seterusnya».
                  </p>
                )}
                {revising && (
                  <p className="admin-v2-revise-hint">Masukkan nombor betul (3 digit, auto papar).</p>
                )}
              </div>

              {awaitingConfirm && (
              <div className="admin-v2-actions">
                {!revising && (
                  <button
                    type="button"
                    className="btn secondary large"
                    onClick={() => {
                      setRevising(true);
                      setDrawInput("");
                      setError("");
                      setMessage("");
                    }}
                    disabled={busy}
                  >
                    Kemaskini
                  </button>
                )}
                {revising && (
                  <button
                    type="button"
                    className="btn secondary large"
                    onClick={() => {
                      setRevising(false);
                      setDrawInput(liveState?.winning_draw_number ?? "");
                      setError("");
                    }}
                    disabled={busy}
                  >
                    Batal
                  </button>
                )}
                <button
                  className="btn primary large admin-v2-next"
                  onClick={handleNext}
                  disabled={busy || revising}
                >
                  Projek Seterusnya → tayar projek seterusnya
                </button>
              </div>
              )}
                </>
              )}
            </>
          ) : (
            <p className="admin-v2-empty">Pilih projek di kiri.</p>
          )}

          <details className="admin-v2-tools">
            <summary>Utiliti</summary>
            <div className="admin-v2-tools-panel">
              <section className="admin-v2-tools-section">
                <h4 className="admin-v2-tools-heading">Eksport &amp; cetak</h4>
                <div className="admin-v2-tools-grid">
                  <a className="btn secondary" href="/api/registrations/export" download>
                    Eksport Daftar CSV
                  </a>
                  <Link className="btn secondary" to="/cetak/pendaftaran?cetak=1" target="_blank">
                    Cetak Pendaftaran (PDF)
                  </Link>
                  <a className="btn secondary" href="/api/draw-results/export" download>
                    Eksport Keputusan CSV
                  </a>
                  <Link className="btn secondary" to="/cetak/keputusan?cetak=1" target="_blank">
                    Cetak Keputusan (PDF)
                  </Link>
                </div>
              </section>
              <section className="admin-v2-tools-section">
                <h4 className="admin-v2-tools-heading">Penyelenggaraan</h4>
                <button
                  type="button"
                  className="btn secondary admin-v2-tools-single"
                  onClick={async () => {
                    try {
                      const r = await triggerBackup();
                      setMessage(`Sandaran: ${r.path}`);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Ralat");
                    }
                  }}
                >
                  Sandaran DB
                </button>
              </section>
              <section className="admin-v2-tools-danger">
                <h4 className="admin-v2-tools-heading">Reset latihan</h4>
                <p className="admin-v2-tools-hint">
                  Padam semua pendaftaran dan keputusan. Hanya untuk latihan — jangan guna pada hari rasmi.
                </p>
                <div className="admin-v2-tools-danger-row">
                  <input
                    type="password"
                    className="admin-v2-tools-pwd"
                    placeholder="Kata laluan"
                    value={resetPwd}
                    onChange={(e) => setResetPwd(e.target.value)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="btn danger"
                    disabled={!resetPwd}
                    onClick={async () => {
                      if (!confirm("Reset latihan? Semua pendaftaran & keputusan akan dipadam.")) return;
                      try {
                        await resetRehearsal(resetPwd);
                        setResetPwd("");
                        load();
                        setMessage("Reset selesai.");
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Ralat");
                      }
                    }}
                  >
                    Reset Latihan
                  </button>
                </div>
              </section>
            </div>
          </details>
        </main>
      </div>
      </div>
    </div>
  );
}
