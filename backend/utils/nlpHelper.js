// utils/nlpHelper.js
// Outils NLP légers et académiques pour le français et l'arabe

// Liste des mots vides (stop words) en Français
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'dans', 'un', 'une', 'des',
  'sur', 'pour', 'par', 'qui', 'que', 'ce', 'ces', 'se', 'sa', 'son', 'ses', 'au', 'aux',
  'est', 'sont', 'ont', 'mais', 'ou', 'donc', 'or', 'ni', 'car', 'cette', 'cet', 'il', 'ils',
  'elle', 'elles', 'nous', 'vous', 'je', 'tu', 'leur', 'leurs', 'y', 'en', 'tout', 'tous',
  'auxquels', 'desquels', 'dans lequel', 'duquel', 'laquelle', 'lesquelles', 'lesquels',
  'notre', 'votre', 'leur', 'nos', 'vos', 'leurs', 'avec', 'sans', 'sous', 'vers', 'chez',
  'entre', 'depuis', 'pendant', 'durant', 'avant', 'après', 'devant', 'derrière', 'contre'
]);

// Liste des mots vides (stop words) en Arabe
const ARABIC_STOP_WORDS = new Set([
  'من', 'إلى', 'في', 'على', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'الذين', 'أن',
  'إن', 'هل', 'لم', 'لن', 'لا', 'نعم', 'كل', 'بعض', 'هناك', 'كان', 'كانت', 'قد', 'تم',
  'بين', 'بعد', 'قبل', 'حيث', 'عند', 'ثم', 'أو', 'و', 'ف', 'ب', 'ل', 'ك', 'هو', 'هي',
  'هم', 'هما', 'هن', 'أنا', 'نحن', 'أنت', 'أنتم', 'أنتما', 'أنتن', 'إلا', 'غير', 'سوى',
  'الذين', 'اللائي', 'اللاتي', 'اللواتي', 'منذ', 'حتى', 'إذا', 'إذ', 'لما', 'بينما'
]);

// Liste des mots vides en Anglais (fallback)
const ENGLISH_STOP_WORDS = new Set([
  'the', 'of', 'to', 'and', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on',
  'are', 'as', 'with', 'his', 'they', 'i', 'at', 'be', 'this', 'have', 'from', 'or', 'one',
  'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can',
  'said', 'there', 'use', 'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will'
]);

/**
 * Découpe un texte en phrases de manière intelligente
 * en évitant les faux positifs liés aux abréviations juridiques ou communes.
 * @param {string} text 
 * @returns {string[]}
 */
