import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Board from './pages/Board.jsx';
import Outcomes from './pages/Outcomes.jsx';
import InstanceDetail from './pages/InstanceDetail.jsx';
import Operations from './pages/Operations.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Configuration from './pages/Configuration.jsx';
import Monitoring from './pages/Monitoring.jsx';
import Reports from './pages/Reports.jsx';
import ReportDocument from './pages/ReportDocument.jsx';
import Drive from './pages/Drive.jsx';
import Lifecycle from './pages/Lifecycle.jsx';
import Workspaces from './pages/Workspaces.jsx';
import Product, { ArchitecturePage, GuidePage } from './pages/Product.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<Product />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/lifecycle" element={<Lifecycle />} />
        <Route path="/board" element={<Board />} />
        <Route path="/outcomes" element={<Outcomes />} />
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/:outcomeId/:cobDate/:region" element={<ReportDocument />} />
        <Route path="/instance/:id" element={<InstanceDetail />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/configuration" element={<Configuration />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/drive" element={<Drive />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
