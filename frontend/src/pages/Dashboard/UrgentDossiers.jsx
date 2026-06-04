import { useState, useEffect } from 'react';
import api from '../../services/api';
import PriorityBadge from '../../components/PriorityBadge';

const UrgentDossiers = () => {
  const [urgentCases, setUrgentCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrgentCases = async () => {
      try {
        const response = await api.get('/priority/urgent-cases');
        if (response.success) {
          setUrgentCases(response.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des dossiers urgents", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUrgentCases();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Chargement...</div>;
  }

  return (
    <div style={{ marginTop: '24px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderWidth: '1px', borderRadius: '8px', backgroundColor: 'white' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#c53030' }}>🚨 Dossiers Urgents & Alertes</h2>
      
      {urgentCases.length === 0 ? (
        <p>Aucun dossier urgent pour le moment.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f7fafc' }}>
              <th style={{ padding: '8px' }}>N° Dossier</th>
              <th style={{ padding: '8px' }}>Titre</th>
              <th style={{ padding: '8px' }}>Date limite</th>
              <th style={{ padding: '8px' }}>Priorité</th>
            </tr>
          </thead>
          <tbody>
            {urgentCases.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.case_number}</td>
                <td style={{ padding: '8px' }}>{c.title}</td>
                <td style={{ padding: '8px' }}>{c.nearest_deadline ? new Date(c.nearest_deadline).toLocaleDateString() : 'N/A'}</td>
                <td style={{ padding: '8px' }}>
                  <PriorityBadge priority={c.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UrgentDossiers;
