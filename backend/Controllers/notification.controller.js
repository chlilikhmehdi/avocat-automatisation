const { pool } = require('../db/dbConfig');
const { sseClients } = require('../services/notificationService');

const ok = (res, status, data = {}, message = '') =>
  res.status(status).json({ success: status < 400, message, ...data });

/**
 * Récupère la liste des notifications de l'utilisateur connecté.
 */
exports.listNotifications = async (req, res) => {
  const userId = req.user.id;
  const { unread } = req.query;

  let query = 'SELECT * FROM notifications WHERE user_id = $1';
  const params = [userId];

  if (unread === 'true') {
    query += ' AND is_read = FALSE';
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  try {
    const { rows } = await pool.query(query, params);
    return ok(res, 200, { data: rows });
  } catch (err) {
    console.error('[notifications/list]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * Marque une notification comme lue.
 */
exports.markAsRead = async (req, res) => {
  const notificationId = parseInt(req.params.id);
  const userId = req.user.id;

  if (isNaN(notificationId)) {
    return ok(res, 400, {}, 'ID de notification invalide');
  }

  try {
    const { rows } = await pool.query(
      `UPDATE notifications SET is_read = TRUE 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    if (!rows[0]) {
      return ok(res, 404, {}, 'Notification introuvable');
    }

    return ok(res, 200, { data: rows[0] }, 'Notification marquée comme lue');
  } catch (err) {
    console.error('[notifications/markRead]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * Marque toutes les notifications de l'utilisateur comme lues.
 */
exports.markAllAsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
      [userId]
    );
    return ok(res, 200, {}, 'Toutes les notifications ont été marquées comme lues');
  } catch (err) {
    console.error('[notifications/markAllRead]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

/**
 * Établit un flux SSE temps réel pour diffuser les notifications.
 */
exports.streamNotifications = async (req, res) => {
  const userId = parseInt(req.user.id);

  // Configuration des headers SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Recommandé pour Nginx / proxying
  });

  // Envoyer un message initial de confirmation
  res.write(':ok\n\n');

  // Enregistrer le client
  const clientRecord = { userId, res };
  sseClients.push(clientRecord);

  // Intervalle keep-alive (30 secondes) pour éviter que la connexion ne se ferme toute seule
  const keepAlive = setInterval(() => {
    try {
      res.write(':keepalive\n\n');
    } catch (err) {
      // Ignorer si la socket est déjà fermée
    }
  }, 30000);

  // Nettoyage de la connexion lors de la déconnexion du client
  req.on('close', () => {
    clearInterval(keepAlive);
    const index = sseClients.indexOf(clientRecord);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
    console.log(`[notifications/sse] Connexion fermée pour l'utilisateur ${userId}`);
  });
};
