// services/localAnalyzer.js
// Service d'analyse documentaire juridique local, déterministe et bilingue (FR/AR)
// Basé à 100% sur de la logique métier, des expressions régulières et du NLP léger

const { 
  splitIntoSentences, 
  tokenize, 
  filterStopWords, 
  computeWordFrequencies 
} = require('../utils/nlpHelper');

// Dictionnaire des mois en Français pour normalisation des dates
const FR_MONTHS = {
  'janvier': '01', 'jan': '01', 'février': '02', 'fevrier': '02', 'fev': '02',
  'mars': '03', 'mar': '03', 'avril': '04', 'avr': '04', 'mai': '05',
  'juin': '06', 'juillet': '07', 'juil': '07', 'août': '08', 'aout': '08', 'aou': '08',
  'septembre': '09', 'sep': '09', 'octobre': '10', 'oct': '10',
  'novembre': '11', 'nov': '11', 'décembre': '12', 'decembre': '12', 'dec': '12'
};

// Dictionnaire des mois en Arabe pour normalisation des dates
const AR_MONTHS = {
  'يناير': '01', 'فبراير': '02', 'مارس': '03', 'أبريل': '04', 'إبريل': '04',
  'ماي': '05', 'مايو': '05', 'يونيو': '06', 'يونية': '06', 'يوليوز': '07', 'يوليو': '07',
  'غشت': '08', 'أغسطس': '08', 'أوت': '08', 'سبتمبر': '09', 'أكتوبر': '10',
  'نوفمبر': '11', 'ديسمبر': '12'
};

/**
 * Détecte la langue principale du document.
 * @param {string} text 
 * @returns {'fr' | 'ar'}
 */
function detectLanguage(text) {
  if (!text) return 'fr';
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const total = text.replace(/\s/g, '').length;
  return total > 0 && arabicChars / total > 0.2 ? 'ar' : 'fr';
}

/**
 * Classifie le type de document de manière robuste par un système de pondération de mots-clés.
 * @param {string} text 
 * @param {'fr' | 'ar'} lang 
 * @returns {string}
 */
