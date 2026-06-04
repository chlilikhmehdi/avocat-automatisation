import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function ClientCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [caseData, setCaseData] = useState(null);
  const [hearings, setHearings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [activeTab, setActiveTab] = useState('infos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('mizan_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch details
      const cRes = await fetch(`${API}/client/cases/${id}`, { headers });
      const cJson = await cRes.json();
      if (!cJson.success) throw new Error(cJson.message);
      setCaseData(cJson.data);

      // Fetch other data in parallel
      const [hRes, dRes, iRes, mRes] = await Promise.all([
        fetch(`${API}/client/cases/${id}/hearings`, { headers }).then(r => r.json()),
        fetch(`${API}/client/cases/${id}/documents`, { headers }).then(r => r.json()),
        fetch(`${API}/client/cases/${id}/invoices`, { headers }).then(r => r.json()),
        fetch(`${API}/client/messages?case_id=${id}`, { headers }).then(r => r.json())
      ]);

      if (hRes.success) setHearings(hRes.data);
      if (dRes.success) setDocuments(dRes.data);
      if (iRes.success) setInvoices(iRes.data);
      if (mRes.success) setMessages(mRes.data);

    } catch (e) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await fetch(`${API}/client/messages`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: id, content: newMessage })
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        // Rafraichir les messages
        const mRes = await fetch(`${API}/client/messages?case_id=${id}`, { headers }).then(r=>r.json());
        if (mRes.success) setMessages(mRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Chargement...</div>;
  if (error) return <div style={{ padding: 40, color: 'red' }}>{error}</div>;
  if (!caseData) return null;

  const tabs = [
    { id: 'infos', label: 'Informations' },
    { id: 'hearings', label: 'Audiences' },
    { id: 'documents', label: 'Documents' },
    { id: 'invoices', label: 'Factures' },
    { id: 'messages', label: 'Messages' },
  ];

  return (
    <div style={{ padding: 30, maxWidth: 1000, margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/client')}
        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginBottom: 20, fontWeight: 600 }}
      >
        ← Retour aux dossiers
      </button>

      <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>{caseData.title}</h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>Type : {caseData.type} | Statut : {caseData.status || 'En cours'}</p>
        
        {caseData.lawyer_name && (
          <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
            <strong>Votre Avocat :</strong> {caseData.lawyer_name} <br/>
            Contact : {caseData.lawyer_email}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              color: activeTab === t.id ? '#2563eb' : '#64748b',
              borderBottom: activeTab === t.id ? '2px solid #2563eb' : '2px solid transparent'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
        
        {/* INFOS */}
        {activeTab === 'infos' && (
          <div>
            <h3>Informations générales</h3>
            <p><strong>Niveau d'urgence :</strong> {caseData.urgency_level || 'Normal'}</p>
            <p><strong>Créé le :</strong> {new Date(caseData.created_at).toLocaleDateString()}</p>
          </div>
        )}

        {/* HEARINGS */}
        {activeTab === 'hearings' && (
          <div>
            {hearings.length === 0 ? <p>Aucune audience.</p> : hearings.map(h => (
              <div key={h.id} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{h.title}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  📅 {new Date(h.hearing_date).toLocaleDateString()} à {h.hearing_time} <br/>
                  📍 {h.location}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === 'documents' && (
          <div>
            {documents.length === 0 ? <p>Aucun document partagé.</p> : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: 12 }}>Nom du fichier</th>
                    <th style={{ padding: 12 }}>Partagé le</th>
                    <th style={{ padding: 12 }}>Note</th>
                    <th style={{ padding: 12 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 12 }}>📄 {d.original_name}</td>
                      <td style={{ padding: 12 }}>{new Date(d.shared_at).toLocaleDateString()}</td>
                      <td style={{ padding: 12, fontSize: 13, color: '#64748b' }}>{d.note || '-'}</td>
                      <td style={{ padding: 12 }}>
                        <a href={`http://localhost:4000/api/documents/download/${d.case_file_id}?token=${token}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                          Télécharger
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* INVOICES */}
        {activeTab === 'invoices' && (
          <div>
            {invoices.length === 0 ? <p>Aucune facture.</p> : invoices.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Facture {i.invoice_number}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Émise le {new Date(i.issue_date).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#1e293b' }}>{i.amount} €</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: i.invoice_status === 'paid' ? '#16a34a' : '#b91c1c' }}>
                    {i.invoice_status?.toUpperCase() || 'IMPAYÉ'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MESSAGES */}
        {activeTab === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 500 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
              {messages.length === 0 ? <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 100 }}>Aucun message. Envoyez votre premier message !</div> : 
                messages.map(m => {
                  const isMine = m.sender_role === 'CLIENT';
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
                      <div style={{ 
                        maxWidth: '70%', padding: '12px 16px', borderRadius: 16,
                        background: isMine ? '#2563eb' : '#e2e8f0',
                        color: isMine ? '#fff' : '#1e293b',
                        borderBottomRightRadius: isMine ? 4 : 16,
                        borderBottomLeftRadius: !isMine ? 4 : 16,
                      }}>
                        {!isMine && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{m.sender_name} (Avocat)</div>}
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{m.content}</div>
                        <div style={{ fontSize: 10, textAlign: 'right', marginTop: 6, opacity: 0.7 }}>
                          {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 10 }}>
              <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Écrivez un message à votre avocat..."
                style={{ flex: 1, padding: 14, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
              />
              <button type="submit" style={{ padding: '0 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                Envoyer
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
