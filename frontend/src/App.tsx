import { Navigate, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import DisplayPage from "./pages/DisplayPage";
import GuidePage from "./pages/GuidePage";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import DaftarLandingPage from "./pages/DaftarLandingPage";
import CheckPage from "./pages/CheckPage";
import PrintRegistrationsPage from "./pages/PrintRegistrationsPage";
import PrintResultsPage from "./pages/PrintResultsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/panduan" element={<GuidePage />} />
      <Route path="/daftar" element={<DaftarLandingPage />} />
      <Route path="/semak" element={<CheckPage />} />
      <Route path="/register/:counterId" element={<RegisterPage />} />
      <Route path="/cetak/pendaftaran" element={<PrintRegistrationsPage />} />
      <Route path="/cetak/keputusan" element={<PrintResultsPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/display" element={<DisplayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