function classifyDocument(text, lang = 'fr') {
  const scores = {
    'mise en demeure': 0,
    'jugement': 0,
    'contrat': 0,
    'facture': 0,
    'convocation': 0,
    'plainte': 0,
    'courrier avocat': 0
  };

  const lowerText = text.toLowerCase();

  // Mots-clés pondérés par type de document
  const keywords = {
    'mise en demeure': {
      fr: [/mise\s+en\s+demeure/g, /sommation\s+de\s+payer/g, /sommation\s+par\s+huissier/g, /demeure/g, /sous\s+huitaine/g, /à\s+défaut\s+de\s+paiement/g, /mettre\s+en\s+demeure/g],
      ar: [/إعذار/g, /إنذار/g, /تنبيه\s+بالوفاء/g, /تنبيه\s+بالدفع/g, /إنذار\s+قبل\s+اللجوء/g, /تحت\s+طائلة/g]
    },
    'jugement': {
      fr: [/jugement/g, /arrêt/g, /tribunal/g, /ordonnance/g, /condamne/g, /déboute/g, /par\s+ces\s+motifs/g, /décide/g, /plaise\s+au\s+tribunal/g, /audience\s+publique/g, /la\s+cour/g],
      ar: [/حكم/g, /قرار/g, /محكمة/g, /جلسة/g, /منطوق\s+الحكم/g, /قضت/g, /حكمت\s+المحكمة/g, /باسم\s+جلالة/g, /باسم\s+الملك/g, /بين\s+الأطراف/g]
    },
    'contrat': {
      fr: [/contrat/g, /convention/g, /accord/g, /clauses?/g, /signataire/g, /les\s+parties\s+conviennent/g, /bailleur/g, /preneur/g, /co-contractant/g, /d'une\s+part/g, /d'autre\s+part/g],
      ar: [/عقد/g, /اتفاقية/g, /شروط/g, /بند/g, /الطرف\s+الأول/g, /الطرف\s+الثاني/g, /المتعاقد/g, /شريعة\s+المتعاقدين/g]
    },
    'facture': {
      fr: [/facture\s+n°/g, /tva/g, /ht/g, /ttc/g, /montant\s+total/g, /net\s+à\s+payer/g, /solde/g, /prix\s+unitaire/g],
      ar: [/فاتورة/g, /مبلغ\s+إجمالي/g, /الضريبة/g, /صافي\s+الدفع/g, /المورد/g, /الزبون/g]
    },
    'convocation': {
      fr: [/convocation/g, /convoqué/g, /audience\s+de\s+conciliation/g, /comparoître/g, /vous\s+êtes\s+prié\s+de\s+vous\s+présenter/g, /ordre\s+du\s+jour/g, /convoc/g],
      ar: [/استدعاء/g, /حضور/g, /جلسة\s+الصلح/g, /المثول/g, /مدعو\s+لحضور/g]
    },
    'plainte': {
      fr: [/plainte/g, /déposer\s+plainte/g, /infraction/g, /procureur/g, /victime/g, /préjudice/g, /délit/g, /crime/g, /plainte\s+pénale/g],
      ar: [/شكاية/g, /شكوى/g, /وكيل\s+الملك/g, /وكيل\s+الجمهورية/g, /ضرر/g, /ضحية/g, /جنحة/g, /مشتكي/g, /مشتكى\s+به/g]
    },
    'courrier avocat': {
      fr: [/mon\s+cher\s+confrère/g, /cabinet\s+d'avocat/g, /avocat\s+à\s+la\s+cour/g, /votre\s+conseil/g, /lettre\s+officielle/g, /courrier\s+officiel/g, /cabinet\s+me/g, /objet\s*:/g],
      ar: [/زميلي\s+العزيز/g, /مكتب\s+المحامي/g, /دفاعكم/g, /النيابة\s+عن/g, /رسالة\s+رسمية/g, /الأستاذ\s+المحامي/g]
    }
  };

  for (const [type, langRegexes] of Object.entries(keywords)) {
    const regexList = lang === 'ar' ? langRegexes.ar : langRegexes.fr;
    regexList.forEach(regex => {
      const matches = lowerText.match(regex);
      if (matches) {
        scores[type] += matches.length * 5; // Importance de la détection directe
      }
    });
  }

  // Trouver le score maximum
  let maxType = 'courrier avocat'; // Par défaut
  let maxScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type;
    }
  }

  // Si aucun mot clé détecté, retourner courrier avocat ou autre
  return maxScore > 0 ? maxType : (lang === 'ar' ? 'courrier avocat' : 'courrier avocat');
}

/**
 * Extrait toutes les dates d'un texte.
 * @param {string} text 
 * @param {'fr' | 'ar'} lang 
 * @returns {string[]}
 */
function extractDates(text, lang = 'fr') {
  const dates = new Set();
  
  // Format 1: JJ/MM/AAAA ou JJ-MM-AAAA ou AAAA-MM-JJ
  const numRegex = /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g;
  let matches = text.match(numRegex) || [];
  matches.forEach(m => {
    // Éviter de capturer des numéros de téléphone comme "01.40.20.30.40"
    const idx = text.indexOf(m);
    if (idx !== -1) {
      const surrounding = text.substring(Math.max(0, idx - 4), Math.min(text.length, idx + m.length + 8));
      const dots = (surrounding.match(/\./g) || []).length;
      if (dots < 3) {
        dates.add(m);
      }
    } else {
      dates.add(m);
    }
  });

  // Format Arabe: 12 يناير 2026
  const arRegex = /\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|إبريل|ماي|مايو|يونيو|يوليوز|يونية|يوليو|غشت|أغسطس|أوت|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+\d{2,4}/g;
  const arMatches = text.match(arRegex) || [];
  arMatches.forEach(m => dates.add(m));

  // Format Français: 12 janvier 2026 ou 1er juin 2025
  const frRegex = /\b\d{1,2}(?:er)?\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre)\s+\d{2,4}\b/gi;
  const frMatches = text.match(frRegex) || [];
  frMatches.forEach(m => dates.add(m.trim()));

  return Array.from(dates);
}

/**
 * Normalise une date textuelle pour le tri chronologique.
 * Ex: "23 mai 2026" ou "23/05/2026" -> Date Object
 * @param {string} dateStr 
 * @returns {Date|null}
 */
