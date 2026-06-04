import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaseById, addHistory, uploadFile, deleteCase } from '../Cases';
import CaseAutomationPanel from './automation/CaseAutomationPanel';

export default function CaseDetail({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Timeline
  const [newAction, setNewAction] = useState('');
  const [addingAction, setAddingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Upload
  const [uploadPct, setUploadPct] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef();

  const loadCase = async () => {
    setLoading(true);
    try {
      const res = await getCaseById(id);
      if (res.success) setCaseData(res.data);
      else setError(res.message || 'Dossier introuvable');
    } catch {
      setError('Impossible de joindre le serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCase(); }, [id]);

  // ── Ajouter une entrée timeline ──────────────────────────────────────────
  const handleAddHistory = async () => {
    if (!newAction.trim()) return;
    setAddingAction(true);
    setActionSuccess('');
    try {
      const res = await addHistory(id, newAction.trim());
      if (res.success) {
        setNewAction('');
        setActionSuccess('Entrée ajoutée ✓');
        await loadCase();
        setTimeout(() => setActionSuccess(''), 3000);
      } else {
        setError(res.message);
      }
    } catch {
      setError('Erreur lors de l\'ajout');
    } finally {
      setAddingAction(false);
    }
  };

  // ── Upload fichier ───────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadPct(0);
    setUploadMsg('');
    try {
      const res = await uploadFile(id, file, setUploadPct);
      if (res.success) {
        setUploadMsg('Fichier uploadé ✓');
        await loadCase();
        setTimeout(() => { setUploadPct(null); setUploadMsg(''); }, 3000);
      } else {
        setUploadMsg(res.message || 'Erreur upload');
        setUploadPct(null);
      }
    } catch {
      setUploadMsg('Erreur lors de l\'upload');
      setUploadPct(null);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Suppression dossier ──────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm(`Supprimer le dossier "${caseData?.title}" ?`)) return;
    try {
      await deleteCase(id);
      navigate('/cases');
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  if (loading) return <Loader />;
  if (error)   return <ErrorMsg msg={error} />;
  if (!caseData) return null;

  const statusMeta = {
    ouvert:   { label: 'Ouvert',   color: '#10b981', bg: '#ecfdf5' },
    en_cours: { label: 'En cours', color: '#3b82f6', bg: '#eff6ff' },
    clôturé:  { label: 'Clôturé',  color: '#6b7280', bg: '#f3f4f6' },
  }[caseData.status] || {};

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960 }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/cases')}>
          Mes dossiers
        </span>
        {' › '}
        <span>{caseData.title}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{caseData.title}</h1>
            <span style={{
              background: statusMeta.bg, color: statusMeta.color,
              padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            }}>
              {statusMeta.label}
            </span>
          </div>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>
            Client : <strong>{caseData.client_name}</strong> · Type : {caseData.type}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate(`/cases/${id}/edit`)}
            style={btnSecondary}
          >
            ✏️ Modifier
          </button>
          {currentUser?.role === 'ADMIN' && (
            <button onClick={handleDelete} style={btnDanger}>🗑 Supprimer</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        <div style={card}>
          <h2 style={cardTitle}>📋 Historique</h2>

          {/* Ajouter entrée */}
          <div style={{ marginBottom: 16 }}>
            <textarea
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="Décrire une action (audience, courrier, appel…)"
              rows={3}
              style={{
                width: '100%', padding: 10,
                border: '1px solid #e2e8f0', borderRadius: 8,
                fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {actionSuccess && <span style={{ fontSize: 13, color: '#10b981' }}>{actionSuccess}</span>}
              <button
                onClick={handleAddHistory}
                disabled={addingAction || !newAction.trim()}
                style={{ ...btnPrimary, marginLeft: 'auto' }}
              >
                {addingAction ? '...' : '+ Ajouter'}
              </button>
            </div>
          </div>

          {/* Entrées */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {caseData.history?.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 13 }}>Aucune entrée</p>
            ) : (
              caseData.history?.map((h) => (
                <div key={h.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#3b82f6',
                    marginTop: 5, flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{h.action}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                      {h.author} · {new Date(h.created_at).toLocaleString('fr-MA')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Fichiers ─────────────────────────────────────────────────── */}
        <div style={card}>
          <h2 style={cardTitle}>📎 Fichiers</h2>

          {/* Zone upload */}
          <div
            style={{
              border: '2px dashed #cbd5e1', borderRadius: 10,
              padding: '20px 16px', textAlign: 'center', marginBottom: 16,
              cursor: 'pointer', transition: 'border-color .15s',
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleUpload({ target: { files: [file] } });
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Cliquez ou glissez un fichier ici<br/>
              <span style={{ fontSize: 11 }}>PDF, Word, Excel, images — max 20 Mo</span>
            </p>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
          </div>

          {uploadPct !== null && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${uploadPct}%`,
                  background: '#3b82f6', transition: 'width .2s',
                }} />
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>{uploadPct}%</p>
            </div>
          )}
          {uploadMsg && (
            <p style={{ fontSize: 13, color: uploadMsg.includes('✓') ? '#10b981' : '#ef4444', marginBottom: 12 }}>
              {uploadMsg}
            </p>
          )}

          {/* Liste fichiers */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {caseData.files?.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 13 }}>Aucun fichier</p>
            ) : (
              caseData.files?.map((f) => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid #f1f5f9',
                }}>
                  <span style={{ fontSize: 18 }}>
                    {/pdf/i.test(f.mimetype) ? '📄' : /image/i.test(f.mimetype) ? '🖼️' : '📁'}
                  </span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <a
                      href={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:4000'}/uploads/${f.filename}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {f.original_name}
                    </a>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                      {f.uploader} · {new Date(f.uploaded_at).toLocaleDateString('fr-MA')}
                      {' · '}{(f.size / 1024).toFixed(0)} Ko
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <CaseAutomationPanel caseId={id} currentUser={currentUser} />
    </div>
  );
}

// ── Petits composants ──────────────────────────────────────────────────────

const Loader = () => (
  <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>⏳ Chargement...</div>
);
const ErrorMsg = ({ msg }) => (
  <div style={{ padding: 24, color: '#ef4444' }}>⚠️ {msg}</div>
);

// ── Styles partagés ────────────────────────────────────────────────────────

const card = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24,
};
const cardTitle = {
  fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#0f172a',
};
const btnPrimary = {
  background: '#1e40af', color: '#fff', border: 'none',
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnSecondary = {
  background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe',
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
const btnDanger = {
  background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};