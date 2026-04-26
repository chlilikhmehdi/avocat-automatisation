import { ROLES_META } from '../../constants/roles';

// ── RoleBadge ──────────────────────────────────
export function RoleBadge({ role, lang }) {
  const meta = ROLES_META[role] || ROLES_META.CLIENT;
  return (
    <span className="badge" style={{ background: meta.bg, color: meta.color }}>
      <span className="badge-dot" style={{ background: meta.color }} />
      {lang === 'ar' ? meta.ar : meta.fr}
    </span>
  );
}

// ── UserAvatar ─────────────────────────────────
const AVATAR_COLORS = {
  ADMIN: '#ef4444',
  LAWYER: '#3b82f6',
  ASSISTANT: '#10b981',
  CLIENT: '#6b7280',
};

export function UserAvatar({ name, size = 34, role }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: AVATAR_COLORS[role] || '#6b7280',
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}

// ── StatCard ───────────────────────────────────
export function StatCard({ icon, value, label, bg, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg, color }}>
        {icon}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}