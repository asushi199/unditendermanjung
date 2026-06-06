import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PpdHeader from "../components/PpdHeader";
import {
  ProjectRow,
  ReserveRow,
  fetchProjects,
  fetchReserves,
  fetchStats,
  nextProject,
  resetRehearsal,
  revealProject,
  revealReserve,
  showWaitingScreen,
  submitWinner,
  triggerBackup,
  liveSyncOptions,
  useLiveState,
} from "../api";

export default function AdminPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [reserves, setReserves] = useState<ReserveRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedReserveSlot, setSelectedReserveSlot] = useState<number | null>(null);
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
        if (selectedReserveSlot !== null) return prev;
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list.find((p) => !p.completed)?.id ?? list[0]?.id ?? null;
      });
    });
    fetchReserves().then(setReserves);
    fetchStats().then(setStats);
  }, [selectedReserveSlot]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const selected = projects.find((p) => p.id === selectedId);
  const selectedReserve = reserves.find((r) => r.slot === selectedReserveSlot);
  const isOnDisplayProject =
    !!selected && liveState?.project?.id === selected.id;
  const isOnDisplayReserve =
    !!selectedReserve && liveState?.reserve?.slot === selectedReserve.slot;
  const isActiveProject =
    isOnDisplayProject &&
    !selected!.completed &&
    (liveState?.phase === "project" || liveState?.phase === "winner");
  const isActiveReserve =
    isOnDisplayReserve &&
    !selectedReserve!.completed &&
    (liveState?.phase === "project" || liveState?.phase === "winner");
  const isActiveDraw = isActiveProject || isActiveReserve;
  const awaitingConfirm = isActiveDraw && liveState?.phase === "winner";
  const inReserveMode = selectedReserveSlot !== null;
  const maxDrawN = (stats.registration_count as number) || 0;
  const maxDrawLen = maxDrawN > 0 ? String(maxDrawN).length : 3;

  function parseDrawValue(raw: string): number | null {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;
    const n = parseInt(digits, 10);
    if (Number.isNaN(n) || n < 1) return null;
    return n;
  }

  function canSubmitDraw(): boolean {
    const n = parseDrawValue(drawInput);
    if (n == null) return false;
    if (maxDrawN > 0 && n > maxDrawN) return false;
    return true;
  }

  function drawInputDisabled(isActive: boolean): boolean {
    return (
      busy ||
      !isActive ||
      (liveState?.phase === "winner" && !revising) ||
      (liveState?.phase !== "project" && liveState?.phase !== "winner")
    );
  }

  function showDrawSubmit(isActive: boolean): boolean {
    return (
      isActive &&
      (liveState?.phase === "project" ||
        (liveState?.phase === "winner" && revising))
    );
  }

  async function submitDraw() {
    if (submittingRef.current) return;
    const n = parseDrawValue(drawInput);
    if (n == null) {
      setError("Nombor undian tidak sah.");
      return;
    }
    if (maxDrawN > 0 && n > maxDrawN) {
      setError(`Nombor mesti antara 1 dan ${maxDrawN}.`);
      return;
    }
    const canPhase =
      liveState?.phase === "project" ||
      (liveState?.phase === "winner" && revising);
    if (!canPhase) return;

    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      await submitWinner(String(n));
      setRevising(false);
      setMessage(`Keputusan ${n} dipaparkan.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat");
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  }

  function handleDrawKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    void submitDraw();
  }

  function renderDrawEntry(isActive: boolean) {
    const rangeHint =
      maxDrawN > 0 ? `(1–${maxDrawN}, Enter atau Papar)` : "(Enter atau Papar)";
    return (
      <div className="admin-v2-draw">
        <label htmlFor="dn">Nombor undian {rangeHint}</label>
        <div className="admin-v2-draw-row">
          <input
            id="dn"
            className="admin-v2-num"
            inputMode="numeric"
            maxLength={maxDrawLen}
            placeholder="1"
            value={drawInput}
            autoFocus
            disabled={drawInputDisabled(isActive)}
            onChange={(e) => {
              setDrawInput(e.target.value.replace(/\D/g, "").slice(0, maxDrawLen));
              setError("");
            }}
            onKeyDown={handleDrawKeyDown}
          />
          {showDrawSubmit(isActive) && (
            <button
              type="button"
              className="btn primary admin-v2-draw-submit"
              onClick={() => void submitDraw()}
              disabled={busy || !canSubmitDraw()}
            >
              Papar
            </button>
          )}
        </div>
        {awaitingConfirm && !revising && liveState?.winning_company && (
          <p className="admin-v2-winner-name">{liveState.winning_company.name}</p>
        )}
        {awaitingConfirm && !revising && (
          <p className="admin-v2-done-hint">
            Keputusan dipapar. Tekan «Kemaskini» jika silap
            {inReserveMode ? ", atau «Simpanan Seterusnya»." : ", atau «Projek Seterusnya»."}
          </p>
        )}
        {revising && (
          <p className="admin-v2-revise-hint">
            Masukkan nombor betul, kemudian Enter atau «Papar».
          </p>
        )}
      </div>
    );
  }

  async function selectAndProject(p: ProjectRow) {
    setSelectedReserveSlot(null);
    setSelectedId(p.id);
    setDrawInput("");
    setError("");
    setRevising(false);
    setBusy(true);
    try {
      await revealProject(p.id);
      setMessage(
        p.completed
          ? `Projek #${p.bil} ditayar semula (keputusan).`
          : `Projek #${p.bil} ditayar ke skrin.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat");
    } finally {
      setBusy(false);
    }
  }

  async function selectAndReserve(r: ReserveRow) {
    setSelectedId(null);
    setSelectedReserveSlot(r.slot);
    setDrawInput("");
    setError("");
    setRevising(false);
    setBusy(true);
    try {
      await revealReserve(r.slot);
      setMessage(
        r.completed
          ? `${r.label} ditayar semula (keputusan).`
          : `${r.label} ditayar ke skrin.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (liveState?.phase !== "winner") {
      setRevising(false);
    }
  }, [liveState?.phase]);

  async function handleNext() {
    const wasReserve = inReserveMode;
    setBusy(true);
    setError("");
    try {
      await nextProject();
      const list = await fetchProjects();
      const reserveList = await fetchReserves();
      setProjects(list);
      setReserves(reserveList);
      setDrawInput("");
      if (wasReserve) {
        const nxt = reserveList.find((r) => !r.completed);
        if (nxt) {
          setSelectedReserveSlot(nxt.slot);
          setSelectedId(null);
          await revealReserve(nxt.slot);
          setMessage(`${nxt.label} ditayar. Masukkan nombor undian.`);
        } else {
          setMessage("Semua simpanan selesai.");
        }
      } else {
        const nxt = list.find((p) => !p.completed);
        if (nxt) {
          setSelectedId(nxt.id);
          setSelectedReserveSlot(null);
          await revealProject(nxt.id);
          setMessage(`Projek #${nxt.bil} ditayar. Masukkan nombor undian.`);
        } else {
          const firstReserve = reserveList.find((r) => !r.completed);
          if (firstReserve) {
            setSelectedReserveSlot(firstReserve.slot);
            setSelectedId(null);
            await revealReserve(firstReserve.slot);
            setMessage(
              `Semua projek selesai. ${firstReserve.label} ditayar — mula undian simpanan.`
            );
          } else {
            setMessage("Semua projek selesai.");
          }
        }
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
      const s = await fetchStats();
      const allDone =
        s.projects_completed === s.total_projects &&
        s.reserves_completed === s.total_reserves;
      setMessage(allDone ? "Skrin paparan: undian tamat." : "Skrin paparan: menunggu.");
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
          Simpanan <b>{stats.reserves_completed as number}</b>/{stats.total_reserves as number}
        </span>
        {liveState?.event_complete && (
          <span className="admin-v2-bar-done">Undian tamat</span>
        )}
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
          <h3 className="admin-v2-list-reserve-h">Syarikat Simpanan — klik untuk tayar</h3>
          <ul>
            {reserves.map((r) => (
              <li key={r.slot}>
                <button
                  type="button"
                  className={`admin-v2-proj reserve ${selectedReserveSlot === r.slot ? "on" : ""} ${r.completed ? "done" : ""}`}
                  onClick={() => selectAndReserve(r)}
                  disabled={busy}
                >
                  <span className="n">#{r.slot}</span>
                  <span className="s">{r.label}</span>
                  {r.completed && (
                    <span className="r">
                      {r.result_number} {r.result_company}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="admin-v2-work">
          {selectedReserve ? (
            <>
              <div className="admin-v2-proj-info">
                <h2>{selectedReserve.label}</h2>
              </div>

              {selectedReserve.completed ? (
                <div className="admin-v2-completed">
                  <p className="lbl">Keputusan (disahkan)</p>
                  <p className="num">{selectedReserve.result_number}</p>
                  <p className="co">{selectedReserve.result_company}</p>
                </div>
              ) : (
                <>
                  {renderDrawEntry(isActiveReserve)}

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
                        Simpanan Seterusnya → tayar simpanan seterusnya
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : selected ? (
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
              {renderDrawEntry(isActiveProject)}

              {isActiveProject && awaitingConfirm && (
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
            <p className="admin-v2-empty">Pilih projek atau simpanan di kiri.</p>
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