function splitIntoSentences(text) {
  if (!text) return [];

  // Remplacer les retours à la ligne consécutifs par des fins de phrases si nécessaire
  let cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();

  // Abréviations courantes à protéger
  // On remplace le point par un caractère temporaire unique (ex. ➔)
  const protections = [
    { regex: /\bM\./g, replace: 'M➔' },
    { regex: /\bMme\./g, replace: 'Mme➔' },
    { regex: /\bMe\./g, replace: 'Me➔' },
    { regex: /\bDr\./g, replace: 'Dr➔' },
    { regex: /\bArt\./gi, replace: 'Art➔' },
    { regex: /\bAl\./gi, replace: 'Al➔' },
    { regex: /\bEx\./gi, replace: 'Ex➔' },
    { regex: /\bN°\./gi, replace: 'N°➔' },
    { regex: /\bS\.A\.R\.L\./gi, replace: 'SARL➔' },
    { regex: /\bS\.A\./gi, replace: 'SA➔' },
    { regex: /\bS\.A\.S\./gi, replace: 'SAS➔' },
    { regex: /\bC\.I\.N\./gi, replace: 'CIN➔' },
    { regex: /\bCass\./gi, replace: 'Cass➔' },
    { regex: /\bCiv\./gi, replace: 'Civ➔' },
    { regex: /\bCrim\./gi, replace: 'Crim➔' }
  ];

  protections.forEach(p => {
    cleanedText = cleanedText.replace(p.regex, p.replace);
  });

  // Regex pour découper selon . ou ? ou ! suivis d'un espace et d'une majuscule (française ou arabe)
  // \u0600-\u06FF couvre les caractères arabes
  const sentenceEndRegex = /(?<=[.!?؟])\s+(?=[A-Z\u0600-\u06FF])/g;
  
  let sentences = cleanedText.split(sentenceEndRegex);

  // Restaurer les points protégés et nettoyer
  sentences = sentences.map(s => {
    let restored = s
      .replace(/M➔/g, 'M.')
      .replace(/Mme➔/g, 'Mme.')
      .replace(/Me➔/g, 'Me.')
      .replace(/Dr➔/g, 'Dr.')
      .replace(/Art➔/gi, 'Art.')
      .replace(/Al➔/gi, 'Al.')
      .replace(/Ex➔/gi, 'Ex.')
      .replace(/N°➔/gi, 'N°.')
      .replace(/SARL➔/gi, 'S.A.R.L.')
      .replace(/SA➔/gi, 'S.A.')
      .replace(/SAS➔/gi, 'S.A.S.')
      .replace(/CIN➔/gi, 'C.I.N.')
      .replace(/Cass➔/gi, 'Cass.')
      .replace(/Civ➔/gi, 'Civ.')
      .replace(/Crim➔/gi, 'Crim.')
      .trim();
    return restored;
  }).filter(s => s.length > 3);

  return sentences;
}

/**
 * Tokenise une phrase en mots nettoyés en minuscules.
 * @param {string} sentence 
 * @param {string} lang 'fr' | 'ar'
 * @returns {string[]}
 */
function tokenize(sentence, lang = 'fr') {
  if (!sentence) return [];

  let text = sentence;
  if (lang === 'fr') {
    text = text.toLowerCase();
    // Normalisation de base des accents (optionnel mais utile)
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Remplacer l'apostrophe par un espace (ex: "l'avocat" -> "l avocat")
  text = text.replace(/['’]/g, ' ');

  // Extraire les mots (lettres uniquement, français + arabe)
  // \u0600-\u06FF : lettres arabes
  // a-z : lettres latines
  const words = text.match(/[a-z0-9\u0600-\u06FF]+/gi) || [];

  return words;
}

/**
 * Filtre les mots vides selon la langue et retourne les mots porteurs de sens.
 * @param {string[]} tokens 
 * @param {string} lang 'fr' | 'ar'
 * @returns {string[]}
 */
function filterStopWords(tokens, lang = 'fr') {
  const stopWords = lang === 'ar' 
    ? ARABIC_STOP_WORDS 
    : lang === 'en' ? ENGLISH_STOP_WORDS : FRENCH_STOP_WORDS;
  
  return tokens.filter(token => {
    // Si c'est un chiffre de plus de 2 caractères (ex: montant ou date), on le garde
    if (/^\d+$/.test(token) && token.length > 2) return true;
    
    // Garder uniquement les mots de 3 lettres ou plus qui ne sont pas des stop words
    return token.length >= 3 && !stopWords.has(token);
  });
}

/**
 * Calcule la fréquence de chaque mot porteur de sens dans un document.
 * @param {string} text 
 * @param {string} lang 'fr' | 'ar'
 * @returns {Map<string, number>}
 */
function computeWordFrequencies(text, lang = 'fr') {
  const frequencies = new Map();
  const sentences = splitIntoSentences(text);

  sentences.forEach(sentence => {
    const tokens = tokenize(sentence, lang);
    const cleanTokens = filterStopWords(tokens, lang);

    cleanTokens.forEach(token => {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    });
  });

  return frequencies;
}

module.exports = {
  splitIntoSentences,
  tokenize,
  filterStopWords,
  computeWordFrequencies
};
