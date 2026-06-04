import { Link } from "react-router-dom";
import PpdHeader from "../components/PpdHeader";

const counters = [1, 2, 3, 4] as const;

const otherMenus = [
  {
    to: "/admin",
    title: "Urusetia Undian",
    desc: "Kawalan undian & nombor",
    className: "home-menu-admin",
  },
  {
    to: "/display",
    title: "Skrin Paparan",
    desc: "Projektor / siaran langsung",
    className: "home-menu-display",
  },
  {
    to: "/semak",
    title: "Semak Data",
    desc: "Semak syarikat & projek",
    className: "home-menu-check",
  },
  {
    to: "/panduan",
    title: "Panduan",
    desc: "Cara guna (boleh cetak)",
    className: "home-menu-guide",
  },
];

export default function HomePage() {
  return (
    <div className="page-shell home">
      <div className="page-full-header">
        <PpdHeader showNav={false} />
      </div>

      <div className="home-content">
        <h2 className="home-section-title">Pendaftaran — 4 Kaunter</h2>
        <p className="home-section-hint">Setiap kaunter guna halaman sendiri (bookmark berasingan).</p>
        <div className="home-counter-grid">
          {counters.map((n) => (
            <Link key={n} to={`/register/${n}`} className="home-menu-item home-menu-counter">
              <span className="home-menu-title">Kaunter {n}</span>
              <span className="home-menu-desc">Daftar syarikat</span>
            </Link>
          ))}
        </div>

        <div className="home-menu-grid home-menu-grid-secondary">
          {otherMenus.map((m) => (
            <Link key={m.to} to={m.to} className={`home-menu-item ${m.className}`}>
              <span className="home-menu-title">{m.title}</span>
              <span className="home-menu-desc">{m.desc}</span>
            </Link>
          ))}
        </div>

        <p className="home-hint">
          Contoh bookmark: <code>http://IP:PORT/register/1</code> … <code>/register/4</code>
        </p>
      </div>
    </div>
  );
}
