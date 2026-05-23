import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Ideas } from "./pages/Ideas";
import { IdeaDetail } from "./pages/IdeaDetail";
import { Dates } from "./pages/Dates";
import { DateFinder } from "./pages/DateFinder";
import { PreferencesPage } from "./pages/PreferencesPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="ideas" element={<Ideas />} />
        <Route path="ideas/:id" element={<IdeaDetail />} />
        <Route path="dates" element={<Dates />} />
        <Route path="finder" element={<DateFinder />} />
        <Route path="preferences" element={<PreferencesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
