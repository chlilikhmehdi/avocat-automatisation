// AppLayout.jsx
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Sidebar          from './components/layout/Sidebar';
import LangToggle       from './components/layout/LangToggle';
import NotificationBell from './components/layout/NotificationBell';

// Pages staff
import UsersPage             from './pages/UsersPage';
import LawyerDashboard       from './pages/Lawyerdashboard';
import CaseDetail            from './pages/Casedetail';
import CreateCase            from './pages/Createcase';
import AiDocumentPage        from './components/DocumentAI/Aidocumentpage';
import OcrPage               from './pages/OcrPage';
import TemplateGeneratorPage from './pages/TemplateGeneratorPage';
import ClientDetailsPage     from './pages/ClientDetailsPage';
import HearingListPage       from './pages/HearingListPage';
import HearingFormPage       from './pages/HearingFormPage';
import HearingDetailsPage    from './pages/HearingDetailsPage';
import LegalDeadlinesPage    from './pages/LegalDeadlinesPage';
import CalendarPage          from './pages/CalendarPage';
import InvoiceListPage       from './pages/billing/InvoiceListPage';
import InvoiceFormPage       from './pages/billing/InvoiceFormPage';
import InvoiceDetailsPage    from './pages/billing/InvoiceDetailsPage';
import BillingNotesPage      from './pages/billing/BillingNotesPage';
import PaymentsPage          from './pages/billing/PaymentsPage';
import BillingExportPage     from './pages/billing/BillingExportPage';
import ImportPage            from './pages/ImportPage';
import ExportPage            from './pages/ExportPage';
import AutomationDashboard   from './pages/automation/AutomationDashboard';
import LettreMiseEndemeurword from './pages/LmdFront';
import StatisticsDashboard   from './pages/Statistics/StatisticsDashboard';
import RagPage               from './pages/RagPage';

// Pages client
import ClientDashboard from './pages/client/ClientDashboard';
import ClientCases     from './pages/client/ClientCases';
import ClientDocuments from './pages/client/ClientDocuments';
import ClientInvoices  from './pages/client/ClientInvoices';
import ClientMessages  from './pages/client/ClientMessages';

import api from './services/api';
import { MOCK_CASES } from './constants/mockData';
import { useLang }    from './context/LangContext';

// ─── Helpers localStorage ────────────────────────────────────────────────────
function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('mizan_user') || '{}'); }
  catch { return {}; }
}

function getStoredRole() {
  return getStoredUser().role || null;
}

