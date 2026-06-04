import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EventMeta } from "../api";
import { EVENT_META } from "../eventConfig";
import EventTitleBlock from "./EventTitleBlock";

type Props = {
  showNav?: boolean;
  actions?: ReactNode;
  pageRole?: string;
};

export default function PpdHeader({ showNav = true, actions, pageRole }: Props) {
  const [event, setEvent] = useState<EventMeta>(EVENT_META);

  useEffect(() => {
    fetch("/api/event")
      .then((r) => r.json())
      .then((data) => setEvent({ ...EVENT_META, ...data }))
      .catch(() => setEvent(EVENT_META));
  }, []);

  return (
    <header className="ppd-header ppd-header-lg">
      <div className="ppd-brand">
        <img
          src="/ppd-logo.png"
          alt="Logo PPD"
          className="ppd-logo ppd-logo-lg"
        />
        <EventTitleBlock event={event} pageRole={pageRole} large />
      </div>
      {(showNav || actions) && (
        <nav className="ppd-topnav">
          {showNav && (
            <>
              <Link to="/panduan">Panduan</Link>
              <Link to="/">Utama</Link>
            </>
          )}
          {actions}
        </nav>
      )}
    </header>
  );
}
