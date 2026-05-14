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
import HearingListPage from './pages/HearingListPage';
import HearingFormPage from './pages/HearingFormPage';
import HearingDetailsPage from './pages/HearingDetailsPage';
import LegalDeadlinesPage from './pages/LegalDeadlinesPage';
import CalendarPage from './pages/CalendarPage';
import InvoiceListPage from './pages/billing/InvoiceListPage';
import InvoiceFormPage from './pages/billing/InvoiceFormPage';
import InvoiceDetailsPage from './pages/billing/InvoiceDetailsPage';
import BillingNotesPage from './pages/billing/BillingNotesPage';
import PaymentsPage from './pages/billing/PaymentsPage';
import BillingExportPage from './pages/billing/BillingExportPage';
import ImportPage from './pages/ImportPage';
import ExportPage from './pages/ExportPage';

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
        <Route path="/calendar"           element={<CalendarPage />} />                          {/* ← AJOUTER */}
<Route path="/hearings"           element={<HearingListPage />} />                       {/* ← AJOUTER */}
<Route path="/hearings/new"       element={<HearingFormPage />} />                       {/* ← AJOUTER */}
<Route path="/hearings/:id"       element={<HearingDetailsPage />} />                    {/* ← AJOUTER */}
<Route path="/hearings/:id/edit"  element={<HearingFormPage />} />                       {/* ← AJOUTER */}
<Route path="/legal-deadlines"    element={<LegalDeadlinesPage />} />  
        <Route
          path="*"
          element={<Navigate to={currentUser?.role === 'ADMIN' ? '/users' : '/cases'} replace />}
        />
  <Route path="/invoices"           element={<InvoiceListPage />} />
<Route path="/invoices/new"       element={<InvoiceFormPage />} />
<Route path="/invoices/:id"       element={<InvoiceDetailsPage />} />
<Route path="/billing-notes"      element={<BillingNotesPage />} />
<Route path="/payments"           element={<PaymentsPage />} />
<Route path="/billing/export"     element={<BillingExportPage />} />
<Route path="/import"     element={<ImportPage />} />
<Route path="/export"     element={<ExportPage />} />
      </Routes>
    </div>
  );
}

export default AppLayout;