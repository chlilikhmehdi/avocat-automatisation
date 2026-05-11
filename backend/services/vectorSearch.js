const { pool }      = require('../db/dbConfig');
const { embedText } = require('./embeddings');

async function similaritySearch(query, { caseId, fileId, limit = 5, threshold = 0.75 }) {
  const queryEmbedding = await embedText(query);
  const vectorStr      = `[${queryEmbedding.join(',')}]`;

  let whereClause = 'dc.case_id = $2';   // ← était [dc.case](http://...)_id
  const params    = [vectorStr, caseId];
  let idx         = 3;

  if (fileId) {
    whereClause += ` AND dc.file_id = $${idx++}`;
    params.push(fileId);
  }

  const { rows } = await pool.query(
    `SELECT
       dc.id,                                       -- ← était [dc.id](http://...)
       dc.file_id,
       dc.chunk_index,
       dc.content,
       cf.display_name AS filename,
       cf.original_name,
       1 - (dc.embedding <=> $1::vector) AS score
     FROM document_chunks dc
     JOIN case_files cf ON cf.id = dc.file_id      -- ← était [cf.id](http://...)
     WHERE ${whereClause}
       AND 1 - (dc.embedding <=> $1::vector) > ${threshold}
     ORDER BY dc.embedding <=> $1::vector
     LIMIT ${limit}`,
    params
  );

  return rows;
}

async function crossDocumentSearch(query, fileIds) {
  const queryEmbedding = await embedText(query);
  const vectorStr      = `[${queryEmbedding.join(',')}]`;

  const placeholders = fileIds.map((_, i) => `$${i + 2}`).join(','); // ← était [fileIds.map](http://...)

  const { rows } = await pool.query(
    `SELECT
       dc.file_id,
       cf.display_name AS filename,
       dc.content,
       1 - (dc.embedding <=> $1::vector) AS score
     FROM document_chunks dc
     JOIN case_files cf ON cf.id = dc.file_id      -- ← était [cf.id](http://...)
     WHERE dc.file_id IN (${placeholders})
       AND 1 - (dc.embedding <=> $1::vector) > 0.70
     ORDER BY dc.embedding <=> $1::vector
     LIMIT 10`,
    [vectorStr, ...fileIds]
  );

  return rows.reduce((acc, row) => {
    const key = row.file_id;
    if (!acc[key]) acc[key] = { filename: row.filename, chunks: [] };
    acc[key].chunks.push({ content: row.content, score: row.score });
    return acc;
  }, {});
}

module.exports = { similaritySearch, crossDocumentSearch };