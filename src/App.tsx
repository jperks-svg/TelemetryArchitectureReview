import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DiscoveryPage from './pages/DiscoveryPage';
import SnapshotPage from './pages/SnapshotPage';
import RisksPage from './pages/RisksPage';
import RecommendationsPage from './pages/RecommendationsPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import MaturityPage from './pages/MaturityPage';
import DeliverablesPage from './pages/DeliverablesPage';
import type { ArchitectureSnapshot } from './types';

function App() {
  const [snapshot, setSnapshot] = useState<ArchitectureSnapshot | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DiscoveryPage onDiscoveryComplete={setSnapshot} existingSnapshot={snapshot} />} />
          <Route path="snapshot" element={<SnapshotPage snapshot={snapshot} />} />
          <Route path="risks" element={<RisksPage snapshot={snapshot} />} />
          <Route path="recommendations" element={<RecommendationsPage snapshot={snapshot} />} />
          <Route path="opportunities" element={<OpportunitiesPage snapshot={snapshot} />} />
          <Route path="maturity" element={<MaturityPage snapshot={snapshot} />} />
          <Route path="deliverables" element={<DeliverablesPage snapshot={snapshot} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
