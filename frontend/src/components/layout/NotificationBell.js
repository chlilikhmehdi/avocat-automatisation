import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useLang } from '../../context/LangContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function NotificationBell() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const dropdownRef = useRef(null);

  // Charger les notifications existantes
  const fetchNotifications = () => {
    api.getNotifications()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setNotifications(res.data);
        }
      })
      .catch((err) => console.error('Erreur lors du chargement des notifications :', err));
  };

  useEffect(() => {
    fetchNotifications();

    // Connexion SSE (Server-Sent Events) pour le temps réel
    const token = api.getToken();
    if (!token) return;

    const streamUrl = `${API_BASE.replace('/api', '')}/api/notifications/stream?token=${token}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data);
        // Ajouter la nouvelle notification en tête de liste
        setNotifications((prev) => [notif, ...prev]);
        
        // Déclencher l'animation visuelle de secousse du grelot
        setWiggle(true);
        setTimeout(() => setWiggle(false), 1000);
      } catch (err) {
        console.error('Erreur traitement notification SSE :', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('Reconnexion au flux de notifications...', err);
    };

    // Fermer le clic en dehors du menu déroulant
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      eventSource.close();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.markNotificationRead(id);
      if (res.success) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
      }
    } catch (err) {
      console.error('Erreur marquage lecture :', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.markAllNotificationsRead();
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Erreur tout marquer comme lu :', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'hearing': return '⚖️';
      case 'document': return '📁';
      case 'deadline': return '⏳';
      case 'invoice': return '🧾';
      default: return '🔔';
    }
  };

  const formatNotifDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div ref={dropdownRef} style={{ position: 'fixed', top: 14, right: 140, zIndex: 999 }}>
      {/* Bouton de la Cloche */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '18px',
          position: 'relative',
          outline: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,.08)',
          transition: 'all 0.2s ease',
          animation: wiggle ? 'wiggle 0.5s ease-in-out infinite' : 'none'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: '700',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Animation wiggle */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(-15deg); }
          30% { transform: rotate(12deg); }
          45% { transform: rotate(-10deg); }
          60% { transform: rotate(8deg); }
          75% { transform: rotate(-4deg); }
        }
      `}</style>

      {/* Menu déroulant des notifications */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '46px',
          right: lang === 'ar' ? 'auto' : '0',
          left: lang === 'ar' ? '0' : 'auto',
          width: '350px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'slideUp 0.15s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc'
          }}>
            <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
              Notifications ({unreadCount})
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1e40af',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                Tout lire
              </button>
            )}
          </div>

          {/* Liste des notifications */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '30px 16px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13px'
              }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📭</span>
                Aucune notification
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '12px',
                    transition: 'background 0.2s',
                    backgroundColor: notif.is_read ? 'transparent' : 'rgba(30, 64, 175, 0.03)',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : 'rgba(30, 64, 175, 0.03)'}
                >
                  {/* Icône du type */}
                  <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>
                    {getTypeIcon(notif.type)}
                  </span>

                  {/* Contenu textuel */}
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: notif.is_read ? '500' : '700',
                      fontSize: '13px',
                      color: '#0f172a',
                      marginBottom: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {notif.title}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#475569',
                      lineHeight: '1.4',
                      marginBottom: '4px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {notif.message}
                    </div>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {formatNotifDate(notif.created_at)}
                    </span>
                  </div>

                  {/* Bouton de marquage individuel */}
                  {!notif.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      title="Marquer comme lu"
                      style={{
                        alignSelf: 'center',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '4px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.color = '#1e40af';
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