function parseAndNormalizeDate(dateStr) {
  if (!dateStr) return null;

  let cleaned = dateStr.toLowerCase().trim().replace(/er/g, '');

  // 1. Format JJ/MM/AAAA ou JJ-MM-AAAA
  let numMatch = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (numMatch) {
    let day = parseInt(numMatch[1], 10);
    let month = parseInt(numMatch[2], 10) - 1;
    let year = parseInt(numMatch[3], 10);
    if (year < 100) year += 2000; // Gestion AAAA courte
    return new Date(year, month, day);
  }

  // 2. Format AAAA-MM-JJ
  let numMatch2 = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (numMatch2) {
    let year = parseInt(numMatch2[1], 10);
    let month = parseInt(numMatch2[2], 10) - 1;
    let day = parseInt(numMatch2[3], 10);
    return new Date(year, month, day);
  }

  // 3. Format textuel Français (ex: 23 mai 2026)
  for (const [monthName, monthNum] of Object.entries(FR_MONTHS)) {
    if (cleaned.includes(monthName)) {
      let dayMatch = cleaned.match(new RegExp(`(\\d{1,2})\\s+${monthName}\\s+(\\d{4})`));
      if (dayMatch) {
        return new Date(parseInt(dayMatch[2], 10), parseInt(monthNum, 10) - 1, parseInt(dayMatch[1], 10));
      }
    }
  }

  // 4. Format textuel Arabe (ex: 23 مايو 2026)
  for (const [monthName, monthNum] of Object.entries(AR_MONTHS)) {
    if (cleaned.includes(monthName)) {
      let dayMatch = cleaned.match(new RegExp(`(\\d{1,2})\\s+${monthName}\\s+(\\d{4})`));
      if (dayMatch) {
        return new Date(parseInt(dayMatch[2], 10), parseInt(monthNum, 10) - 1, parseInt(dayMatch[1], 10));
      }
    }
  }

  return null;
}

/**
 * Extrait les montants financiers du texte.
 * @param {string} text 
 * @returns {string[]}
 */
