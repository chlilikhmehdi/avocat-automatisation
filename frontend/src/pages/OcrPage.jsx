// pages/OcrPage.jsx — Module OCR complet avec persistance PostgreSQL
import { useState, useRef, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// ─────────────────────────────────────────────────────────────
// Labels bilingues
// ─────────────────────────────────────────────────────────────
const L = {
  title:        { fr: 'Module OCR — Documents Juridiques',    ar: 'وحدة OCR — الوثائق القانونية' },
  sub:          { fr: 'Extraction automatique · Tesseract OCR · NLP local', ar: 'استخراج تلقائي · Tesseract OCR · معالجة اللغة الطبيعية' },
  tabUpload:    { fr: '📤 Analyse OCR',      ar: '📤 تحليل OCR' },
  tabHistory:   { fr: '📋 Historique',       ar: '📋 السجل' },
  dropZone:     { fr: 'Glissez un PDF ou une image ici, ou cliquez', ar: 'اسحب ملف PDF أو صورة هنا، أو انقر' },
  dropSub:      { fr: 'PDF, JPG, PNG, TIFF, DOCX · 20 Mo max',      ar: 'PDF، JPG، PNG، TIFF، DOCX · 20 ميغابايت كحد أقصى' },
  selectCase:   { fr: '📁 Lier à un dossier juridique (optionnel)',   ar: '📁 ربط بملف قانوني (اختياري)' },
  noCase:       { fr: '— Aucun dossier —',   ar: '— لا يوجد ملف —' },
  analyze:      { fr: '🔍 Lancer l\'OCR et l\'analyse', ar: '🔍 بدء OCR والتحليل' },
  analyzing:    { fr: 'Extraction en cours…', ar: 'جارٍ الاستخراج…' },
  reset:        { fr: '↺ Nouveau document',   ar: '↺ وثيقة جديدة' },
  copy:         { fr: '📋 Copier',            ar: '📋 نسخ' },
  saved:        { fr: '✅ Résultat sauvegardé en base de données', ar: '✅ تم حفظ النتيجة في قاعدة البيانات' },
  type:         { fr: 'Type de document',     ar: 'نوع الوثيقة' },
  resume:       { fr: 'Résumé',               ar: 'ملخص' },
  parties:      { fr: 'Parties',              ar: 'الأطراف' },
  demandeur:    { fr: 'Demandeur',            ar: 'المدعي' },
  defendeur:    { fr: 'Défendeur',            ar: 'المدعى عليه' },
  dates:        { fr: 'Dates extraites',      ar: 'التواريخ المستخرجة' },
  montants:     { fr: 'Montants',             ar: 'المبالغ' },
  faits:        { fr: 'Actions importantes',  ar: 'الإجراءات الهامة' },
  delais:       { fr: 'Délais légaux',        ar: 'الآجال القانونية' },
  juridiction:  { fr: 'Juridiction',          ar: 'الجهة القضائية' },
  mots_cles:    { fr: 'Mots-clés',            ar: 'الكلمات المفتاحية' },
  texte_ocr:    { fr: 'Texte extrait (OCR)',  ar: 'النص المستخرج (OCR)' },
  urgence:      { fr: 'Urgence',              ar: 'الاستعجال' },
  model:        { fr: 'Moteur d\'analyse',    ar: 'محرك التحليل' },
  chars:        { fr: 'Caractères',           ar: 'عدد الأحرف' },
  langue_det:   { fr: 'Langue détectée',      ar: 'اللغة المكتشفة' },
  ready:        { fr: 'prêt à analyser',      ar: 'جاهز للتحليل' },
  noHistory:    { fr: 'Aucun document OCR analysé pour le moment.', ar: 'لا توجد وثائق OCR محللة حتى الآن.' },
  histFilter:   { fr: 'Filtrer par dossier',  ar: 'تصفية حسب الملف' },
  allCases:     { fr: 'Tous les dossiers',    ar: 'جميع الملفات' },
  deleteConfirm:{ fr: 'Supprimer ce document OCR ?', ar: 'حذف هذه الوثيقة OCR؟' },
  viewDetail:   { fr: 'Voir détails',         ar: 'عرض التفاصيل' },
  back:         { fr: '← Retour',             ar: '← رجوع' },
  step1:        { fr: '📄 Fichier reçu',        ar: '📄 تم استلام الملف' },
  step2:        { fr: '🔡 Extraction texte OCR…', ar: '🔡 استخراج نص OCR…' },
  step3:        { fr: '⚙️ Analyse NLP locale…',   ar: '⚙️ تحليل NLP محلي…' },
  step4:        { fr: '💾 Sauvegarde en base…',    ar: '💾 حفظ في قاعدة البيانات…' },
  linkedCase:   { fr: 'Dossier lié',            ar: 'الملف المرتبط' },
  noneLinked:   { fr: 'Non lié',                 ar: 'غير مرتبط' },
};
const t = (key, lang) => L[key]?.[lang] || L[key]?.fr || key;

function getAuthHeaders() {
  const token = localStorage.getItem('mizan_token') || '';
  return { Authorization: `Bearer ${token}` };
}

// ─────────────────────────────────────────────────────────────
// Page principale OCR
// ─────────────────────────────────────────────────────────────
export default function OcrPage() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'history' | 'detail'
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [history, setHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [detailDoc, setDetailDoc] = useState(null);
  const [resultTab, setResultTab] = useState('extract'); // 'extract' | 'ocr'
  const fileRef = useRef();

  const lang = result?.extracted?.langue || detailDoc?.langue || 'fr';
  const ar = lang === 'ar';
  const dir = ar ? 'rtl' : 'ltr';

  // Charger les dossiers pour le dropdown
  useEffect(() => {
    fetch(`${API}/ocr/cases-select`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setCases(d.data || []); })
      .catch(() => {});
  }, []);

  // Charger l'historique
  const loadHistory = useCallback(() => {
    const url = historyFilter
      ? `${API}/ocr/history?case_id=${historyFilter}`
      : `${API}/ocr/history`;
    fetch(url, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setHistory(d.data || []); })
      .catch(() => {});
  }, [historyFilter]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  // Upload et analyse
  const handleAnalyze = async () => {
    if (!file) { setError('Sélectionnez un fichier.'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('file', file);
    if (selectedCaseId) form.append('case_id', selectedCaseId);

    try {
      const res = await fetch(`${API}/ocr/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: form,
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        setResultTab('extract');
      } else {
        setError(data.message || 'Erreur lors de l\'analyse.');
      }
    } catch (e) {
      setError(e.message || 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setResult(null); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const pickFile = (f) => {
    if (!f) return;
    setFile(f); setResult(null); setError('');
  };

  // Voir un document de l'historique
  const viewDetail = async (id) => {
    try {
      const res = await fetch(`${API}/ocr/${id}`, { headers: getAuthHeaders() });
      const d = await res.json();
      if (d.success) { setDetailDoc(d.data); setActiveTab('detail'); }
    } catch {}
  };

  // Supprimer un document OCR
  const handleDelete = async (id) => {
    if (!window.confirm(t('deleteConfirm', lang))) return;
    try {
      await fetch(`${API}/ocr/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      loadHistory();
    } catch {}
  };

  const ex = result?.extracted || {};
  const caseTitle = (caseId) => {
    const c = cases.find(c => c.id === caseId);
    return c ? `${c.title} (${c.type || ''})` : '';
  };

  return (
    <div style={{ ...S.page, direction: dir, fontFamily: ar ? "'Noto Sans Arabic', 'DM Sans', sans-serif" : "'DM Sans', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.headerIcon}>📄</div>
        <div>
          <h1 style={S.title}>{t('title', lang)}</h1>
          <p style={S.sub}>{t('sub', lang)}</p>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      {activeTab !== 'detail' && (
        <div style={S.tabBar}>
          {[
            { key: 'upload',  label: t('tabUpload', lang) },
            { key: 'history', label: t('tabHistory', lang) },
          ].map(tb => (
            <button key={tb.key} onClick={() => setActiveTab(tb.key)} style={{
              ...S.tabBtn,
              background: activeTab === tb.key ? 'linear-gradient(135deg,#7c3aed,#1e40af)' : '#f1f5f9',
              color: activeTab === tb.key ? '#fff' : '#64748b',
              fontWeight: activeTab === tb.key ? 700 : 500,
            }}>
              {tb.label}
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── TAB: Upload & Analyse ──────────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'upload' && (
        <>
          <div style={S.card}>
            {/* Sélection du dossier */}
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>{t('selectCase', lang)}</label>
              <select
                value={selectedCaseId}
                onChange={e => setSelectedCaseId(e.target.value)}
                style={S.select}
              >
                <option value="">{t('noCase', lang)}</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} — {c.client_name || ''} ({c.type || ''})</option>
                ))}
              </select>
            </div>

            {/* Zone de drop */}
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
              onClick={() => !file && fileRef.current?.click()}
              style={{
                ...S.dropZone,
                borderColor: drag ? '#7c3aed' : file ? '#22c55e' : '#cbd5e1',
                background: drag ? 'rgba(124,58,237,0.06)' : file ? '#f0fdf4' : '#f8fafc',
                cursor: file ? 'default' : 'pointer',
              }}
            >
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                  <span style={{ fontSize: 36 }}>{file.type?.includes('pdf') ? '📕' : '🖼️'}</span>
                  <div style={{ flex: 1, textAlign: ar ? 'right' : 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {(file.size / 1024).toFixed(0)} Ko · {t('ready', lang)}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); reset(); }} style={S.btnRemove}>×</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 44, marginBottom: 10, filter: 'grayscale(0.2)' }}>📂</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4 }}>{t('dropZone', lang)}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('dropSub', lang)}</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp,.docx"
              style={{ display: 'none' }} onChange={e => pickFile(e.target.files?.[0])} />

            {/* Bouton */}
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              style={{
                ...S.btnAnalyze,
                opacity: !file || loading ? 0.55 : 1,
                cursor: !file || loading ? 'default' : 'pointer',
              }}
            >
              {loading ? <><Spinner /> {t('analyzing', lang)}</> : t('analyze', lang)}
            </button>

            {/* Steps loading */}
            {loading && (
              <div style={S.steps}>
                <Step done>{t('step1', lang)}</Step>
                <Step active>{t('step2', lang)}</Step>
                <Step>{t('step3', lang)}</Step>
                <Step>{t('step4', lang)}</Step>
              </div>
            )}

            {error && <div style={S.errorBox}><span>⚠️</span> {error}</div>}
          </div>

          {/* ── Résultat ────────────────────────────────── */}
          {result && (
            <div style={S.card}>
              {/* Badge sauvegardé */}
              <div style={S.savedBadge}>{t('saved', lang)} (ID: {result.id})</div>

              {/* Méta badges */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                <MetaBadge icon={ar ? '🇲🇦' : '🇫🇷'} label={t('langue_det', lang)} value={ar ? 'العربية' : 'Français'} color={ar ? '#16a34a' : '#1e40af'} />
                <MetaBadge icon="⚙️" label={t('model', lang)} value="Moteur Local" color="#7c3aed" />
                <MetaBadge icon="📝" label={t('chars', lang)} value={result.chars?.toLocaleString()} />
                {ex.niveau_urgence && (
                  <MetaBadge icon="🚨" label={t('urgence', lang)}
                    value={ex.niveau_urgence === 'critique' ? 'CRITIQUE' : ex.niveau_urgence === 'élevé' ? 'ÉLEVÉE' : ex.niveau_urgence === 'moyen' ? 'MOYENNE' : 'FAIBLE'}
                    color={ex.niveau_urgence === 'critique' ? '#dc2626' : ex.niveau_urgence === 'élevé' ? '#ea580c' : ex.niveau_urgence === 'moyen' ? '#ca8a04' : '#16a34a'}
                  />
                )}
                {selectedCaseId && (
                  <MetaBadge icon="📁" label={t('linkedCase', lang)} value={caseTitle(parseInt(selectedCaseId))} color="#0891b2" />
                )}
              </div>

              {/* Onglets résultat */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
                {[
                  { key: 'extract', label: ar ? '📊 المعلومات المستخرجة' : '📊 Informations extraites' },
                  { key: 'ocr', label: ar ? '🔡 النص الأصلي' : '🔡 Texte OCR' },
                ].map(tb => (
                  <button key={tb.key} onClick={() => setResultTab(tb.key)} style={{
                    ...S.tab, borderBottom: resultTab === tb.key ? '2px solid #7c3aed' : '2px solid transparent',
                    color: resultTab === tb.key ? '#7c3aed' : '#64748b', fontWeight: resultTab === tb.key ? 700 : 400,
                  }}>{tb.label}</button>
                ))}
              </div>

              {/* Onglet extraction */}
              {resultTab === 'extract' && <ExtractedView ex={ex} lang={lang} ar={ar} />}

              {/* Onglet OCR texte brut */}
              {resultTab === 'ocr' && (
                <div>
                  <pre style={{ ...S.pre, direction: dir, textAlign: ar ? 'right' : 'left' }}>{result.texte_ocr}</pre>
                  <button onClick={() => navigator.clipboard.writeText(result.texte_ocr)} style={S.btnCopy}>
                    {t('copy', lang)} {t('texte_ocr', lang)}
                  </button>
                </div>
              )}

              <button onClick={reset} style={{ ...S.btnReset, marginTop: 20 }}>{t('reset', lang)}</button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── TAB: Historique ────────────────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div style={S.card}>
          {/* Filtre */}
          <div style={{ marginBottom: 16 }}>
            <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} style={S.select}>
              <option value="">{t('allCases', lang)}</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.type || ''})</option>
              ))}
            </select>
          </div>

          {history.length === 0 ? (
            <div style={S.emptyState}>
              <span style={{ fontSize: 48 }}>📭</span>
              <p>{t('noHistory', lang)}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map(doc => (
                <div key={doc.id} style={S.historyCard}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{doc.mimetype?.includes('pdf') ? '📕' : '🖼️'}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{doc.original_name}</span>
                      {doc.type_document && <span style={S.typeBadge}>{doc.type_document}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                      <span>📅 {new Date(doc.created_at).toLocaleString('fr-FR')}</span>
                      <span>📝 {doc.chars_count?.toLocaleString() || 0} chars</span>
                      {doc.langue && <span>🌐 {doc.langue === 'ar' ? 'AR' : 'FR'}</span>}
                      {doc.niveau_urgence && <span style={{
                        color: doc.niveau_urgence === 'critique' ? '#dc2626' : doc.niveau_urgence === 'élevé' ? '#ea580c' : '#64748b',
                        fontWeight: 600
                      }}>🚨 {doc.niveau_urgence}</span>}
                      {doc.case_title && <span>📁 {doc.case_title}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => viewDetail(doc.id)} style={S.btnSmall}>👁️</button>
                    <button onClick={() => handleDelete(doc.id)} style={{ ...S.btnSmall, background: '#fef2f2', color: '#ef4444' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ── TAB: Détail ───────────────────────────── */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'detail' && detailDoc && (
        <div style={S.card}>
          <button onClick={() => setActiveTab('history')} style={{ ...S.btnReset, marginBottom: 16 }}>{t('back', lang)}</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>{detailDoc.mimetype?.includes('pdf') ? '📕' : '🖼️'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{detailDoc.original_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {new Date(detailDoc.created_at).toLocaleString('fr-FR')} · {detailDoc.chars_count?.toLocaleString() || 0} chars
                {detailDoc.case_title && <> · 📁 {detailDoc.case_title}</>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <MetaBadge icon={detailDoc.langue === 'ar' ? '🇲🇦' : '🇫🇷'} label="Langue" value={detailDoc.langue === 'ar' ? 'العربية' : 'Français'} color="#1e40af" />
            {detailDoc.type_document && <MetaBadge icon="📋" label="Type" value={detailDoc.type_document} color="#7c3aed" />}
            {detailDoc.niveau_urgence && <MetaBadge icon="🚨" label="Urgence" value={detailDoc.niveau_urgence} color={detailDoc.niveau_urgence === 'critique' ? '#dc2626' : '#ea580c'} />}
          </div>

          <ExtractedView
            ex={{
              type_document: detailDoc.type_document,
              resume: detailDoc.resume,
              parties: detailDoc.parties,
              dates: detailDoc.dates_extraites,
              montants: detailDoc.montants_extraits,
              faits_principaux: detailDoc.faits_principaux,
              delais_legaux: detailDoc.delais_legaux,
              juridiction: detailDoc.juridiction,
              mots_cles: detailDoc.mots_cles,
              timeline: detailDoc.timeline,
            }}
            lang={detailDoc.langue || 'fr'}
            ar={detailDoc.langue === 'ar'}
          />

          {detailDoc.ocr_text && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>{t('texte_ocr', lang)}</div>
              <pre style={S.pre}>{detailDoc.ocr_text}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composant ExtractedView — affiche les entités extraites
// ─────────────────────────────────────────────────────────────
function ExtractedView({ ex, lang, ar }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Type */}
      <InfoBlock title={t('type', lang)} ar={ar}>
        <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: 15 }}>{ex.type_document || '—'}</span>
      </InfoBlock>

      {/* Résumé */}
      <InfoBlock title={t('resume', lang)} ar={ar} copyText={ex.resume}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: '#1e293b', margin: 0, whiteSpace: 'pre-wrap' }}>{ex.resume || '—'}</p>
      </InfoBlock>

      {/* Parties */}
      <InfoBlock title={t('parties', lang)} ar={ar}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <PartyCard label={t('demandeur', lang)} value={ex.parties?.demandeur} color="#dbeafe" />
          <PartyCard label={t('defendeur', lang)} value={ex.parties?.defendeur} color="#fce7f3" />
        </div>
      </InfoBlock>

      {/* Dates + Montants */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <InfoBlock title={t('dates', lang)} ar={ar}>
          <TagList items={ex.dates} color="#dbeafe" textColor="#1e40af" />
        </InfoBlock>
        <InfoBlock title={t('montants', lang)} ar={ar}>
          <TagList items={ex.montants} color="#dcfce7" textColor="#16a34a" />
        </InfoBlock>
      </div>

      {/* Faits */}
      <InfoBlock title={t('faits', lang)} ar={ar}>
        <ul style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(ex.faits_principaux || []).map((f, i) => (
            <li key={i} style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{f}</li>
          ))}
          {!ex.faits_principaux?.length && <li style={{ color: '#94a3b8' }}>—</li>}
        </ul>
      </InfoBlock>

      {/* Délais + Juridiction */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <InfoBlock title={t('delais', lang)} ar={ar}>
          <TagList items={ex.delais_legaux} color="#fef3c7" textColor="#d97706" />
        </InfoBlock>
        <InfoBlock title={t('juridiction', lang)} ar={ar}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>{ex.juridiction || '—'}</span>
        </InfoBlock>
      </div>

      {/* Mots-clés */}
      <InfoBlock title={t('mots_cles', lang)} ar={ar}>
        <TagList items={ex.mots_cles} color="#f3e8ff" textColor="#7c3aed" />
      </InfoBlock>

      {/* Timeline */}
      {ex.timeline?.length > 0 && (
        <InfoBlock title={ar ? '📅 الجدول الزمني' : '📅 Chronologie'} ar={ar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', paddingInlineStart: 24, borderInlineStart: '2px solid #cbd5e1', marginBlock: 10 }}>
            {ex.timeline.map((evt, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: ar ? 'auto' : -29, right: ar ? -29 : 'auto', top: 5, width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#1e40af)', boxShadow: '0 0 0 3px #fff, 0 0 0 5px #7c3aed' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>{evt.date}</span>
                  <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{evt.evenement}</span>
                </div>
              </div>
            ))}
          </div>
        </InfoBlock>
      )}

      <button onClick={() => navigator.clipboard.writeText(JSON.stringify(ex, null, 2))} style={S.btnCopy}>📋 Copier JSON</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────
function InfoBlock({ title, children, ar, copyText }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>{title}</div>
        {copyText && <button onClick={() => navigator.clipboard.writeText(copyText)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>📋</button>}
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
        <span key={i} style={{ background: color, color: textColor, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{item}</span>
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

function Step({ children, done, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: done ? '#16a34a' : active ? '#7c3aed' : '#94a3b8', fontWeight: active ? 600 : 400 }}>
      <span>{done ? '✓' : active ? '⏳' : '○'}</span>
      {children}
    </div>
  );
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const S = {
  page:       { padding: '28px 32px', maxWidth: 940 },
  header:     { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  headerIcon: { width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, color: '#fff', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' },
  title:      { fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' },
  sub:        { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  tabBar:     { display: 'flex', gap: 8, marginBottom: 20 },
  tabBtn:     { padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' },
  card:       { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  label:      { fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 },
  select:     { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', outline: 'none' },
  dropZone:   { border: '2px dashed', borderRadius: 12, padding: '32px 20px', textAlign: 'center', transition: 'all .15s', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, flexDirection: 'column' },
  btnRemove:  { background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginInlineStart: 'auto' },
  btnAnalyze: { width: '100%', padding: 13, background: 'linear-gradient(135deg,#7c3aed,#1e40af)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' },
  steps:      { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14, padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' },
  errorBox:   { marginTop: 14, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 },
  savedBadge: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', color: '#15803d', fontSize: 13, fontWeight: 600, marginBottom: 16, textAlign: 'center' },
  tab:        { padding: '9px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' },
  pre:        { fontSize: 12, lineHeight: 1.7, background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 10, maxHeight: 380, overflowY: 'auto', marginBottom: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  btnCopy:    { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#334155' },
  btnReset:   { background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 9, padding: '9px 18px', fontSize: 13, cursor: 'pointer', color: '#64748b', fontFamily: 'inherit' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8' },
  historyCard:{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, transition: 'all .15s' },
  typeBadge:  { background: '#f3e8ff', color: '#7c3aed', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 },
  btnSmall:   { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, width: 34, height: 34, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
