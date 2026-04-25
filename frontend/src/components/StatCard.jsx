export default function StatCard({ icon, value, label, bg, color }) {
    return (
      <div className="stat-card">
        <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
    );
  }