const { OpenAI }            = require('openai');
const { similaritySearch, crossDocumentSearch } = require('./vectorSearch');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const SYSTEM_JURIDIQUE = `Tu es un assistant juridique marocain expert intégré dans l'application MiZan.
Tu analyses des documents juridiques et réponds en français de manière précise et professionnelle.

Règles absolues :
- Réponds UNIQUEMENT à partir des extraits fournis (contexte RAG)
- Cite toujours ta source : [Source: nom_fichier, extrait N]
- Si l'information est absente des extraits : "Information non trouvée dans les documents fournis"
- Ne fabrique jamais d'informations juridiques
- Utilise la terminologie juridique marocaine appropriée`;

async function answerQuestion(question, { caseId, fileId, conversationHistory = [] }) {
  // 1. Recherche sémantique
  const chunks = await similaritySearch(question, {
    caseId,
    fileId,
    limit: 6,
    threshold: 0.72,
  });

  if (chunks.length === 0) {
    return {
      answer: "Aucun extrait pertinent trouvé dans les documents de ce dossier pour répondre à cette question.",
      sources: [],
      chunks_used: 0,
    };
  }

  // 2. Construction du contexte RAG
  const context = chunks
    .map((c, i) => `[Extrait ${i + 1} — ${c.filename}]\n${c.content}`)
    .join('\n\n---\n\n');

  // 3. Historique de conversation (max 6 derniers tours)
  const history = conversationHistory.slice(-6).map(m => ({
    role: m.role,
    content: m.content,
  }));

  // 4. Appel LLM
  const completion = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    temperature: 0.2,
    max_tokens:  1000,
    messages: [
      { role: 'system', content: SYSTEM_JURIDIQUE },
      ...history,
      {
        role: 'user',
        content: `Contexte documentaire :\n\n${context}\n\n---\n\nQuestion : ${question}`,
      },
    ],
  });

  const answer = completion.choices[0].message.content.trim();

  return {
    answer,
    sources: chunks.map(c => ({
      file_id:     c.file_id,
      filename:    c.filename,
      chunk_index: c.chunk_index,
      score:       Math.round(c.score * 100) / 100,
      excerpt:     c.content.slice(0, 200) + '...',
    })),
    chunks_used:  chunks.length,
    tokens_used:  completion.usage?.total_tokens,
  };
}

async function compareDocuments(fileIds, aspect) {
  const query = aspect || 'Quelles sont les obligations et droits principaux des parties ?';

  const grouped = await crossDocumentSearch(query, fileIds);

  const sections = Object.entries(grouped).map(([fileId, data]) => {
    const bestChunks = data.chunks.slice(0, 2).map(c => c.content).join('\n\n');
    return `=== ${data.filename} ===\n${bestChunks}`;
  }).join('\n\n');

  const completion = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    temperature: 0.2,
    max_tokens:  1500,
    messages: [
      { role: 'system', content: SYSTEM_JURIDIQUE },
      {
        role: 'user',
        content: `Compare ces documents juridiques sur l'aspect suivant : "${query}"\n\n${sections}\n\nFournis une analyse comparative structurée avec similarités, différences et points d'attention.`,
      },
    ],
  });

  return {
    analysis: completion.choices[0].message.content.trim(),
    documents: Object.entries(grouped).map(([id, d]) => ({
      file_id: id, filename: d.filename, chunks_found: d.chunks.length,
    })),
  };
}

module.exports = { answerQuestion, compareDocuments };