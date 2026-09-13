import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Board from './pages/Board.jsx';
import Outcomes from './pages/Outcomes.jsx';
import InstanceDetail from './pages/InstanceDetail.jsx';
import Operations from './pages/Operations.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Analyst from './pages/Analyst.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/board" element={<Board />} />
        <Route path="/outcomes" element={<Outcomes />} />
        <Route path="/instance/:id" element={<InstanceDetail />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/analyst" element={<Analyst />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
