import { useEffect } from "react";
import { useLiveState } from "../api";
import DisplayBranding from "../components/DisplayBranding";

export default function DisplayPage() {
  const state = useLiveState();

  useEffect(() => {
    document.body.classList.add("display-mode");
    return () => document.body.classList.remove("display-mode");
  }, []);

  if (!state) {
    return (
      <div className="display-screen">
        <DisplayBranding />
        <main className="display-main display-loading" aria-busy="true">
          <p>Memuatkan...</p>
        </main>
      </div>
    );
  }

  const { phase, project, winning_draw_number, winning_company, event } = state;

  if (phase === "idle" || !project) {
    return (
      <div className="display-screen display-idle">
        <DisplayBranding event={event} />
        <main className="display-main">
          <p className="display-idle-wait">Menunggu projek seterusnya...</p>
          {state.registration_count != null && (
            <p className="display-idle-stats">
              Pendaftaran: <strong>{state.registration_count}</strong>
              {state.total_companies != null && (
                <> · Senarai syarikat: {state.total_companies}</>
              )}
            </p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className={`display-screen display-live phase-${phase}`}>
      <DisplayBranding event={event} />
      <main className="display-main">
        <section className="display-card display-card-project">
          <p className="display-bil">Projek #{project.bil}</p>
          <p className="display-school">{project.school}</p>
          <p className="display-amount">{project.amount_display}</p>
          <h2 className="display-title">{project.title}</h2>
        </section>

        {phase === "project" && (
          <section className="display-card display-card-wait">
            <p className="display-wait-msg">Sila tunggu keputusan undian...</p>
          </section>
        )}

        {phase === "winner" && winning_draw_number && winning_company && (
          <section className="display-card display-card-winner reveal">
            <p className="display-winner-label">Nombor Undian</p>
            <p className="display-winner-number">{winning_draw_number}</p>
            <p className="display-winner-label">Syarikat Berjaya</p>
            <p className="display-winner-company">{winning_company.name}</p>
          </section>
        )}
      </main>
    </div>
  );
}
