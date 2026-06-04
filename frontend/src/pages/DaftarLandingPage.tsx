import { Link } from "react-router-dom";
import PpdHeader from "../components/PpdHeader";

export default function DaftarLandingPage() {
  return (
    <div className="page-shell home">
      <div className="page-full-header">
        <PpdHeader pageRole="Pilih Kaunter" showNav={false} />
      </div>
      <div className="home-content">
        <p className="home-section-hint">Sila pilih kaunter anda:</p>
        <div className="home-counter-grid">
          {[1, 2, 3, 4].map((n) => (
            <Link key={n} to={`/register/${n}`} className="home-menu-item home-menu-counter">
              <span className="home-menu-title">Kaunter {n}</span>
            </Link>
          ))}
        </div>
        <p className="home-hint">
          <Link to="/">← Utama</Link>
        </p>
      </div>
    </div>
  );
}
