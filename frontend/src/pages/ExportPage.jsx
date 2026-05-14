// pages/ExportPage.jsx
import { useState } from 'react';
import { authAxios } from '../apii';

const EXPORT_TYPES = [
  {
    value:       'lmd',
    label:       'LMD — Lettres de Mise en Demeure',
    icon:        '📋',
    description: 'Exporter toutes les LMD générées depuis les imports Excel',
    endpoint:    '/import/export/lmd',
  },
  {
    value:       'creances',
    label:       'Créances & Factures',
    icon:        '💰',
    description: 'Exporter l\'état des créances et factures clients',
    endpoint:    '/import/export/creances',
  },
];

export default function ExportPage() {
  const [exportType, setExportType] = useState('lmd');
  const [format,     setFormat]     = useState('excel');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [status,     setStatus]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [message,    setMessage]    = useState('');
  const [msgType,    setMsgType]    = useState('success');

  const currentType = EXPORT_TYPES.find(t => t.value === exportType);

  const handleExport = async () => {
    setLoading(true); setMessage('');

    const params = new URLSearchParams({ format });
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo)   params.append('date_to',   dateTo);
    if (status)   params.append('status',    status);

    try {
      const response = await authAxios.get(`${currentType.endpoint}?${params}`, {
        responseType: 'blob',
      });

      const ext      = format === 'excel' ? 'xlsx' : 'html';
      const mimeType = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/html';

      const url  = URL.createObjectURL(new Blob([response.data], { type: mimeType }));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `${exportType}_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage(`Export ${format === 'excel' ? 'Excel' : 'PDF'} téléchargé avec succès`);
      setMsgType('success');
    } catch (e) {
      let errMsg = e.message;
      if (e.response?.data) {
        try {
          const text = await new Blob([e.response.data]).text();
          errMsg = JSON.parse(text).message || errMsg;
        } catch {}
      }
      setMessage(errMsg || 'Erreur export');
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.icon}>📤</div>
        <div>
          <h1 style={S.title}>Export de données</h1>
          <p style={S.sub}>Exportez vos LMD et créances en Excel ou PDF imprimable</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Colonne gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Type export */}
          <div style={S.card}>
            <div style={S.cardTitle}>Type de données</div>
            {EXPORT_TYPES.map(tp => (
              <div key={tp.value} onClick={() => setExportType(tp.value)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer', marginTop: 10,
                border:     `2px solid ${exportType === tp.value ? '#1e40af' : '#e2e8f0'}`,
                background: exportType === tp.value ? '#eff6ff' : '#f8fafc',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{tp.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: exportType === tp.value ? '#1e40af' : '#0f172a' }}>
                    {tp.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{tp.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Format */}
          <div style={S.card}>
            <div style={S.cardTitle}>Format d'export</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              {[
                { value: 'excel', icon: '📊', label: 'Excel (.xlsx)', desc: 'Fichier tableur modifiable' },
                { value: 'pdf',   icon: '🖨️',  label: 'PDF imprimable', desc: 'Page HTML prête à imprimer' },
              ].map(f => (
                <button key={f.value} onClick={() => setFormat(f.value)} style={{
                  flex: 1, padding: '12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  border:       `2px solid ${format === f.value ? '#1e40af' : '#e2e8f0'}`,
                  borderRadius: 10,
                  background:   format === f.value ? '#eff6ff' : '#f8fafc',
                  transition:   'all .15s',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: format === f.value ? '#1e40af' : '#0f172a' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Filtres */}
          <div style={S.card}>
            <div style={S.cardTitle}>Filtres (optionnels)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <div>
                <label style={S.label}>Date de début</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={S.input} />
              </div>
              <div>
                <label style={S.label}>Date de fin</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={S.input} />
              </div>
              {exportType === 'creances' && (
                <div>
                  <label style={S.label}>Statut facture</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} style={S.input}>
                    <option value="">Tous</option>
                    <option value="draft">Brouillon</option>
                    <option value="sent">Envoyée</option>
                    <option value="paid">Payée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Résumé + action */}
          <div style={S.card}>
            <div style={S.cardTitle}>Résumé de l'export</div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row label="Type"   value={currentType?.label} />
              <Row label="Format" value={format === 'excel' ? '📊 Excel (.xlsx)' : '🖨️ PDF'} />
              {dateFrom && <Row label="Du"     value={dateFrom} />}
              {dateTo   && <Row label="Au"     value={dateTo}   />}
              {status   && <Row label="Statut" value={status}   />}
            </div>

            <button onClick={handleExport} disabled={loading} style={{
              ...S.btnPrimary, marginTop: 20,
              opacity: loading ? 0.6 : 1,
              cursor:  loading ? 'default' : 'pointer',
            }}>
              {loading
                ? <><Spinner /> Export en cours…</>
                : `⬇️ Exporter en ${format === 'excel' ? 'Excel' : 'PDF'}`}
            </button>

            {message && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 9, fontSize: 13,
                background: msgType === 'success' ? '#f0fdf4' : '#fef2f2',
                color:      msgType === 'success' ? '#16a34a' : '#b91c1c',
                border:     `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}>
                {msgType === 'success' ? '✓' : '⚠️'} {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#0f172a' }}>{value || '—'}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid #fff',
      borderRadius: '50%', animation: 'spin .7s linear infinite',
    }} />
  );
}

const S = {
  page:      { padding: '28px 32px', maxWidth: 960, fontFamily: "'DM Sans', sans-serif" },
  header:    { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  icon:      { width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 },
  title:     { fontSize: 22, fontWeight: 700, margin: 0, color: '#0f172a' },
  sub:       { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  card:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  label:     { fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 },
  input:     { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' },
  btnPrimary:{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' },
};