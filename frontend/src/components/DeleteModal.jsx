import { useLang } from '../context/LangContext';

export default function DeleteModal({ user, onConfirm, onClose }) {
  const { t } = useLang();

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">{t.confirmDelete}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', padding: '30px 26px' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
          <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.5 }}>
            {t.deleteMsg} <strong>{user?.nom}</strong> ?
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost"  onClick={onClose}>{t.cancel}</button>
          <button className="btn-danger" onClick={onConfirm}>{t.yes}</button>
        </div>
      </div>
    </div>
  );
}