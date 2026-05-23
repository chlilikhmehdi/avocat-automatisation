// controllers/hearing.controller.js
const { pool } = require('../db/dbConfig');

const ok = (res, status, data = {}, message = '') =>
  res.status(status).json({ success: status < 400, message, ...data });

// ─── Ownership helper ─────────────────────────────────────────────────────────
async function getOwnedHearing(hearingId, lawyerId) {
  const { rows } = await pool.query(
    `SELECT h.*, ca.title AS case_title
     FROM hearings h
     LEFT JOIN cases ca ON ca.id = h.case_id   -- LEFT JOIN : case_id peut être NULL
     WHERE h.id = $1`,
    [hearingId]
  );
  const hearing = rows[0];
  if (!hearing)                       return { hearing: null, status: 404 };
  if (hearing.lawyer_id !== lawyerId) return { hearing: null, status: 403 };
  return { hearing, status: 200 };
}

// ─── Couleur statut ───────────────────────────────────────────────────────────
function statusColor(status) {
  return {
    scheduled: '#1e40af',
    completed: '#16a34a',
    postponed: '#f59e0b',
    cancelled: '#94a3b8',
  }[status] || '#64748b';
}

// =============================================================================
// GET /api/hearings/calendar?month=YYYY-MM
// Fix : LEFT JOIN au lieu de JOIN pour ne pas perdre les audiences sans dossier
// =============================================================================
exports.getCalendarEvents = async (req, res) => {
  const lawyerId = req.user.id;
  const { month } = req.query; // format YYYY-MM

  try {
    let hearingParams = [lawyerId];
    let dateFilter    = '';

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m]  = month.split('-').map(Number);
      const start   = `${month}-01`;
      const lastDay = new Date(y, m, 0).getDate(); // dernier jour du mois
      const end     = `${month}-${String(lastDay).padStart(2, '0')}`;
      dateFilter    = 'AND h.hearing_date BETWEEN $2 AND $3';
      hearingParams = [lawyerId, start, end];
    }

    // ── Audiences : LEFT JOIN pour inclure celles sans dossier ───────────────
    const { rows: hearings } = await pool.query(
      `SELECT
         h.id,
         h.title,
         h.hearing_date  AS date,
         h.hearing_time  AS time,
         h.location,
         h.status,
         h.description,
         ca.title AS case_title
       FROM hearings h
       LEFT JOIN cases ca ON ca.id = h.case_id
       WHERE h.lawyer_id = $1 ${dateFilter}
       ORDER BY h.hearing_date ASC, h.hearing_time ASC NULLS LAST`,
      hearingParams
    );

    // ── Délais légaux : LEFT JOIN aussi ──────────────────────────────────────
    let dlParams   = [lawyerId];
    let dlFilter   = '';

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m]  = month.split('-').map(Number);
      const start   = `${month}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end     = `${month}-${String(lastDay).padStart(2, '0')}`;
      dlFilter      = 'AND ld.deadline_date BETWEEN $2 AND $3';
      dlParams      = [lawyerId, start, end];
    }

    const { rows: deadlines } = await pool.query(
      `SELECT
         ld.id,
         ld.title,
         ld.deadline_date AS date,
         ld.status,
         ca.title AS case_title
       FROM legal_deadlines ld
       LEFT JOIN cases ca ON ca.id = ld.case_id
       WHERE ld.lawyer_id = $1 ${dlFilter}
       ORDER BY ld.deadline_date ASC`,
      dlParams
    );

    // ── Format FullCalendar / CalendarPage ───────────────────────────────────
    const events = [
      ...hearings.map(h => ({
        id:    `hearing-${h.id}`,
        title: h.title,
        start: h.time
          ? `${h.date instanceof Date ? h.date.toISOString().split('T')[0] : String(h.date).split('T')[0]}T${h.time}`
          : (h.date instanceof Date ? h.date.toISOString().split('T')[0] : String(h.date).split('T')[0]),
        extendedProps: {
          type:       'hearing',
          status:     h.status,
          location:   h.location,
          case_title: h.case_title || null,
          description:h.description,
        },
        backgroundColor: statusColor(h.status),
        borderColor:     statusColor(h.status),
      })),
      ...deadlines.map(d => ({
        id:    `deadline-${d.id}`,
        title: `⚖️ ${d.title}`,
        start: d.date instanceof Date
          ? d.date.toISOString().split('T')[0]
          : String(d.date).split('T')[0],
        extendedProps: {
          type:       'deadline',
          status:     d.status,
          case_title: d.case_title || null,
        },
        backgroundColor: d.status === 'expired' ? '#ef4444' : '#f59e0b',
        borderColor:     d.status === 'expired' ? '#ef4444' : '#f59e0b',
      })),
    ];

    return ok(res, 200, { data: events });
  } catch (err) {
    console.error('[hearings/calendar]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// GET /api/hearings
// =============================================================================
exports.listHearings = async (req, res) => {
  const lawyerId = req.user.id;
  const { date, status, case_id, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = ['h.lawyer_id = $1'];
  const params     = [lawyerId];
  let   idx        = 2;

  if (date)    { conditions.push(`h.hearing_date = $${idx++}`);              params.push(date); }
  if (status)  { conditions.push(`h.status = $${idx++}`);                    params.push(status); }
  if (case_id) { conditions.push(`h.case_id = $${idx++}`);                   params.push(parseInt(case_id)); }
  if (search)  {
    conditions.push(`(h.title ILIKE $${idx} OR h.location ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM hearings h WHERE ${where}`, params
    );

    const { rows } = await pool.query(
      `SELECT h.*,
              ca.title AS case_title,
              u.nom    AS lawyer_name
       FROM hearings h
       LEFT JOIN cases ca ON ca.id = h.case_id
       LEFT JOIN users u  ON u.id  = h.lawyer_id
       WHERE ${where}
       ORDER BY h.hearing_date ASC, h.hearing_time ASC NULLS LAST
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    return ok(res, 200, {
      data: rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[hearings/list]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// GET /api/hearings/:id
// =============================================================================
exports.getHearing = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return ok(res, 400, {}, 'ID invalide');
  const { hearing, status } = await getOwnedHearing(id, req.user.id);
  if (status === 404) return ok(res, 404, {}, 'Audience introuvable');
  if (status === 403) return ok(res, 403, {}, 'Accès refusé');
  return ok(res, 200, { data: hearing });
};

// =============================================================================
// POST /api/hearings
// Fix : case_id devient OPTIONNEL
// =============================================================================
exports.createHearing = async (req, res) => {
  const lawyerId = req.user.id;
  const {
    case_id,                        // ← optionnel
    title, description,
    hearing_date, hearing_time,
    location, status = 'scheduled',
  } = req.body;

  if (!title?.trim())  return ok(res, 400, {}, 'Titre obligatoire');
  if (!hearing_date)   return ok(res, 400, {}, 'Date obligatoire');

  // Vérifier le dossier uniquement si case_id fourni
  if (case_id) {
    const caseCheck = await pool.query(
      'SELECT id FROM cases WHERE id = $1 AND lawyer_id = $2 AND deleted_at IS NULL',
      [case_id, lawyerId]
    );
    if (!caseCheck.rows[0]) {
      return ok(res, 403, {}, 'Dossier introuvable ou accès refusé');
    }
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO hearings
         (case_id, lawyer_id, title, description, hearing_date, hearing_time, location, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        case_id || null,
        lawyerId,
        title.trim(),
        description || null,
        hearing_date,
        hearing_time || null,
        location || null,
        status,
      ]
    );

    // Log historique uniquement si case_id fourni
    if (case_id) {
      await pool.query(
        `INSERT INTO case_history (case_id, action, created_by) VALUES ($1,$2,$3)`,
        [case_id, `Audience créée : ${title} le ${hearing_date}`, lawyerId]
      ).catch(() => {});
    }

    return ok(res, 201, { data: rows[0] }, 'Audience créée');
  } catch (err) {
    console.error('[hearings/create]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// PUT /api/hearings/:id
// =============================================================================
exports.updateHearing = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return ok(res, 400, {}, 'ID invalide');
  const { hearing, status } = await getOwnedHearing(id, req.user.id);
  if (status === 404) return ok(res, 404, {}, 'Audience introuvable');
  if (status === 403) return ok(res, 403, {}, 'Accès refusé');

  const { title, description, hearing_date, hearing_time, location, status: newStatus } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE hearings SET
         title        = COALESCE($1, title),
         description  = COALESCE($2, description),
         hearing_date = COALESCE($3, hearing_date),
         hearing_time = COALESCE($4, hearing_time),
         location     = COALESCE($5, location),
         status       = COALESCE($6, status),
         updated_at   = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, description, hearing_date, hearing_time, location, newStatus, hearing.id]
    );
    return ok(res, 200, { data: rows[0] }, 'Audience mise à jour');
  } catch (err) {
    console.error('[hearings/update]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// DELETE /api/hearings/:id
// =============================================================================
exports.deleteHearing = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return ok(res, 400, {}, 'ID invalide');
  const { hearing, status } = await getOwnedHearing(id, req.user.id);
  if (status === 404) return ok(res, 404, {}, 'Audience introuvable');
  if (status === 403) return ok(res, 403, {}, 'Accès refusé');

  try {
    await pool.query('DELETE FROM hearings WHERE id = $1', [hearing.id]);
    return ok(res, 200, {}, 'Audience supprimée');
  } catch (err) {
    console.error('[hearings/delete]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// GET /api/hearings/reminders
// =============================================================================
exports.getReminders = async (req, res) => {
  const lawyerId = req.user.id;
  try {
    const base = `
      FROM hearings h
      LEFT JOIN cases ca ON ca.id = h.case_id
      WHERE h.lawyer_id = $1 AND h.status = 'scheduled'`;

    const [todayRes, tomorrowRes, upcomingRes, deadlinesRes] = await Promise.all([
      pool.query(`SELECT h.*, ca.title AS case_title ${base} AND h.hearing_date = CURRENT_DATE ORDER BY h.hearing_time`, [lawyerId]),
      pool.query(`SELECT h.*, ca.title AS case_title ${base} AND h.hearing_date = CURRENT_DATE + 1 ORDER BY h.hearing_time`, [lawyerId]),
      pool.query(`SELECT h.*, ca.title AS case_title ${base} AND h.hearing_date BETWEEN CURRENT_DATE + 2 AND CURRENT_DATE + 7 ORDER BY h.hearing_date, h.hearing_time`, [lawyerId]),
      pool.query(
        `SELECT ld.*, ca.title AS case_title
         FROM legal_deadlines ld
         LEFT JOIN cases ca ON ca.id = ld.case_id
         WHERE ld.lawyer_id = $1 AND ld.status = 'pending'
           AND ld.deadline_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
         ORDER BY ld.deadline_date`,
        [lawyerId]
      ),
    ]);

    return ok(res, 200, {
      data: {
        today:     todayRes.rows,
        tomorrow:  tomorrowRes.rows,
        upcoming:  upcomingRes.rows,
        deadlines: deadlinesRes.rows,
      },
    });
  } catch (err) {
    console.error('[hearings/reminders]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// GET /api/hearings/deadlines
// =============================================================================
exports.listDeadlines = async (req, res) => {
  const lawyerId = req.user.id;
  const { case_id } = req.query;

  let where  = 'ld.lawyer_id = $1';
  const params = [lawyerId];
  if (case_id) { where += ' AND ld.case_id = $2'; params.push(parseInt(case_id)); }

  try {
    // Auto-expirer les délais passés
    await pool.query(
      `UPDATE legal_deadlines SET status='expired'
       WHERE lawyer_id=$1 AND status='pending' AND deadline_date < CURRENT_DATE`,
      [lawyerId]
    );

    const { rows } = await pool.query(
      `SELECT ld.*,
              ca.title AS case_title,
              ld.deadline_date - CURRENT_DATE AS days_remaining
       FROM legal_deadlines ld
       LEFT JOIN cases ca ON ca.id = ld.case_id
       WHERE ${where}
       ORDER BY ld.deadline_date ASC`,
      params
    );

    return ok(res, 200, {
      data: {
        all:      rows,
        upcoming: rows.filter(r => r.days_remaining >= 0 && r.days_remaining <= 7),
        overdue:  rows.filter(r => r.status === 'expired' || r.days_remaining < 0),
      },
    });
  } catch (err) {
    console.error('[deadlines/list]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// POST /api/hearings/deadlines
// =============================================================================
exports.createDeadline = async (req, res) => {
  const lawyerId = req.user.id;
  const { case_id, title, deadline_date } = req.body;
  if (!title?.trim() || !deadline_date) {
    return ok(res, 400, {}, 'title et deadline_date sont requis');
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO legal_deadlines (case_id, lawyer_id, title, deadline_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [case_id || null, lawyerId, title.trim(), deadline_date]
    );
    return ok(res, 201, { data: rows[0] }, 'Délai créé');
  } catch (err) {
    console.error('[deadlines/create]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};

// =============================================================================
// PATCH /api/hearings/deadlines/:id/status
// =============================================================================
exports.updateDeadlineStatus = async (req, res) => {
  const { status } = req.body;
  const lawyerId   = req.user.id;
  if (!['pending', 'completed', 'expired'].includes(status)) {
    return ok(res, 400, {}, 'Statut invalide');
  }
  try {
    const { rows } = await pool.query(
      `UPDATE legal_deadlines SET status=$1, updated_at=NOW()
       WHERE id=$2 AND lawyer_id=$3 RETURNING *`,
      [status, req.params.id, lawyerId]
    );
    if (!rows[0]) return ok(res, 404, {}, 'Délai introuvable');
    return ok(res, 200, { data: rows[0] }, 'Statut mis à jour');
  } catch (err) {
    console.error('[deadlines/status]', err);
    return ok(res, 500, {}, 'Erreur serveur');
  }
};