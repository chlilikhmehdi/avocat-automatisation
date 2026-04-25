import { ROLES_META } from '../config/constants';
import { useLang }     from '../context/LangContext';

export default function RoleBadge({ role }) {
  const { lang }  = useLang();
  const meta      = ROLES_META[role] || ROLES_META.CLIENT;
  return (
    <span className="badge" style={{ background: meta.bg, color: meta.color }}>
      <span className="badge-dot" style={{ background: meta.color }} />
      {lang === 'ar' ? meta.ar : meta.fr}
    </span>
  );
}