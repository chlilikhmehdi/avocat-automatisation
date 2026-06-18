const { OpenAI } = require('openai');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const MODEL  = 'text-embedding-3-small'; // 1536 dims, coût minimal

async function embedText(text) {
  const { data } = await openai.embeddings.create({
    model: MODEL,
    input: text.slice(0, 8000),
  });
  return data[0].embedding; // Float32Array → [0.123, -0.456, ...]
}

async function embedBatch(texts) {
  // OpenAI accepte jusqu'à 2048 inputs par appel
  const batches = [];
  for (let i = 0; i < texts.length; i += 100) {
    batches.push(texts.slice(i, i + 100));
  }

  const allEmbeddings = [];
  for (const batch of batches) {
    const { data } = await openai.embeddings.create({
      model: MODEL,
      input: batch.map(t => t.slice(0, 8000)),
    });
    allEmbeddings.push(...data.map(d => d.embedding));
    // Rate limit protection
    if (batches.length > 1) await new Promise(r => setTimeout(r, 200));
  }

  return allEmbeddings;
}

module.exports = { embedText, embedBatch };