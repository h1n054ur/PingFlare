import { Routes, Route } from "react-router-dom";
import StatusPage from "./pages/StatusPage";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./pages/AdminLayout";
import AdminOverview from "./pages/admin/Overview";
import AdminMonitors from "./pages/admin/Monitors";
import AdminComponents from "./pages/admin/Components";
import AdminIncidents from "./pages/admin/Incidents";
import AdminMaintenance from "./pages/admin/Maintenance";
import AdminSubscribers from "./pages/admin/Subscribers";
import AdminNotifications from "./pages/admin/Notifications";
import AdminSettings from "./pages/admin/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StatusPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="monitors" element={<AdminMonitors />} />
        <Route path="components" element={<AdminComponents />} />
        <Route path="incidents" element={<AdminIncidents />} />
        <Route path="maintenance" element={<AdminMaintenance />} />
        <Route path="subscribers" element={<AdminSubscribers />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