// ─── Guard : redirige si le rôle n'est pas autorisé ─────────────────────────
function RequireRole({ allowed, children }) {
  const role = getStoredRole();
  if (!role)                  return <Navigate to="/login"        replace />;
  if (!allowed.includes(role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

// ─── Redirection home selon rôle ────────────────────────────────────────────
function RoleHome() {
  const role  = getStoredRole();
  const homes = {
    ADMIN:     '/users',
    LAWYER:    '/cases',
    ASSISTANT: '/cases',
    CLIENT:    '/client',
  };
  return <Navigate to={homes[role] ?? '/login'} replace />;
}

// ─── Page accès refusé ───────────────────────────────────────────────────────
function UnauthorizedPage() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h2>⛔ Accès refusé</h2>
      <p>Vous n'avez pas les droits pour accéder à cette page.</p>
      <a href="/login">Se connecter avec un autre compte</a>
    </div>
  );
}

// ─── Layout client isolé (sidebar + outlet) ──────────────────────────────────
function ClientLayout({ onLogout }) {
  const { lang } = useLang();
  return (
    <div className="app" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <LangToggle />
      <Sidebar onLogout={onLogout} />
      <Routes>
        <Route index                element={<ClientDashboard />} />
        <Route path="cases"         element={<ClientCases />} />
        <Route path="cases/:id"     element={<ClientCases />} />
        <Route path="documents"     element={<ClientDocuments />} />
        <Route path="invoices"      element={<ClientInvoices />} />
        <Route path="messages"      element={<ClientMessages />} />
        <Route path="*"             element={<Navigate to="/client" replace />} />
      </Routes>
    </div>
  );
}

// ─── AppLayout principal (staff) ────────────────────────────────────────────
export default function AppLayout({ onLogout }) {
  const { lang }  = useLang();
  const [cases, setCases] = useState([]);

  const storedUser = getStoredUser();
  const role       = storedUser.role;

  useEffect(() => {
    api.getCases()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setCases(res.data);
        else throw new Error();
      })
      .catch(() => setCases(MOCK_CASES));
  }, []);

  const STAFF        = ['ADMIN', 'LAWYER', 'ASSISTANT'];
  const ADMIN_LAWYER = ['ADMIN', 'LAWYER'];

  // Le portail client a son propre layout isolé
  if (role === 'CLIENT') {
    return (
      <RequireRole allowed={['CLIENT']}>
        <ClientLayout onLogout={onLogout} />
      </RequireRole>
    );
  }

  return (
    <div className="app" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <LangToggle />
      <NotificationBell />
      <Sidebar onLogout={onLogout} />

      <Routes>
        {/* ── Racine ────────────────────────────────────────────────── */}
        <Route path="/"  element={<RoleHome />} />
        <Route path="*"  element={<RoleHome />} />

        {/* ── ADMIN uniquement ──────────────────────────────────────── */}
        <Route path="/users" element={
          <RequireRole allowed={['ADMIN']}>
            <UsersPage currentUser={storedUser} />
          </RequireRole>
        } />


        {/* ── Dossiers — STAFF ──────────────────────────────────────── */}
        <Route path="/cases" element={
          <RequireRole allowed={STAFF}>
            <LawyerDashboard currentUser={storedUser} />
          </RequireRole>
        } />
        <Route path="/cases/new" element={
          <RequireRole allowed={STAFF}><CreateCase /></RequireRole>
        } />
        <Route path="/cases/:id" element={
          <RequireRole allowed={STAFF}>
            <CaseDetail currentUser={storedUser} />
          </RequireRole>
        } />

        {/* ── Agenda — STAFF ────────────────────────────────────────── */}
        <Route path="/calendar" element={
          <RequireRole allowed={STAFF}><CalendarPage /></RequireRole>
        } />
        <Route path="/hearings" element={
          <RequireRole allowed={STAFF}><HearingListPage /></RequireRole>
        } />
        <Route path="/hearings/new" element={
          <RequireRole allowed={STAFF}><HearingFormPage /></RequireRole>
        } />
        <Route path="/hearings/:id" element={
          <RequireRole allowed={STAFF}><HearingDetailsPage /></RequireRole>
        } />
        <Route path="/hearings/:id/edit" element={
          <RequireRole allowed={STAFF}><HearingFormPage /></RequireRole>
        } />
        <Route path="/legal-deadlines" element={
          <RequireRole allowed={STAFF}><LegalDeadlinesPage /></RequireRole>
        } />
  
        {/* ── Outils IA — STAFF ─────────────────────────────────────── */}
        <Route path="/generator" element={
          <RequireRole allowed={STAFF}><TemplateGeneratorPage /></RequireRole>
        } />
        <Route path="/ocr" element={
          <RequireRole allowed={STAFF}><OcrPage /></RequireRole>
        } />
        <Route path="/documents" element={
          <RequireRole allowed={STAFF}>
            <AiDocumentPage currentUser={storedUser} cases={cases} />
          </RequireRole>
        } />
        <Route path="/ai-documents" element={
          <RequireRole allowed={STAFF}><AiDocumentPage /></RequireRole>
        } />
        <Route path="/rag" element={
          <RequireRole allowed={STAFF}><RagPage /></RequireRole>
        } />

        {/* ── Clients (fiche) — STAFF ───────────────────────────────── */}
        <Route path="/clients/:id" element={
          <RequireRole allowed={STAFF}><ClientDetailsPage /></RequireRole>
        } />

        {/* ── Facturation complète — ADMIN + LAWYER ─────────────────── */}
        <Route path="/invoices" element={
          <RequireRole allowed={ADMIN_LAWYER}><InvoiceListPage /></RequireRole>
        } />
        <Route path="/invoices/new" element={
          <RequireRole allowed={ADMIN_LAWYER}><InvoiceFormPage /></RequireRole>
        } />
        <Route path="/invoices/:id" element={
          <RequireRole allowed={ADMIN_LAWYER}><InvoiceDetailsPage /></RequireRole>
        } />
        <Route path="/payments" element={
          <RequireRole allowed={ADMIN_LAWYER}><PaymentsPage /></RequireRole>
        } />
        <Route path="/billing/export" element={
          <RequireRole allowed={ADMIN_LAWYER}><BillingExportPage /></RequireRole>
        } />
        <Route path="/import" element={
          <RequireRole allowed={ADMIN_LAWYER}><ImportPage /></RequireRole>
        } />
        <Route path="/export" element={
          <RequireRole allowed={ADMIN_LAWYER}><ExportPage /></RequireRole>
        } />

        {/* ── Facturation partielle — ASSISTANT aussi ────────────────── */}
        <Route path="/billing-notes" element={
          <RequireRole allowed={STAFF}><BillingNotesPage /></RequireRole>
        } />

        {/* ── Automatisation — STAFF ────────────────────────────────── */}
        <Route path="/avocat/automatisation" element={
          <RequireRole allowed={STAFF}><AutomationDashboard /></RequireRole>
        } />
        <Route path="/lmd" element={
          <RequireRole allowed={STAFF}><LettreMiseEndemeurword /></RequireRole>
        } />

        {/* ── Utilitaires ───────────────────────────────────────────── */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/lmd-rm" element={<LettreMiseEndemeurword />} />

        {/* ── Statistiques ────────────────────────────────────────── */}
        <Route path="/statistics" element={
          <RequireRole allowed={STAFF}><StatisticsDashboard /></RequireRole>
        } />
      </Routes>
    </div>
  );
}
