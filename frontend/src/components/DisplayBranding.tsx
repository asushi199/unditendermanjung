import { EventMeta } from "../api";
import { EVENT_META } from "../eventConfig";
import EventTitleBlock from "./EventTitleBlock";

type Props = {
  event?: EventMeta | null;
};

export default function DisplayBranding({ event: eventProp }: Props) {
  const event = eventProp ? { ...EVENT_META, ...eventProp } : EVENT_META;

  return (
    <header className="display-branding">
      <div className="display-branding-inner">
        <img
          src="/ppd-logo.png"
          alt="Logo Pejabat Pendidikan Daerah"
          className="display-branding-logo"
        />
        <EventTitleBlock event={event} large />
      </div>
    </header>
  );
}
