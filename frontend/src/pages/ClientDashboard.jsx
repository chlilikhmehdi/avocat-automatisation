import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const L = {
  fr: {
    title: 'Espace Client',
    welcome: 'Bienvenue dans votre espace sécurisé',
    cases: 'Vos Dossiers',
    nextHearing: 'Prochaine Audience',
    unpaidInvoices: 'Factures en attente',
    unreadMsg: 'Messages non lus',
    status: 'Statut',
    details: 'Voir les détails',
    noHearing: 'Aucune audience prévue',
    noCases: 'Aucun dossier actif.',
  },
  ar: {
    title: 'فضاء العميل',
    welcome: 'مرحباً بك في مساحتك الآمنة',
    cases: 'ملفاتك',
    nextHearing: 'الجلسة القادمة',
    unpaidInvoices: 'فواتير غير مدفوعة',
    unreadMsg: 'رسائل غير مقروءة',
    status: 'الحالة',
    details: 'عرض التفاصيل',
    noHearing: 'لا توجد جلسات مجدولة',
    noCases: 'لا توجد ملفات نشطة.',
  }
};

export default function ClientDashboard() {
  const lang = 'fr'; // TODO: useLang() 
  const t = L[lang];
  const ar = lang === 'ar';
  const navigate = useNavigate();

  const [data, setData] = useState({
    cases: [],
    unread_messages: 0,
    unpaid_invoices: 0,
    next_hearing: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      // Create a specific api method or just use fetch
      const token = localStorage.getItem('mizan_token');
      const res = await fetch('http://localhost:4000/api/client/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Chargement...</div>;

  return (
    <div style={{ padding: 30, maxWidth: 1000, margin: '0 auto', direction: ar ? 'rtl' : 'ltr' }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>{t.title}</h1>
        <p style={{ color: '#64748b', margin: 0 }}>{t.welcome}</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 40 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ fontSize: 32 }}>💬</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{data.unread_messages}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{t.unreadMsg}</div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ fontSize: 32 }}>⚖️</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {data.next_hearing ? new Date(data.next_hearing.hearing_date).toLocaleDateString() : t.noHearing}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{t.nextHearing}</div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ fontSize: 32 }}>🧾</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#b91c1c' }}>{data.unpaid_invoices}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{t.unpaidInvoices}</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, color: '#334155', marginBottom: 20 }}>{t.cases}</h2>
      
      {data.cases.length === 0 ? (
        <div style={{ padding: 40, background: '#f8fafc', borderRadius: 12, textAlign: 'center', color: '#64748b' }}>
          {t.noCases}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {data.cases.map(c => (
            <div key={c.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b', marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 15 }}>{c.type}</div>
              
              <div style={{ marginBottom: 20 }}>
                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                  {c.status || 'En cours'}
                </span>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button 
                  onClick={() => navigate(`/client/cases/${c.id}`)}
                  style={{ width: '100%', padding: 12, background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  {t.details} ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
