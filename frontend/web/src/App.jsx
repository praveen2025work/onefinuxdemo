import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Board from './pages/Board.jsx';
import Outcomes from './pages/Outcomes.jsx';
import InstanceDetail from './pages/InstanceDetail.jsx';
import InstanceWaiting from './pages/InstanceWaiting.jsx';
import Operations from './pages/Operations.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Configuration from './pages/Configuration.jsx';
import Monitoring from './pages/Monitoring.jsx';
import Reports from './pages/Reports.jsx';
import ReportDocument from './pages/ReportDocument.jsx';
import Drive from './pages/Drive.jsx';
import Lifecycle from './pages/Lifecycle.jsx';
import Notifications from './pages/Notifications.jsx';
import Product, { ArchitecturePage, GuidePage } from './pages/Product.jsx';
import { Loading } from './components/bits.jsx';
import { setFdc3Navigator } from './workspace/fdc3.js';
import SessionGate, { AuthCallback } from './auth/SessionGate.jsx';

// Heavier screens (Wijmo FlexChart / pivot, the multi-view container) load on first visit.
const Finance = lazy(() => import('./pages/Finance.jsx'));
const Desks = lazy(() => import('./pages/Desks.jsx'));
const WidgetPage = lazy(() => import('./pages/WidgetPage.jsx'));
const GridLibrary = lazy(() => import('./pages/GridLibrary.jsx'));
const OutcomeReport = lazy(() => import('./pages/OutcomeReport.jsx'));
const Usage = lazy(() => import('./pages/Usage.jsx'));
const Access = lazy(() => import('./pages/Access.jsx'));

/** Lets window.fdc3 open a route for a built-in intent (ViewInstance, ViewReport) in this document. */
function Fdc3Bridge() {
  const navigate = useNavigate();
  useEffect(() => { setFdc3Navigator(navigate); return () => setFdc3Navigator(null); }, [navigate]);
  return null;
}

export default function App() {
  const location = useLocation();
  if (location.pathname === '/auth/callback') return <AuthCallback />;
  return (
    <SessionGate>
    <Layout>
      <Fdc3Bridge />
      <Suspense fallback={<Loading what="Loading…" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product" element={<Product />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/lifecycle" element={<Lifecycle />} />
          <Route path="/board" element={<Board />} />
          <Route path="/outcomes" element={<Outcomes />} />
          <Route path="/workspaces" element={<Navigate to="/outcomes" replace />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/desks" element={<Desks />} />
          <Route path="/workspace" element={<Navigate to="/desks" replace />} />
          <Route path="/grids" element={<GridLibrary />} />
          <Route path="/widget/:appId" element={<WidgetPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:outcomeId" element={<OutcomeReport />} />
          <Route path="/reports/:outcomeId/:cobDate/:region" element={<ReportDocument />} />
          <Route path="/instance" element={<InstanceWaiting />} />
          <Route path="/instance/:id" element={<InstanceDetail />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/configuration" element={<Configuration />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/drive" element={<Drive />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/access" element={<Access />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
    </SessionGate>
  );
}
