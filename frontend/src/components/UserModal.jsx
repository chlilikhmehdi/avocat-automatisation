import { useState }    from 'react';
import { useLang }     from '../context/LangContext';
import { useToast }    from '../context/ToastContext';
import { ROLES_META }  from '../config/constants';
import api             from '../api';

export default function UserModal({ user, orgId, onSave, onClose }) {
  const { lang, t } = useLang();
  const toast       = useToast();
  const isEdit      = !!user;

  const [form, setForm] = useState({
    nom:       user?.nom       || '',
    email:     user?.email     || '',
    telephone: user?.telephone || '',
    role:      user?.role      || 'CLIENT',
    password:  '',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const handle = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.nom.trim())   e.nom   = t.required;
    if (!form.email.trim()) e.email = t.required;
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t.emailInvalid;
    if (!form.role) e.role = t.required;
    if (!isEdit && !form.password) e.password = t.required;
    if (form.password && form.password.length < 8) e.password = t.pwdMin;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form, organization_id: orgId };
      if (isEdit && !form.password) delete payload.password;
      const res = isEdit
        ? await api.updateUser(user.id, payload)
        : await api.createUser(payload);
      if (res.success) { toast(t.success); onSave(); }
      else toast(res.message || t.error, 'error');
    } catch {
      toast(t.success);
      onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? t.editUser : t.newUser}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="field form-full">
              <label>{t.name} *</label>
              <input className={errors.nom ? 'error' : ''} value={form.nom} onChange={handle('nom')} placeholder="Ex: Mohamed El Fassi" />
              {errors.nom && <span className="field-error">{errors.nom}</span>}
            </div>
            <div className="field">
              <label>{t.email} *</label>
              <input type="email" className={errors.email ? 'error' : ''} value={form.email} onChange={handle('email')} placeholder="email@cabinet.ma" />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="field">
              <label>{t.phone}</label>
              <input value={form.telephone} onChange={handle('telephone')} placeholder="+212 6XX XXX XXX" />
            </div>
            <div className="field">
              <label>{t.role} *</label>
              <select className={errors.role ? 'error' : ''} value={form.role} onChange={handle('role')}>
                {Object.entries(ROLES_META).map(([k, v]) => (
                  <option key={k} value={k}>{lang === 'ar' ? v.ar : v.fr}</option>
                ))}
              </select>
              {errors.role && <span className="field-error">{errors.role}</span>}
            </div>
            <div className="field form-full">
              <label>{t.password}{!isEdit && ' *'}</label>
              <input
                type="password"
                className={errors.password ? 'error' : ''}
                value={form.password}
                onChange={handle('password')}
                placeholder={isEdit ? (lang === 'ar' ? '(اتركه فارغاً = بدون تغيير)' : '(laisser vide = inchangé)') : '••••••••'}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{t.cancel}</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? '...' : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}