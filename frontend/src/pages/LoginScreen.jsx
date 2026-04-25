import { useState }    from 'react';
import { useLang }     from '../context/LangContext';
import { useToast }    from '../context/ToastContext';
import { MOCK_USERS }  from '../config/constants';
import api             from '../api';

export default function LoginScreen({ onLogin }) {
  const { lang, t } = useLang();
  const toast       = useToast();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = t.required;
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t.emailInvalid;
    if (!password) e.password = t.required;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.success && res.token) {
        onLogin(res.user, res.token);
      } else {
        toast(res.message || t.error, 'error');
      }
    } catch {
      // Mode démo : si le serveur est absent, on utilise les mock users
      const demoUser = MOCK_USERS.find((u) => u.email === email);
      if (demoUser && password.length >= 8) {
        onLogin(demoUser, 'demo_token_' + Date.now());
        toast(t.success);
      } else {
        toast(lang === 'ar' ? 'بريد أو كلمة مرور غير صحيحة' : 'Email ou mot de passe incorrect', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="login-card">
        <div className="login-logo"><div className="login-logo-dot" />MiZan</div>
        <p className="login-subtitle">{t.loginSubtitle}</p>

        <div className="login-demo">
          <strong>🔑 Démo / تجريبي</strong>
          admin@benali.ma · motdepasse123
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>{t.email} *</label>
          <input
            type="email"
            className={errors.email ? 'error' : ''}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="email@cabinet.ma"
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="field" style={{ marginBottom: 28 }}>
          <label>{t.password} *</label>
          <input
            type="password"
            className={errors.password ? 'error' : ''}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="••••••••"
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <button
          className="btn-primary"
          onClick={submit}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 15 }}
        >
          {loading ? '...' : t.login}
        </button>
      </div>
    </div>
  );
}