import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewAudit from './pages/NewAudit';
import AuditReport from './pages/AuditReport';
import MapView from './pages/MapView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/nouveau" element={<NewAudit />} />
          <Route path="/audit/:id" element={<AuditReport />} />
          <Route path="/carte" element={<MapView />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
