// src/layouts/AppLayout.jsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';

import Dashboard from '../pages/Dashboard';
import LawyerDashboard from '../pages/Lawyerdashboard';
import CreateCase from '../pages/Createcase';
import CaseDetail from '../pages/Casedetail';

export default function AppLayout({
  currentUser,
  onLogout,
  lang,
  toggleLang,
}) {
  return (
    <div className="app" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sélecteur langue */}
      <div style={{ position: 'fixed', top: 14, right: 16, zIndex: 999 }}>
        <div className="lang-toggle">
          <button
            className={`lang-btn${lang === 'fr' ? ' active' : ''}`}
            onClick={() => toggleLang('fr')}
          >
            FR
          </button>

          <button
            className={`lang-btn${lang === 'ar' ? ' active' : ''}`}
            onClick={() => toggleLang('ar')}
          >
            AR
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Pages */}
      <Routes>
        {/* Utilisateurs */}
        <Route
          path="/users"
          element={<Dashboard currentUser={currentUser} />}
        />

        {/* Dossiers */}
        <Route
          path="/cases"
          element={<LawyerDashboard currentUser={currentUser} />}
        />

        <Route
          path="/cases/new"
          element={<CreateCase />}
        />

        <Route
          path="/cases/:id"
          element={<CaseDetail currentUser={currentUser} />}
        />

        {/* Redirection défaut */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                currentUser?.role === 'ADMIN'
                  ? '/users'
                  : '/cases'
              }
              replace
            />
          }
        />
      </Routes>
    </div>
  );
}