import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const L = {
  title:        { fr: 'Générateur de Documents', ar: 'منشئ الوثائق' },
  sub:          { fr: 'Générez des actes juridiques à partir de modèles Word (.docx)', ar: 'قم بإنشاء مستندات قانونية من نماذج Word (.docx)' },
  uploadBtn:    { fr: 'Ajouter un modèle', ar: 'إضافة نموذج' },
  selectCase:   { fr: 'Sélectionnez un dossier juridique', ar: 'اختر ملفًا قانونيًا' },
  generateBtn:  { fr: 'Générer le document', ar: 'إنشاء الوثيقة' },
  generating:   { fr: 'Génération en cours...', ar: 'جاري الإنشاء...' },
  noTemplates:  { fr: 'Aucun modèle disponible. Veuillez en uploader un.', ar: 'لا توجد نماذج. يرجى رفع واحد.' },
  download:     { fr: 'Télécharger', ar: 'تحميل' },
  delete:       { fr: 'Supprimer', ar: 'حذف' },
};

function getAuthHeaders() {
  const token = localStorage.getItem('mizan_token') || '';
  return { Authorization: `Bearer ${token}` };
}

export default function TemplateGeneratorPage() {
  const lang = 'fr'; // TODO: useLang() if needed
  const ar = lang === 'ar';
  const dir = ar ? 'rtl' : 'ltr';

  const [templates, setTemplates] = useState([]);
  const [cases, setCases] = useState([]);
  
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedCase, setSelectedCase] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const fileRef = useRef(null);

  // Load data
  useEffect(() => {
    fetchCases();
    fetchTemplates();
  }, []);

  const fetchCases = async () => {
    try {
      const res = await api.getCases();
      if (res.success) setCases(res.data);
    } catch (e) {}
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API}/templates`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setTemplates(data.data);
    } catch (e) {}
  };

  const handleUploadClick = () => fileRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace('.docx', ''));

    setUploading(true);
    try {
      const res = await fetch(`${API}/templates/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        fetchTemplates();
      } else {
        setError(data.message || "Erreur lors de l'upload.");
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Supprimer ce modèle ?")) return;
    try {
      await fetch(`${API}/templates/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchTemplates();
      if (selectedTemplate === id.toString()) setSelectedTemplate('');
    } catch (e) {}
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) { setError("Veuillez sélectionner un modèle."); return; }
    if (!selectedCase) { setError("Veuillez sélectionner un dossier."); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/templates/generate`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          caseId: selectedCase,
          customData: {} // Here we could add dynamic form inputs based on the template
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erreur de génération.");
      }

      // Handle file download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Document_Genere_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, direction: dir }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#2563eb,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff' }}>
            ✍️
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' }}>{L.title[lang]}</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{L.sub[lang]}</p>
          </div>
        </div>
        <button onClick={handleUploadClick} disabled={uploading} style={{ padding: '10px 18px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
          {uploading ? '⏳...' : '➕ ' + L.uploadBtn[lang]}
        </button>
        <input type="file" accept=".docx" ref={fileRef} style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>{error}</div>}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 24 }}>
        
        {/* Ligne 1: Choisir le modèle */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>1. Modèle DOCX</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {templates.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{L.noTemplates[lang]}</div>
            ) : (
              templates.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setSelectedTemplate(t.id)}
                  style={{ 
                    border: selectedTemplate === t.id ? '2px solid #2563eb' : '1px solid #e2e8f0', 
                    background: selectedTemplate === t.id ? '#eff6ff' : '#f8fafc',
                    padding: 16, borderRadius: 10, cursor: 'pointer', position: 'relative'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>📄 {t.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(t.created_at).toLocaleDateString()}</div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >🗑</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ligne 2: Choisir le dossier */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>2. {L.selectCase[lang]}</label>
          <select 
            value={selectedCase} 
            onChange={(e) => setSelectedCase(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}
          >
            <option value="">-- Sélectionnez un dossier --</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.title} — {c.client_name}</option>
            ))}
          </select>
        </div>

        {/* Action Générer */}
        <button 
          onClick={handleGenerate}
          disabled={loading || !selectedTemplate || !selectedCase}
          style={{ width: '100%', padding: 14, background: loading || !selectedTemplate || !selectedCase ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading || !selectedTemplate || !selectedCase ? 'not-allowed' : 'pointer' }}
        >
          {loading ? L.generating[lang] : L.generateBtn[lang]}
        </button>
      </div>

      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
        <strong>💡 Comment ça marche ?</strong><br/>
        Créez un document Word (.docx) et ajoutez des variables entre accolades (ex: <code>{"{title}"}</code>, <code>{"{client_nom}"}</code>, <code>{"{date_jour}"}</code>). Uploadez le modèle, choisissez un dossier, et le système remplacera automatiquement les balises par les données du dossier !
      </div>
    </div>
  );
}
