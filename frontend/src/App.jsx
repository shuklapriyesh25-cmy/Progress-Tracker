import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RoadmapPage from './pages/RoadmapPage';
import PWPPage from './pages/PWPPage';
import DailyTaskPage from './pages/DailyTaskPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<RoadmapPage />} />
          <Route path="pwp" element={<PWPPage />} />
          <Route path="daily" element={<DailyTaskPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
