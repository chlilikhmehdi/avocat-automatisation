// src/pages/client/ClientDashboard.jsx
// Route : /client

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen, Receipt, FileText, TrendingUp,
  Clock, CheckCircle, AlertCircle, ArrowRight,
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('mizan_token')}` };
}

// ── Composants UI locaux ───────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const card = (
    <div style={{ ...s.statCard, borderTop: `3px solid ${color}` }}>
      <div style={{ ...s.statIcon, background: color + '18' }}>
        <Icon size={20} color={color} />
      </div>
      <div style={s.statBody}>
        <div style={s.statValue}>{value}</div>
        <div style={s.statLabel}>{label}</div>
        {sub && <div style={s.statSub}>{sub}</div>}
      </div>
      {to && <ArrowRight size={16} color="#bbb" style={{ marginLeft: 'auto' }} />}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{card}</Link> : card;
}

function Badge({ status }) {
  const map = {
    ouvert:      { bg: '#e8f5e9', color: '#2e7d32', label: 'Ouvert' },
    fermé:       { bg: '#fce4ec', color: '#c62828', label: 'Fermé' },
    en_attente:  { bg: '#fff8e1', color: '#f57f17', label: 'En attente' },
    payée:       { bg: '#e8f5e9', color: '#2e7d32', label: 'Payée' },
    annulée:     { bg: '#f5f5f5', color: '#757575', label: 'Annulée' },
  };
  const cfg = map[status] || { bg: '#f5f5f5', color: '#555', label: status };
  return (
    <span style={{ ...s.badge, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function fmt(amount) {
  return Number(amount || 0).toLocaleString('fr-MA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) + ' MAD';
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const [data,    setData]    = useState(null);
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/client/dashboard`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/client/cases`,     { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([dash, casesRes]) => {
        if (dash.success)      setData(dash.data);
        if (casesRes.success)  setCases(casesRes.data.slice(0, 3));
      })
      .catch(() => setError('Erreur de connexion au serveur.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={s.center}><div style={s.spinner} /></div>;
  if (error)   return <div style={s.errorBox}><AlertCircle size={18} />{error}</div>;

  const user = JSON.parse(localStorage.getItem('mizan_user') || '{}');

  return (
    <div>
      {/* En-tête */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.greeting}>Bonjour, {user.nom?.split(' ')[0] || 'Client'} 👋</h1>
          <p style={s.greetingSub}>Voici un aperçu de votre espace client.</p>
        </div>
        <div style={s.dateBadge}>
          {new Date().toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div style={s.statsGrid}>
          <StatCard
            icon={FolderOpen} color="#1565c0"
            label="Dossiers actifs"
            value={data.cases.open}
            sub={`${data.cases.total} au total`}
            to="/client/cases"
          />
          <StatCard
            icon={Receipt} color="#c9a84c"
            label="Montant dû"
            value={fmt(data.invoices.totalDue)}
            sub={`${data.invoices.pending} facture(s) en attente`}
            to="/client/invoices"
          />
          <StatCard
            icon={TrendingUp} color="#2e7d32"
            label="Total payé"
            value={fmt(data.invoices.totalPaid)}
            sub={`${data.invoices.paid} facture(s) réglée(s)`}
          />
          <StatCard
            icon={FileText} color="#6a1b9a"
            label="Documents"
            value="—"
            sub="Consulter vos fichiers"
            to="/client/documents"
          />
        </div>
      )}

      {/* Derniers dossiers */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Mes dossiers récents</h2>
          <Link to="/client/cases" style={s.seeAll}>
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>

        {cases.length === 0 ? (
          <div style={s.empty}>
            <FolderOpen size={36} color="#ccc" />
            <p>Aucun dossier pour le moment.</p>
          </div>
        ) : (
          <div style={s.casesList}>
            {cases.map((c) => (
              <Link key={c.id} to={`/client/cases/${c.id}`} style={s.caseCard}>
                <div style={s.caseCardLeft}>
                  <div style={s.caseIcon}>
                    <FolderOpen size={18} color="#1565c0" />
                  </div>
                  <div>
                    <div style={s.caseTitle}>{c.title}</div>
                    <div style={s.caseMeta}>
                      {c.type} · Avocat : {c.lawyer_name || '—'}
                    </div>
                    {c.next_hearing && (
                      <div style={s.hearing}>
                        <Clock size={12} />
                        {new Date(c.next_hearing).toLocaleDateString('fr-MA')}
                      </div>
                    )}
                  </div>
                </div>
                <div style={s.caseCardRight}>
                  <Badge status={c.status} />
                  <ArrowRight size={16} color="#ccc" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Dernier paiement */}
      {data?.lastPayment && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Dernier paiement enregistré</h2>
          <div style={s.paymentCard}>
            <CheckCircle size={20} color="#2e7d32" />
            <div>
              <div style={s.paymentAmount}>{fmt(data.lastPayment.amount)}</div>
              <div style={s.paymentMeta}>
                {data.lastPayment.payment_method?.toUpperCase()} ·{' '}
                {new Date(data.lastPayment.payment_date).toLocaleDateString('fr-MA')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raccourcis et Notifications rapides */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Nouveautés & Alertes</h2>
          <Link to="/client/messages" style={s.seeAll}>
            Voir mes messages <ArrowRight size={14} />
          </Link>
        </div>
        <div style={s.empty}>
           <AlertCircle size={36} color="#c9a84c" />
           <p style={{ marginTop: '8px' }}>Vous n'avez aucune nouvelle alerte urgente pour le moment.</p>
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  center:       { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 },
  spinner:      { width: 36, height: 36, border: '3px solid #e0e0e0', borderTopColor: '#c9a84c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  errorBox:     { display: 'flex', gap: 8, alignItems: 'center', padding: '14px 18px', background: '#fce4ec', color: '#c62828', borderRadius: 8, fontSize: 13 },
  pageHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  greeting:     { margin: 0, fontSize: 24, fontWeight: 700, color: '#0f1923' },
  greetingSub:  { margin: '4px 0 0', fontSize: 14, color: '#888' },
  dateBadge:    { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#666' },
  statsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 },
  statCard:     { background: '#fff', borderRadius: 10, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer' },
  statIcon:     { width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statBody:     { flex: 1 },
  statValue:    { fontSize: 20, fontWeight: 700, color: '#0f1923', lineHeight: 1.2 },
  statLabel:    { fontSize: 12, color: '#888', marginTop: 2 },
  statSub:      { fontSize: 11, color: '#aaa', marginTop: 2 },
  section:      { background: '#fff', borderRadius: 10, padding: '20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  sectionHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: '#0f1923' },
  seeAll:       { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#c9a84c', textDecoration: 'none', fontWeight: 600 },
  empty:        { textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 13 },
  casesList:    { display: 'flex', flexDirection: 'column', gap: 10 },
  caseCard:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', border: '1px solid #f0f0f0', borderRadius: 8, textDecoration: 'none', transition: 'border-color 0.15s', cursor: 'pointer' },
  caseCardLeft: { display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 },
  caseIcon:     { width: 36, height: 36, borderRadius: 8, background: '#e3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  caseTitle:    { fontSize: 14, fontWeight: 600, color: '#0f1923' },
  caseMeta:     { fontSize: 12, color: '#888', marginTop: 2 },
  hearing:      { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#c9a84c', marginTop: 4 },
  caseCardRight:{ display: 'flex', alignItems: 'center', gap: 10 },
  badge:        { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20 },
  paymentCard:  { display: 'flex', gap: 14, alignItems: 'center', padding: '14px', background: '#f9f9f9', borderRadius: 8, marginTop: 12 },
  paymentAmount:{ fontSize: 18, fontWeight: 700, color: '#2e7d32' },
  paymentMeta:  { fontSize: 12, color: '#888', marginTop: 2 },
};