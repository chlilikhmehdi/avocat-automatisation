// pages/ImportPage.jsx
import { useState, useRef } from 'react';
import { authAxios } from '../apii';

const TYPES = [
  { value: 'lmd',      label: 'LMD — Lettres de Mise en Demeure', icon: '📋' },
  { value: 'creances', label: 'Créances débiteurs',                icon: '💰' },
];

export default function ImportPage() {
  const [type,    setType]    = useState('lmd');
  const [file,    setFile]    = useState(null);
  const [drag,    setDrag]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('success');
  const fileRef = useRef();

  const pickFile = (f) => {
    if (!f) return;
    setFile(f); setResult(null); setError('');
  };

  const handleImport = async () => {
    if (!file) { setError('Sélectionnez un fichier Excel.'); return; }
    setLoading(true); setError(''); setResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const { data } = await authAxios.post(`/import/${type}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        setResult(data.data);
        setTab((data.data.lmd?.length || data.data.creances?.length) ? 'success' : 'errors');
      } else {
        setError(data.message || 'Erreur import');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(''); if (fileRef.current) fileRef.current.value = ''; };

  const lmdList   = result?.lmd      || result?.creances || [];
  const errorList = result?.erreurs  || [];

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.icon}>📥</div>
        <div>
          <h1 style={S.title}>Import de données</h1>
          <p style={S.sub}>Importez un fichier Excel pour générer automatiquement des LMD ou créances</p>
        </div>
      </div>

      {/* Guide colonnes */}
      <div style={S.guideCard}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e40af', marginBottom: 8 }}>
          📌 Colonnes attendues dans votre fichier Excel :
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Nom *', 'Montant *', 'Téléphone', 'Adresse', 'Reference', 'Date', 'CIN', 'Email'].map(c => (
            <span key={c} style={{
              background: c.includes('*') ? '#dbeafe' : '#f1f5f9',
              color:      c.includes('*') ? '#1e40af' : '#475569',
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 12,
            }}>
              {c}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
          * Obligatoires. Les noms de colonnes sont insensibles à la casse.
        </p>
      </div>

      {/* Carte import */}
      <div style={S.card}>

        {/* Sélection type */}
        <label style={S.label}>Type de document à générer</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, marginBottom: 18 }}>
          {TYPES.map(tp => (
            <button
              key={tp.value}
              onClick={() => { setType(tp.value); setResult(null); }}
              style={{
                flex: 1, padding: '12px 16px', cursor: 'pointer', fontFamily: 'inherit',
                border:      `2px solid ${type === tp.value ? '#1e40af' : '#e2e8f0'}`,
                borderRadius: 10,
                background:  type === tp.value ? '#eff6ff' : '#f8fafc',
                color:       type === tp.value ? '#1e40af' : '#334155',
                fontWeight:  type === tp.value ? 700 : 400,
                fontSize: 13, textAlign: 'left', transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>{tp.icon}</div>
              {tp.label}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
          onClick={() => !file && fileRef.current?.click()}
          style={{
            border:       `2px dashed ${drag ? '#3b82f6' : file ? '#22c55e' : '#cbd5e1'}`,
            borderRadius: 12, padding: '28px 20px', textAlign: 'center',
            cursor:       file ? 'default' : 'pointer', marginBottom: 16,
            background:   drag ? '#eff6ff' : file ? '#f0fdf4' : '#f8fafc',
            transition:   'all .15s',
          }}
        >
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <span style={{ fontSize: 36 }}>📊</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{(file.size / 1024).toFixed(1)} Ko</div>
              </div>
              <button onClick={e => { e.stopPropagation(); reset(); }} style={S.btnRemove}>×</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Glissez votre fichier Excel ici</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>.xlsx, .xls, .csv · 10 Mo max</div>
            </>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }} onChange={e => pickFile(e.target.files?.[0])} />
        </div>

        <button onClick={handleImport} disabled={!file || loading} style={{
          ...S.btnPrimary,
          opacity: !file || loading ? 0.55 : 1,
          cursor:  !file || loading ? 'default' : 'pointer',
        }}>
          {loading ? <><Spinner /> Traitement en cours…</> : `📥 Importer et générer les ${type.toUpperCase()}`}
        </button>

        {error && <div style={S.errorBox}>⚠️ {error}</div>}
      </div>

      {/* Résultats */}
      {result && (
        <div style={S.card}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <StatBadge icon="📊" label="Total lignes"  value={result.total_lignes  ?? lmdList.length + errorList.length} color="#3b82f6" />
            <StatBadge icon="✅" label="Générés"       value={result.total_generes ?? lmdList.length}                    color="#16a34a" />
            <StatBadge icon="⚠️" label="Erreurs"       value={result.total_erreurs ?? errorList.length}                  color="#ef4444" />
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
            {[
              { key: 'success', label: `✅ Générés (${lmdList.length})`   },
              { key: 'errors',  label: `⚠️ Erreurs (${errorList.length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13,
                fontWeight:  tab === t.key ? 700 : 400,
                color:       tab === t.key ? '#1e40af' : '#64748b',
                borderBottom:tab === t.key ? '2px solid #1e40af' : '2px solid transparent',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Table succès */}
          {tab === 'success' && (
            lmdList.length === 0
              ? <Empty text="Aucun enregistrement généré" />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['N° LMD', 'Débiteur', 'Montant', 'Téléphone', 'Référence', 'Date', 'Statut'].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lmdList.map((lmd, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={S.td}>
                            <code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                              {lmd.numero_lmd}
                            </code>
                          </td>
                          <td style={{ ...S.td, fontWeight: 600 }}>{lmd.nom_debiteur}</td>
                          <td style={{ ...S.td, color: '#16a34a', fontWeight: 700 }}>
                            {Number(lmd.montant).toLocaleString('fr-MA')} MAD
                          </td>
                          <td style={S.td}>{lmd.telephone || '—'}</td>
                          <td style={S.td}>{lmd.reference || lmd.reference_dossier || '—'}</td>
                          <td style={S.td}>{lmd.date_lmd ? String(lmd.date_lmd).split('T')[0] : '—'}</td>
                          <td style={S.td}>
                            <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                              ✓ Généré
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}

          {/* Table erreurs */}
          {tab === 'errors' && (
            errorList.length === 0
              ? <Empty text="🎉 Aucune erreur — toutes les lignes ont été traitées" green />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Ligne', 'Raison', 'Données brutes'].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {errorList.map((err, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #fef2f2', background: '#fffafa' }}>
                          <td style={{ ...S.td, fontWeight: 700, color: '#ef4444' }}>#{err.ligne}</td>
                          <td style={{ ...S.td, color: '#b91c1c' }}>{err.raison}</td>
                          <td style={{ ...S.td, fontSize: 11, color: '#94a3b8' }}>
                            {JSON.stringify(err.data || {}).slice(0, 120)}…
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}

          <button onClick={reset} style={{ ...S.btnGhost, marginTop: 16 }}>
            ↺ Nouveau import
          </button>
        </div>
      )}
    </div>
  );
}

function StatBadge({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 16px' }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}

function Empty({ text, green }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px', fontSize: 14, color: green ? '#16a34a' : '#94a3b8' }}>
      {text}
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid #fff',
      borderRadius: '50%', animation: 'spin .7s linear infinite', marginRight: 6,
    }} />
  );
}

const S = {
  page:      { padding: '28px 32px', maxWidth: 1000, fontFamily: "'DM Sans', sans-serif" },
  header:    { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  icon:      { width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1e40af,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 },
  title:     { fontSize: 22, fontWeight: 700, margin: 0, color: '#0f172a' },
  sub:       { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  guideCard: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: 20 },
  card:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 20 },
  label:     { fontSize: 13, fontWeight: 600, color: '#334155', display: 'block' },
  btnPrimary:{ width: '100%', padding: 13, background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' },
  btnGhost:  { background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', padding: '9px 18px', borderRadius: 9, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  btnRemove: { background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  errorBox:  { marginTop: 14, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontSize: 13 },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', letterSpacing: '.5px' },
  td:        { padding: '11px 12px', fontSize: 13, color: '#334155', verticalAlign: 'middle' },
};