import React from "react";

const API = "";

export interface EventMeta {
  org: string;
  headline: string;
  subheadline: string;
  tagline?: string;
}

export interface PublicState {
  phase: "idle" | "project" | "winner";
  event_complete?: boolean;
  event?: EventMeta;
  project: {
    id: number;
    bil: number;
    kod_sekolah: string;
    school: string;
    title: string;
    amount_display: string;
  } | null;
  reserve?: { slot: number; label: string } | null;
  winning_draw_number: string | null;
  winning_company: { id: number; name: string } | null;
  registration_count?: number;
  total_companies?: number;
  unlimited_numbers?: boolean;
}

export interface CompanyResult {
  id: number;
  name: string;
  registered: boolean;
  draw_number: string | null;
}

export interface CompanyInspectRow {
  id: number;
  csv_no: number | null;
  name: string;
  grade: string;
  state: string;
  district: string;
  registered: boolean;
  draw_number: string | null;
  counter_id: number | null;
  registered_at: string | null;
  source: "import" | "manual";
}

export interface ProjectRow {
  id: number;
  bil: number;
  kod_sekolah: string;
  school: string;
  title: string;
  amount_display: string;
  completed: boolean;
  result_number: string | null;
  result_company: string | null;
}

export interface ReserveRow {
  slot: number;
  label: string;
  completed: boolean;
  result_number: string | null;
  result_company: string | null;
}

export async function fetchStats() {
  const r = await fetch(`${API}/api/stats`);
  return r.json();
}

export async function listRegistrationsExport() {
  const r = await fetch(`${API}/api/registrations`);
  return r.json();
}

export async function fetchState(): Promise<PublicState> {
  const r = await fetch(`${API}/api/state`);
  return r.json();
}

export async function searchCompanies(q: string): Promise<CompanyResult[]> {
  const r = await fetch(`${API}/api/companies/search?q=${encodeURIComponent(q)}`);
  return r.json();
}

export async function createCompany(
  name: string,
  pin: string,
  extra?: { grade?: string; state?: string; district?: string }
) {
  const r = await fetch(`${API}/api/companies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, pin, ...extra }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Ralat");
  return data as { id: number; name: string; source: string; max_registrations?: number };
}

export async function inspectCompanies(
  q: string,
  limit = 80
): Promise<CompanyInspectRow[]> {
  const r = await fetch(
    `${API}/api/companies/inspect?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  return r.json();
}

export async function inspectProjects(q: string): Promise<ProjectRow[]> {
  const r = await fetch(`${API}/api/projects/inspect?q=${encodeURIComponent(q)}`);
  return r.json();
}

export async function deleteRegistration(drawNumber: string, pin: string) {
  const r = await fetch(`${API}/api/register/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draw_number: drawNumber, pin }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Ralat");
  return data;
}

export async function showWaitingScreen() {
  const r = await fetch(`${API}/api/draw/waiting`, { method: "POST" });
  const data = await r.json().catch(() => ({ detail: r.statusText }));
  if (!r.ok) throw new Error(data.detail || "Ralat");
  return data;
}

export async function registerCompany(companyId: number, counterId: number) {
  const r = await fetch(`${API}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_id: companyId, counter_id: counterId }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Ralat pendaftaran");
  return data;
}

export async function fetchProjects(): Promise<ProjectRow[]> {
  const r = await fetch(`${API}/api/projects`);
  return r.json();
}

export async function fetchReserves(): Promise<ReserveRow[]> {
  const r = await fetch(`${API}/api/reserves`);
  return r.json();
}

export async function revealReserve(slot: number) {
  const r = await fetch(`${API}/api/draw/reveal-reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slot }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Ralat");
  return data;
}

export async function revealProject(projectId: number) {
  const r = await fetch(`${API}/api/draw/reveal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Ralat");
  return data;
}

export async function submitWinner(drawNumber: string) {
  const r = await fetch(`${API}/api/draw/winner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draw_number: drawNumber }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Ralat");
  return data;
}

export async function nextProject() {
  const r = await fetch(`${API}/api/draw/next`, { method: "POST" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Ralat");
  return data;
}

export async function resetRehearsal(password: string) {
  const r = await fetch(`${API}/api/admin/reset-rehearsal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Ralat");
  return data;
}

export async function triggerBackup() {
  const r = await fetch(`${API}/api/admin/backup`, { method: "POST" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Ralat");
  return data;
}

export type LiveStateOptions = {
  /** Sandaran polling (ms). 0 = tiada poll berkala. */
  pollIntervalMs?: number;
  /** false = jangan guna SSE (terowong Cloudflare / ngrok). */
  useSse?: boolean;
};

/** Tetapan sync ikut cara pengguna buka laman (127 vs LAN vs terowong). */
export function liveSyncOptions(): LiveStateOptions {
  if (typeof window === "undefined") return {};
  const h = window.location.hostname.toLowerCase();
  const viaTunnel =
    h.endsWith(".trycloudflare.com") ||
    h.endsWith(".trycloudflare.com.") ||
    h.includes("ngrok") ||
    h.endsWith(".ngrok-free.app");
  if (viaTunnel) {
    return { pollIntervalMs: 400, useSse: false };
  }
  if (h === "127.0.0.1" || h === "localhost") {
    return {};
  }
  return { pollIntervalMs: 1500 };
}

export function useEventSource(
  onState: (s: PublicState) => void,
  options?: LiveStateOptions
) {
  const pollMs = options?.pollIntervalMs ?? 0;
  const useSse = options?.useSse !== false;

  React.useEffect(() => {
    let es: EventSource | null = null;
    let retry = 0;
    let pollId: ReturnType<typeof setInterval> | undefined;

    const refresh = () => {
      fetchState().then(onState).catch(() => {});
    };

    const connect = () => {
      es = new EventSource(`${API}/api/events/stream`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "state") onState(msg.data);
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        es?.close();
        const delay = Math.min(1000 * 2 ** retry, 10000);
        retry++;
        setTimeout(connect, delay);
      };
    };

    if (useSse) connect();
    refresh();

    if (pollMs > 0) {
      pollId = setInterval(refresh, pollMs);
    }

    return () => {
      es?.close();
      if (pollId) clearInterval(pollId);
    };
  }, [onState, pollMs, useSse]);
}

export function useLiveState(options?: LiveStateOptions) {
  const [state, setState] = React.useState<PublicState | null>(null);
  const onState = React.useCallback((s: PublicState) => setState(s), []);
  useEventSource(onState, options);
  return state;
}