function extractAmounts(text) {
  // Regex pour capturer les montants numériques avec ou sans séparateurs de milliers, décimales, et suivis d'une devise
  // Gère €, EUR, euros, DH, MAD, dirhams, $, USD, dollars
  const amountRegex = /\b\d{1,3}(?:[\s']\d{3})*(?:[.,]\d{2})?\s*(?:€|EUR|euros?|DH|MAD|dirhams?|\$|USD|dollars?|درهم|دولار)\b/gi;
  
  const matches = text.match(amountRegex) || [];
  // Nettoyage des doublons
  return Array.from(new Set(matches.map(m => m.trim())));
}

/**
 * Extrait les noms des parties (personnes physiques ou morales).
 * @param {string} text 
 * @param {'fr' | 'ar'} lang 
 * @returns {{demandeur: string, defendeur: string}}
 */
function extractParties(text, lang = 'fr') {
  let demandeur = '—';
  let defendeur = '—';

  if (lang === 'ar') {
    // Motifs en arabe
    const demandeurRegex = /(?:المشتكي|المدعي|لفائدة|صالح|الطرف\s+الأول)\s*:\s*([^\n,.]+)/i;
    const defendeurRegex = /(?:المشتكى\s+به|المدعى\s+عليه|ضد|الطرف\s+الثاني)\s*:\s*([^\n,.]+)/i;

    const demMatch = text.match(demandeurRegex);
    const defMatch = text.match(defendeurRegex);

    if (demMatch) demandeur = demMatch[1].trim();
    if (defMatch) defendeur = defMatch[1].trim();

    // Fallback si non trouvé
    if (demandeur === '—') {
      const matchSalutation = text.match(/(?:السيد|الأستاذ|شركة)\s+([^\s]+(?:\s+[^\s]+){1,3})/g);
      if (matchSalutation && matchSalutation.length > 0) demandeur = matchSalutation[0].trim();
      if (matchSalutation && matchSalutation.length > 1) defendeur = matchSalutation[1].trim();
    }
  } else {
    // Motifs en français
    const demandeurRegex = /(?:demandeur|bailleur|employeur|client|le\s+cabinet|me|maître|société|monsieur|madame)\s+([A-Z\u00C0-\u00DC][a-zA-Z\u00C0-\u00DC]+(?:\s+[A-Z\u00C0-\u00DC\s][a-zA-Z\u00C0-\u00DC]+){0,2})/g;
    const defendeurRegex = /(?:contre|défendeur|preneur|salarié|adversaire)\s+([A-Z\u00C0-\u00DC][a-zA-Z\u00C0-\u00DC]+(?:\s+[A-Z\u00C0-\u00DC\s][a-zA-Z\u00C0-\u00DC]+){0,2})/gi;

    // Analyse ligne par ligne pour plus de précision
    const lines = text.split('\n');
    for (const line of lines) {
      if (/entre\s+/i.test(line)) {
        const matches = line.match(/(?:entre\s+)([^,.]+)/i);
        if (matches) demandeur = matches[1].trim();
      }
      if (/contre\s+/i.test(line)) {
        const matches = line.match(/(?:contre\s+)([^,.]+)/i);
        if (matches) defendeur = matches[1].trim();
      }
    }

    // Extraction générale si non trouvé
    if (demandeur === '—') {
      // Détection des sociétés (SA, SARL, SAS) ou civilités (M., Mme.)
      const companyRegex = /\b(?:société|sarl|sa|sas|ets)\s+([A-Z][a-zA-Z0-9\s-]{2,25})\b/gi;
      const matches = text.match(companyRegex);
      if (matches && matches.length > 0) demandeur = matches[0].trim();
      if (matches && matches.length > 1) defendeur = matches[1].trim();
    }
    if (demandeur === '—') {
      const persRegex = /\b(?:M\.|Mme|Me|Maître|Monsieur|Madame)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
      const matches = text.match(persRegex);
      if (matches && matches.length > 0) demandeur = matches[0].trim();
      if (matches && matches.length > 1) defendeur = matches[1].trim();
    }
  }

  // Nettoyage final pour ne pas avoir de texte trop long
  const cleanParty = (p) => p.substring(0, 50).replace(/[:;]/g, '').trim();

  return {
    demandeur: cleanParty(demandeur),
    defendeur: cleanParty(defendeur)
  };
}

/**
 * Extrait les délais légaux ou temporels du texte.
 * @param {string} text 
 * @param {'fr' | 'ar'} lang 
 * @returns {string[]}
 */
function extractDeadlines(text, lang = 'fr') {
  const deadlines = new Set();
  
  if (lang === 'ar') {
    const arRegex = /\bأجل\s+\d+\s*(?:أيام|يوم|أشهر|أسبوع|ساعة)\b|\bداخل\s+أجل\b|\bتحت\s+طائلة\b|\bأجل\s+أقصاه\b/gi;
    const matches = text.match(arRegex) || [];
    matches.forEach(m => deadlines.add(m));
  } else {
    const frRegex = /\bdélai\s+(?:de|d')\s*\d+\s*(?:jours?|mois|semaines?)\b|\bsous\s+\d+\s*(?:jours?|heures?)\b|\bsous\s+huitaine\b|\bau\s+plus\s+tard\s+le\s+\d{1,2}\s+[a-z]+\s+\d{4}\b|\bavant\s+le\s+\d{1,2}\s+[a-z]+\s+\d{4}\b/gi;
    const matches = text.match(frRegex) || [];
    matches.forEach(m => deadlines.add(m.trim()));
  }

  return Array.from(deadlines);
}

/**
 * Extrait les actions importantes sous forme de phrases clés d'obligation ou d'instruction.
 * @param {string[]} sentences 
 * @param {'fr' | 'ar'} lang 
 * @returns {string[]}
 */
function extractImportantActions(sentences, lang = 'fr') {
  const actions = [];

  const frenchVerbs = /\b(?:payer|régler|verser|comparoître|présenter|évacuer|exécuter|restituer|cesser|produire|convoquer|sommer|ordonner)\b/i;
  const arabicVerbs = /(?:دفع|أداء|سداد|حضور|إخلاء|تنفيذ|إرجاع|التوقف|تقديم|استدعاء|أمر|قضى|عقد)/i;

  const pattern = lang === 'ar' ? arabicVerbs : frenchVerbs;

  sentences.forEach(sentence => {
    if (pattern.test(sentence)) {
      actions.push(sentence.trim());
    }
  });

  // Limiter à 5 actions les plus marquantes
  return actions.slice(0, 5);
}

/**
 * Génère un résumé extractif de haute qualité académique.
 * Évalue l'importance des phrases selon la fréquence des termes et la présence de mots-clés clés juridiques.
 * @param {string} text 
 * @param {'fr' | 'ar'} lang 
 * @returns {string}
 */
function generateExtractiveSummary(text, lang = 'fr') {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return '';
  if (sentences.length <= 3) return sentences.join(' ');

  const wordFrequencies = computeWordFrequencies(text, lang);

  // Mots clés juridiques à fort impact émotionnel ou décisionnel
  const frBoostRegex = /\b(?:condamne|ordonne|ordonnons|décide|décidons|par\s+ces\s+motifs|déclare|déclarons|déboute|mise\s+en\s+demeure|sommation|résiliation|pénalités|expulsion|saisie|prison|amende)\b/i;
  const arBoostRegex = /(?:حكمت|قضت|أمرت|لهذه\s+الأسباب|إعذار|إنذار|فسخ|غرامة|طرد|حجز|إدانة)/i;
  
  const boostPattern = lang === 'ar' ? arBoostRegex : frBoostRegex;

  // Calcul du score de chaque phrase
  const sentenceScores = sentences.map((sentence, index) => {
    const tokens = tokenize(sentence, lang);
    const cleanTokens = filterStopWords(tokens, lang);
    
    let frequencyScore = 0;
    cleanTokens.forEach(token => {
      frequencyScore += (wordFrequencies.get(token) || 0);
    });

    // Normalisation par la racine carrée de la longueur pour ne pas trop avantager les phrases très longues
    let score = tokens.length > 0 ? (frequencyScore / Math.sqrt(tokens.length)) : 0;

    // Boost juridique! Si la phrase contient un terme décisionnel ou critique
    if (boostPattern.test(sentence)) {
      score += 45; // Bonus substantiel pour capter le cœur décisionnel
    }

    // Boost de position (les 2 premières phrases et la dernière sont souvent très représentatives)
    if (index === 0) score += 15;
    if (index === 1) score += 10;
    if (index === sentences.length - 1) score += 20;

    return { sentence, index, score };
  });

  // Trier les phrases par score décroissant et prendre les 4 meilleures
  const topSentences = [...sentenceScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Trier les phrases sélectionnées selon leur ordre d'apparition original
  topSentences.sort((a, b) => a.index - b.index);

  return topSentences.map(s => s.sentence).join(' ');
}

function evaluateUrgency(text, deadlines) {
  const lowerText = text.toLowerCase();

  // Critères critiques français (limites de mots) et arabe (sans limite de mot b)
  const criticalFr = /\b(?:saisie|expulsion|huissier|référé|liquidation|faillite|sous\s+24h|sous\s+48h|délai\s+de\s+24|délai\s+de\s+48)\b/gi;
  const criticalAr = /عاجل|طرد|حجز|تصفية|تحت\s+طائلة|المستعجلات/gi;

  if (criticalFr.test(lowerText) || criticalAr.test(lowerText)) {
    return 'critique';
  }

  // Critères élevés (mise en demeure, tribunal, pénalités, convocation)
  const highFr = /\b(?:mise\s+en\s+demeure|ordonne|condamne|plainte|convocation|pénalités|défaut\s+de\s+paiement|tribunal|audience|délai\s+de\s+8\s+jours|sous\s+huitaine)\b/gi;
  const highAr = /إعذار|إنذار|شكاية|استدعاء|جلسة|حكمت|قضت|أمرت/gi;

  if (highFr.test(lowerText) || highAr.test(lowerText) || deadlines.length > 0) {
    return 'élevé';
  }

  // Critères moyens (facture, contrat classique, avenant, courrier)
  const mediumFr = /\b(?:facture|contrat|convention|solde|paiement|échéance)\b/gi;
  const mediumAr = /فاتورة|عقد|أداء/gi;

  if (mediumFr.test(lowerText) || mediumAr.test(lowerText)) {
    return 'moyen';
  }

  return 'faible';
}

/**
 * Construit la timeline chronologique des événements importants en reliant les dates et leur contexte.
 * @param {string} text 
 * @param {'fr' | 'ar'} lang 
 * @returns {{date: string, evenement: string}[]}
 */
function generateTimeline(text, lang = 'fr') {
  const sentences = splitIntoSentences(text);
  const timelineEvents = [];

  sentences.forEach(sentence => {
    const datesInSentence = extractDates(sentence, lang);
    if (datesInSentence.length > 0) {
      // Pour chaque date dans la phrase, on crée un événement
      datesInSentence.forEach(d => {
        // Description nettoyée de la phrase pour la timeline (max 120 caractères)
        let desc = sentence
          .replace(d, '') // Enlever la date elle-même pour éviter la répétition
          .replace(/\s+/g, ' ')
          .trim();

        // Si la description devient trop courte, garder la phrase entière
        if (desc.length < 10) {
          desc = sentence;
        }

        // Tronquer élégamment
        if (desc.length > 110) {
          desc = desc.substring(0, 107) + '...';
        }

        timelineEvents.push({
          rawDate: d,
          parsedDate: parseAndNormalizeDate(d),
          evenement: desc
        });
      });
    }
  });

  // Trier chronologiquement (les dates invalides ou nulles vont à la fin)
  timelineEvents.sort((a, b) => {
    if (!a.parsedDate) return 1;
    if (!b.parsedDate) return -1;
    return a.parsedDate - b.parsedDate;
  });

  // Dedupliquer par date et formater pour le retour
  const seenDates = new Set();
  const finalTimeline = [];

  timelineEvents.forEach(evt => {
    if (!seenDates.has(evt.rawDate)) {
      seenDates.add(evt.rawDate);
      finalTimeline.push({
        date: evt.rawDate,
        evenement: evt.evenement
      });
    }
  });

  return finalTimeline;
}

/**
 * Point d'entrée principal : analyse le texte complet et retourne le JSON structuré attendu.
 * @param {string} rawText 
 * @returns {object}
 */
function analyzeDocument(rawText) {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Le texte brut du document est vide.');
  }

  // 1. Détection de langue
  const lang = detectLanguage(rawText);

  // 2. Classification du type de document
  const typeDoc = classifyDocument(rawText, lang);

  // 3. Extraction des entités
  const dates = extractDates(rawText, lang);
  const montants = extractAmounts(rawText);
  const parties = extractParties(rawText, lang);
  const deadlines = extractDeadlines(rawText, lang);

  // 4. Segmentation en phrases
  const sentences = splitIntoSentences(rawText);

  // 5. Actions importantes
  const actions = extractImportantActions(sentences, lang);

  // 6. Résumé extractif
  const resume = generateExtractiveSummary(rawText, lang);

  // 7. Niveau d'urgence
  const urgence = evaluateUrgency(rawText, deadlines);

  // 8. Timeline des événements
  const timeline = generateTimeline(rawText, lang);

  // 9. Mots clés (basés sur les mots les plus fréquents)
  const freqs = computeWordFrequencies(rawText, lang);
  const motsCles = Array.from(freqs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(entry => entry[0]);

  // Déterminer la juridiction
  let juridiction = '—';
  if (lang === 'ar') {
    const jurRegex = /(?:محكمة|المحكمة)\s+([^\s,.]+)/i;
    const match = rawText.match(jurRegex);
    if (match) juridiction = match[0].trim();
  } else {
    const jurRegex = /(?:tribunal|cour|juridiction)\s+(?:de|d')\s*([A-Z][a-zA-Z\s-]{2,20})\b/i;
    const match = rawText.match(jurRegex);
    if (match) juridiction = match[0].trim();
  }

  // Formater la réponse pour satisfaire à la fois l'UI existante et le nouvel objectif
  return {
    langue: lang,
    type_document: typeDoc,
    resume: resume,
    parties: parties,
    dates: dates,
    montants: montants,
    faits_principaux: actions, // Mappé sur les actions importantes pour la compatibilité React
    delais_legaux: deadlines, // Mappé sur les délais
    juridiction: juridiction,
    mots_cles: motsCles,
    niveau_urgence: urgence,
    timeline: timeline
  };
}

module.exports = {
  detectLanguage,
  classifyDocument,
  extractDates,
  extractAmounts,
  extractParties,
  extractDeadlines,
  generateExtractiveSummary,
  evaluateUrgency,
  generateTimeline,
  analyzeDocument
};
