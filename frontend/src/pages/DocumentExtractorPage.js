// pages/DocumentExtractorPage.jsx
import { useState, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const isArabic = (lang) => lang === 'ar';

// Labels bilingues
const L = {
  title:        { fr: 'Extracteur de documents juridiques', ar: 'مستخرج الوثائق القانونية' },
  sub:          { fr: 'OCR + Moteur Analytique Déterministe', ar: 'OCR + محرك التحليل الحتمي' },
  dropZone:     { fr: 'Glissez un fichier ou cliquez', ar: 'اسحب ملفاً أو انقر للاختيار' },
  dropSub:      { fr: 'PDF, JPG, PNG, DOCX, TXT · 20 Mo max', ar: 'PDF، JPG، PNG، DOCX، TXT · 20 ميغابايت كحد أقصى' },
  analyze:      { fr: '🔍 Analyser le document', ar: '🔍 تحليل الوثيقة' },
  analyzing:    { fr: 'Analyse en cours…', ar: 'جارٍ التحليل…' },
  reset:        { fr: '↺ Nouveau document', ar: '↺ وثيقة جديدة' },
  copy:         { fr: '📋 Copier', ar: '📋 نسخ' },
  type:         { fr: 'Type de document', ar: 'نوع الوثيقة' },
  resume:       { fr: 'Résumé', ar: 'ملخص' },
  parties:      { fr: 'Parties', ar: 'الأطراف' },
  demandeur:    { fr: 'Demandeur', ar: 'المدعي' },
  defendeur:    { fr: 'Défendeur', ar: 'المدعى عليه' },
  dates:        { fr: 'Dates importantes', ar: 'التواريخ المهمة' },
  montants:     { fr: 'Montants', ar: 'المبالغ' },
  faits:        { fr: 'Actions importantes', ar: 'الإجراءات الهامة' },
  delais:       { fr: 'Délais légaux', ar: 'الآجال القانونية' },
  juridiction:  { fr: 'Juridiction', ar: 'الجهة القضائية' },
  mots_cles:    { fr: 'Mots-clés', ar: 'الكلمات المفتاحية' },
  texte_ocr:    { fr: 'Texte extrait (OCR)', ar: 'النص المستخرج (OCR)' },
  model:        { fr: 'Moteur d\'analyse', ar: 'محرك التحليل' },
  chars:        { fr: 'Caractères', ar: 'عدد الأحرف' },
  langue_det:   { fr: 'Langue détectée', ar: 'اللغة المكتشفة' },
  ready:        { fr: 'prêt à analyser', ar: 'جاهز للتحليل' },
  step1:        { fr: '📄 Fichier reçu', ar: '📄 تم استلام الملف' },
  step2:        { fr: '🔡 Extraction texte…', ar: '🔡 استخراج النص…' },
  step3:        { fr: '⚙️ Analyse locale déterministe…', ar: '⚙️ تحليل محلي حتمي…' },
};

const t = (key, lang) => L[key]?.[lang] || L[key]?.fr || key;

export default function DocumentExtractorPage() {
  const [file,    setFile]    = useState(null);
  const [drag,    setDrag]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('extract'); // 'extract' | 'ocr'
  const fileRef = useRef();

  const lang = result?.langue || 'fr';
  const ar   = isArabic(lang);
  const dir  = ar ? 'rtl' : 'ltr';

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!file) { setError('Sélectionnez un fichier.'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const { data } = await axios.post(`${API}/documents/extract`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 360000,
      });

      if (data.success) {
        setResult(data.data);
        setTab('extract');
      } else {
        setError(data.message || 'Erreur lors de l\'analyse.');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setResult(null); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const ex = result?.extracted || {};

  return (
    <div style={{ ...S.page, direction: dir, fontFamily: ar ? "'Noto Sans Arabic', 'DM Sans', sans-serif" : "'DM Sans', sans-serif" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.headerIcon}>⚖️</div>
        <div>
          <h1 style={S.title}>{t('title', lang)}</h1>
          <p style={S.sub}>{t('sub', lang)}</p>
        </div>
      </div>

      {/* ── Card upload ─────────────────────────────────────────────────────── */}
      <div style={S.card}>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
          onClick={() => !file && fileRef.current?.click()}
          style={{
            ...S.dropZone,
            borderColor: drag ? '#3b82f6' : file ? '#22c55e' : '#cbd5e1',
            background:  drag ? '#eff6ff' : file ? '#f0fdf4' : '#f8fafc',
            cursor:      file ? 'default' : 'pointer',
          }}
        >
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
              <span style={{ fontSize: 36 }}>{file.type.includes('pdf') ? '📕' : '🖼️'}</span>
              <div style={{ flex: 1, textAlign: ar ? 'right' : 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {(file.size / 1024).toFixed(0)} Ko · {t('ready', lang)}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); reset(); }}
                style={S.btnRemove}
              >×</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                {t('dropZone', lang)}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('dropSub', lang)}</div>
            </>
          )}
        </div>

        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
          style={{ display: 'none' }} onChange={e => pickFile(e.target.files?.[0])} />

        {/* Bouton analyser */}
        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          style={{
            ...S.btnAnalyze,
            opacity: !file || loading ? 0.55 : 1,
            cursor:  !file || loading ? 'default' : 'pointer',
          }}
        >
          {loading
            ? <><Spinner /> {t('analyzing', lang)}</>
            : t('analyze', lang)}
        </button>

        {/* Étapes loading */}
        {loading && (
          <div style={{ ...S.steps, direction: dir }}>
            <Step done ar={ar}>{t('step1', lang)}</Step>
            <Step active ar={ar}>{t('step2', lang)}</Step>
            <Step ar={ar}>{t('step3', lang)}</Step>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div style={{ ...S.errorBox, direction: dir }}>
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      {/* ── Résultats ────────────────────────────────────────────────────────── */}
      {result && (
        <div style={{ ...S.card, direction: dir }}>

          {/* Méta */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <MetaBadge icon={ar ? '🇲🇦' : '🇫🇷'} label={t('langue_det', lang)}
              value={ar ? 'العربية' : 'Français'} color={ar ? '#16a34a' : '#1e40af'} />
            <MetaBadge icon="⚙️" label={t('model', lang)}   value={result.model} color="#7c3aed" />
            <MetaBadge icon="📝" label={t('chars', lang)}    value={result.chars?.toLocaleString()} />
            {ex.niveau_urgence && (
              <MetaBadge 
                icon="🚨" 
                label={ar ? 'الاستعجال' : 'Urgence'} 
                value={
                  ex.niveau_urgence === 'critique' ? (ar ? 'حرجة' : 'CRITIQUE') :
                  ex.niveau_urgence === 'élevé' ? (ar ? 'مرتفعة' : 'ÉLEVÉE') :
                  ex.niveau_urgence === 'moyen' ? (ar ? 'متوسطة' : 'MOYENNE') :
                  (ar ? 'منخفضة' : 'FAIBLE')
                } 
                color={
                  ex.niveau_urgence === 'critique' ? '#dc2626' : 
                  ex.niveau_urgence === 'élevé' ? '#ea580c' : 
                  ex.niveau_urgence === 'moyen' ? '#ca8a04' : '#16a34a'
                } 
              />
            )}
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
            {[
              { key: 'extract', label: ar ? '📊 المعلومات المستخرجة' : '📊 Informations extraites' },
              { key: 'ocr',     label: ar ? '🔡 النص الأصلي' : '🔡 Texte OCR' },
            ].map(tb => (
              <button key={tb.key} onClick={() => setTab(tb.key)} style={{
                ...S.tab,
                borderBottom: tab === tb.key ? '2px solid #1e40af' : '2px solid transparent',
                color:        tab === tb.key ? '#1e40af' : '#64748b',
                fontWeight:   tab === tb.key ? 700 : 400,
              }}>
                {tb.label}
              </button>
            ))}
          </div>

          {/* ── Onglet extraction ─────────────────────────────────────────── */}
          {tab === 'extract' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Type + Résumé */}
              <InfoBlock title={t('type', lang)} ar={ar}>
                <span style={{ fontWeight: 700, color: '#1e40af', fontSize: 15 }}>
                  {ex.type_document || '—'}
                </span>
              </InfoBlock>

              <InfoBlock title={t('resume', lang)} ar={ar} copyText={ex.resume}>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: '#1e293b', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {ex.resume || '—'}
                </p>
              </InfoBlock>

              {/* Parties */}
              <InfoBlock title={t('parties', lang)} ar={ar}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <PartyCard label={t('demandeur', lang)} value={ex.parties?.demandeur} ar={ar} color="#dbeafe" />
                  <PartyCard label={t('defendeur', lang)} value={ex.parties?.defendeur} ar={ar} color="#fce7f3" />
                </div>
              </InfoBlock>

              {/* Grille infos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InfoBlock title={t('dates', lang)} ar={ar}>
                  <TagList items={ex.dates} color="#dbeafe" textColor="#1e40af" />
                </InfoBlock>

                <InfoBlock title={t('montants', lang)} ar={ar}>
                  <TagList items={ex.montants} color="#dcfce7" textColor="#16a34a" />
                </InfoBlock>
              </div>

              <InfoBlock title={t('faits', lang)} ar={ar}>
                <ul style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(ex.faits_principaux || []).map((f, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{f}</li>
                  ))}
                  {!ex.faits_principaux?.length && <li style={{ color: '#94a3b8' }}>—</li>}
                </ul>
              </InfoBlock>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InfoBlock title={t('delais', lang)} ar={ar}>
                  <TagList items={ex.delais_legaux} color="#fef3c7" textColor="#d97706" />
                </InfoBlock>

                <InfoBlock title={t('juridiction', lang)} ar={ar}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>
                    {ex.juridiction || '—'}
                  </span>
                </InfoBlock>
              </div>

              <InfoBlock title={t('mots_cles', lang)} ar={ar}>
                <TagList items={ex.mots_cles} color="#f3e8ff" textColor="#7c3aed" />
              </InfoBlock>

              {/* Timeline des événements importants */}
              {ex.timeline && ex.timeline.length > 0 && (
                <InfoBlock title={ar ? '📅 الجدول الزمني للأحداث' : '📅 Chronologie des événements importants'} ar={ar}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 20, 
                    position: 'relative', 
                    paddingInlineStart: 24,
                    borderInlineStart: '2px solid #cbd5e1',
                    marginBlock: 12
                  }}>
                    {ex.timeline.map((evt, idx) => (
                      <div key={idx} style={{ position: 'relative', textAlign: ar ? 'right' : 'left' }}>
                        {/* Point de la frise */}
                        <div style={{
                          position: 'absolute',
                          left: ar ? 'auto' : -29,
                          right: ar ? -29 : 'auto',
                          top: 5,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg,#7c3aed,#1e40af)',
                          boxShadow: '0 0 0 3px #fff, 0 0 0 5px #7c3aed'
                        }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>{evt.date}</span>
                          <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{evt.evenement}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </InfoBlock>
              )}

              {/* Copier JSON complet */}
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(ex, null, 2))}
                style={S.btnCopy}
              >
                {t('copy', lang)} JSON
              </button>
            </div>
          )}

          {/* ── Onglet OCR ───────────────────────────────────────────────── */}
          {tab === 'ocr' && (
            <div>
              <pre style={{ ...S.pre, direction: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left' }}>
                {result.texte_ocr}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(result.texte_ocr)}
                style={S.btnCopy}
              >
                {t('copy', lang)} {t('texte_ocr', lang)}
              </button>
            </div>
          )}

          <button onClick={reset} style={{ ...S.btnReset, marginTop: 20 }}>
            {t('reset', lang)}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────────────────────
function InfoBlock({ title, children, ar, copyText }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          {title}
        </div>
        {copyText && (
          <button
            onClick={() => navigator.clipboard.writeText(copyText)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}
          >
            📋
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function PartyCard({ label, value, color }) {
  return (
    <div style={{ background: color, borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{value || '—'}</div>
    </div>
  );
}

function TagList({ items = [], color, textColor }) {
  if (!items?.length) return <span style={{ fontSize: 13, color: '#94a3b8' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item, i) => (
        <span key={i} style={{ background: color, color: textColor, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function MetaBadge({ icon, label, value, color = '#1e40af' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', borderRadius: 8, padding: '6px 12px' }}>
      <span>{icon}</span>
      <span style={{ fontSize: 11, color: '#64748b' }}>{label} :</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function Step({ children, done, active, ar }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: done ? '#16a34a' : active ? '#1e40af' : '#94a3b8', fontWeight: active ? 600 : 400, flexDirection: ar ? 'row-reverse' : 'row' }}>
      <span>{done ? '✓' : active ? '⏳' : '○'}</span>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  page:       { padding: '28px 32px', maxWidth: 900 },
  header:     { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  headerIcon: { width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 },
  title:      { fontSize: 22, fontWeight: 700, margin: 0, color: '#0f172a' },
  sub:        { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  card:       { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 20 },
  dropZone:   { border: '2px dashed', borderRadius: 12, padding: '32px 20px', textAlign: 'center', transition: 'all .15s', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  btnRemove:  { background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginInlineStart: 'auto' },
  btnAnalyze: { width: '100%', padding: 13, background: 'linear-gradient(135deg,#7c3aed,#1e40af)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' },
  steps:      { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14, padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' },
  errorBox:   { marginTop: 14, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 },
  tab:        { padding: '9px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' },
  pre:        { fontSize: 12, lineHeight: 1.7, background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 10, maxHeight: 380, overflowY: 'auto', marginBottom: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  btnCopy:    { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#334155' },
  btnReset:   { background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 9, padding: '9px 18px', fontSize: 13, cursor: 'pointer', color: '#64748b', fontFamily: 'inherit' },
};