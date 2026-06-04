import { EventMeta } from "../api";

type Props = {
  event: EventMeta;
  pageRole?: string;
  large?: boolean;
};

/** Tajuk rasmi — gaya sama seperti skrin paparan */
export default function EventTitleBlock({ event, pageRole, large = false }: Props) {
  return (
    <div className={`event-titles ${large ? "event-titles-lg" : ""}`}>
      <p className="event-headline">{event.headline}</p>
      <h1 className="event-subheadline">{event.subheadline}</h1>
      {event.tagline && <p className="event-tagline">{event.tagline}</p>}
      {pageRole && <p className="event-page-role">{pageRole}</p>}
    </div>
  );
}
