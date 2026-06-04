import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';

const StatisticsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgCard = 'white';
  const textColor = '#1a202c';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/statistics/dashboard');
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '40px' }}>Chargement des statistiques...</div>;
  }

  if (!stats) {
    return <div style={{ textAlign: 'center', marginTop: '40px' }}><p>Impossible de charger les statistiques.</p></div>;
  }

  const { totalDossiers, dossiersActifs, dossiersTermines, tauxReussite, revenusMensuels, avocatCharge, audiencesParMois } = stats;

  const pieData = [
    { name: 'Actifs', value: dossiersActifs },
    { name: 'Terminés', value: dossiersTermines },
  ];
  const COLORS = ['#0088FE', '#00C49F'];

  const cardStyle = {
    padding: '20px', 
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
    borderWidth: '1px', 
    borderRadius: '8px', 
    backgroundColor: bgCard,
    marginBottom: '20px'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  };

  const chartGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px'
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '24px', color: textColor, fontSize: '2rem', fontWeight: 'bold' }}>📊 Statistiques Intelligentes</h1>

      <div style={gridStyle}>
        <div style={cardStyle}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#718096' }}>Total des dossiers</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{totalDossiers}</p>
          </div>
        </div>
        <div style={cardStyle}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#718096' }}>Dossiers Actifs</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{dossiersActifs}</p>
          </div>
        </div>
        <div style={cardStyle}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#718096' }}>Taux de réussite</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{tauxReussite}%</p>
            <p style={{ fontSize: '0.75rem', color: '#a0aec0' }}>Sur dossiers clôturés</p>
          </div>
        </div>
        <div style={cardStyle}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#718096' }}>Avocat le plus chargé</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {avocatCharge ? `${avocatCharge.first_name} ${avocatCharge.last_name}` : 'N/A'}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{avocatCharge ? `${avocatCharge.case_count} dossiers en cours` : ''}</p>
          </div>
        </div>
      </div>

      <div style={chartGridStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>Revenus Mensuels</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenusMensuels}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="total" fill="#8884d8" name="Revenus (€)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>Audiences par mois</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={audiencesParMois}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#82ca9d" name="Nombre d'audiences" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>Répartition des dossiers</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
