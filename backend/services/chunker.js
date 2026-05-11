const CHUNK_SIZE    = 512;
const CHUNK_OVERLAP = 64;

function tokenize(text) {
  // Approximation : 1 token ≈ 4 chars pour le français
  return Math.ceil(text.length / 4);
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
  const chunks = [];
  let current = '';
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = tokenize(para);

    if (currentTokens + paraTokens > chunkSize && current) {
      chunks.push(current.trim());
      // Overlap : garder les derniers mots du chunk précédent
      const words = current.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap * 4 / 5));
      current = overlapWords.join(' ') + ' ' + para;
      currentTokens = tokenize(current);
    } else {
      current += (current ? '\n\n' : '') + para;
      currentTokens += paraTokens;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  // Fallback : si pas de paragraphes bien séparés, découpage fixe
  if (chunks.length === 0) {
    const words = text.split(' ');
    for (let i = 0; i < words.length; i += chunkSize * 4 - overlap * 4) {
      chunks.push(words.slice(i, i + chunkSize * 4).join(' '));
    }
  }

  return chunks.filter(c => c.length > 50);
}

module.exports = { chunkText, tokenize };