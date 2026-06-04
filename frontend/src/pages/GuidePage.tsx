import { Link } from "react-router-dom";
import PpdHeader from "../components/PpdHeader";

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="guide-steps">
      {items.map((t, i) => (
        <li key={i}>
          <span className="step-num">{i + 1}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

export default function GuidePage() {
  return (
    <div className="page guide">
      <PpdHeader pageRole="Panduan Penggunaan" />

      <section className="guide-card">
        <h2>Pendaftaran (semua kaunter)</h2>
        <p className="guide-url">
          Buka <strong>satu</strong> halaman: <code>/daftar</code> — 4 kaunter boleh guna URL yang sama
        </p>
        <Steps
          items={[
            "Taip nama syarikat (min. 2 huruf) dalam kotak carian.",
            "Klik nama syarikat yang betul dalam senarai.",
            "Tekan butang hijau « Daftar & Dapatkan Nombor ».",
            "Tunjuk nombor besar (contoh 042) kepada syarikat — mereka TIDAK boleh daftar lagi.",
            "Tekan « Daftar Seterusnya » untuk syarikat berikutnya.",
          ]}
        />
        <p className="guide-warn">Jangan tutup halaman. Jika ralat « telah berdaftar », syarikat sudah ada nombor.</p>
        <Link className="btn primary" to="/daftar">
          Buka Pendaftaran
        </Link>
      </section>

      <section className="guide-card">
        <h2>Urusetia Undian (Admin)</h2>
        <p className="guide-url">Buka: <code>/admin</code></p>
        <Steps
          items={[
            "Masukkan PIN (diberi oleh ketua urusetia).",
            "Klik projek dalam senarai kiri (ikut nombor bil).",
            "Tekan « Tayar ke Skrin » — skrin awam tunjuk sekolah & peruntukan SAHAJA.",
            "Selepas undian fizikal di atas pentas, taip nombor 3 digit (contoh 042).",
            "Tekan « Umumkan Pemenang » dan SAHKAN dalam pop-up.",
            "Tekan « Projek Seterusnya » sebelum projek seterusnya.",
          ]}
        />
        <p className="guide-warn">Jangan tekan Reset Latihan pada hari rasmi.</p>
        <Link className="btn secondary" to="/admin">
          Buka Panel Admin
        </Link>
      </section>

      <section className="guide-card">
        <h2>Skrin Paparan & Siaran Langsung</h2>
        <p className="guide-url">Buka: <code>/display</code> (projektor + MCP guna URL SAMA)</p>
        <Steps
          items={[
            "Buka pelayar penuh skrin (F11).",
            "Tunggu — skrin sendiri berubah bila urusetia tekan butang.",
            "Fasa 1: hanya projek / sekolah / RM. Tiada nama syarikat.",
            "Fasa 2: nombor undian + nama syarikat muncul.",
          ]}
        />
        <Link className="btn accent" to="/display">
          Buka Skrin Paparan
        </Link>
      </section>

      <section className="guide-card guide-print">
        <h2>Penyelenggara IT</h2>
        <Steps
          items={[
            "Jalankan start_server.bat pada komputer pelayan.",
            "Semua orang guna http://ALAMAT-IP:8088/... (WiFi sama). Port 8088 elak konflik Acer.",
            "WiFi tidak stabil: komputer pelayan guna hotspot 4G; semua orang guna URL Cloudflare (display/admin/kaunter). Paparan disegarkan ~0.4 saat melalui terowong.",
            "Letak logo: frontend/public/ppd-logo.png kemudian npm run build.",
          ]}
        />
      </section>

      <p className="guide-print-hint">Tip: Tekan Ctrl+P untuk cetak panduan ini.</p>
    </div>
  );
}
