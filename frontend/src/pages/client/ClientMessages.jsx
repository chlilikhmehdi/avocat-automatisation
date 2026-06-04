import { useState, useEffect } from 'react';
import api from '../../services/api';

const ClientMessages = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const bgCard = 'white';

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get('/client/messages');
        if (response.success) {
          setMessages(response.data);
        }
      } catch (error) {
        console.error("Erreur de récupération des messages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const response = await api.post('/client/messages', { content: newMessage });
      if (response.success) {
        setMessages([...messages, response.data]);
        setNewMessage('');
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '40px' }}>Chargement...</div>;
  }

  const user = JSON.parse(localStorage.getItem('mizan_user') || '{}');

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: 'bold' }}>💬 Mes messages</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {messages.length === 0 ? (
          <p style={{ color: '#718096', textAlign: 'center' }}>Aucun message pour le moment.</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} style={{
                padding: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                borderWidth: '1px',
                borderRadius: '8px',
                backgroundColor: bgCard,
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                width: '80%',
                borderColor: isMe ? '#90cdf4' : '#e2e8f0',
                borderStyle: 'solid'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '4px' }}>
                  {new Date(msg.created_at).toLocaleString('fr-MA')}
                </p>
                <p>{msg.content}</p>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input 
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: '4px' }}
          placeholder="Tapez votre message ici..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button 
          style={{ padding: '8px 16px', backgroundColor: '#3182ce', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          onClick={handleSendMessage}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default ClientMessages;
