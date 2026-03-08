import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlanPage } from './pages/PlanPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlanPage />} />
        <Route path="/:weekDate" element={<PlanPage />} />
        <Route path="/:weekDate/:day" element={<PlanPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
