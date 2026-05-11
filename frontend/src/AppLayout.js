import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Sidebar    from './components/layout/Sidebar';
import LangToggle from './components/layout/LangToggle';

import LoginScreen  from './pages/LoginScreen';
import UsersPage    from './pages/UsersPage';

// ── Pages du module Lawyer (à importer selon ton projet) ──
import LawyerDashboard from './pages/Lawyerdashboard';
import CaseDetail      from './pages/Casedetail';
import CreateCase      from './pages/Createcase';
import DocumentsPage   from './pages/Documentspage';

import api from './services/api';
import { MOCK_CASES } from './constants/mockData';
import { useLang } from './context/LangContext';
import DocumentChat from './components/DocumentAI/DocumentChat';
import AiDocumentPage from './components/DocumentAI/Aidocumentpage';
import DocumentExtractorPage from './pages/DocumentExtractorPage';
import ClientDetailsPage from './pages/ClientDetailsPage';

// ──────────────────────────────────────────────
// AppLayout — layout commun à toutes les routes
// ──────────────────────────────────────────────
function AppLayout({ currentUser, onLogout }) {
  const { lang } = useLang();
  const [cases, setCases] = useState([]);

  useEffect(() => {
    api.getCases()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setCases(res.data);
        else throw new Error('API unavailable');
      })
      .catch(() => setCases(MOCK_CASES));
  }, []);

  return (
    <div className="app" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <LangToggle />
      <Sidebar currentUser={currentUser} onLogout={onLogout} />

      <Routes>
        <Route path="/users"       element={<UsersPage currentUser={currentUser} />} />
        <Route path="/cases"       element={<LawyerDashboard currentUser={currentUser} />} />
        <Route path="/cases/new"   element={<CreateCase />} />
        <Route path="/cases/:id"   element={<CaseDetail currentUser={currentUser} />} />
        <Route path="/documents"   element={<AiDocumentPage currentUser={currentUser} cases={cases} />} />
        <Route path="/ai-documents" element={<AiDocumentPage />} />
        <Route path="/document-analyzer" element={<DocumentExtractorPage />} />
        <Route path="/clients/:id" element={<ClientDetailsPage />} />
        <Route
          path="*"
          element={<Navigate to={currentUser?.role === 'ADMIN' ? '/users' : '/cases'} replace />}
        />
      </Routes>
    </div>
  );
}

export default AppLayout;