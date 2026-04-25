const COLORS = {
    ADMIN:     '#ef4444',
    LAWYER:    '#3b82f6',
    ASSISTANT: '#10b981',
    CLIENT:    '#6b7280',
  };
  
  export default function UserAvatar({ name, size = 34, role }) {
    const initials = name
      ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
      : '?';
  
    return (
      <div
        className="avatar"
        style={{
          width: size,
          height: size,
          background: COLORS[role] || '#6b7280',
          fontSize: size * 0.38,
        }}
      >
        {initials}
      </div>
    );
  }