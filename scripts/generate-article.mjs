import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

// 1. Vérification de la clé API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ Erreur : Variable d'environnement GEMINI_API_KEY manquante.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const THEMES = ['conscience', 'langage', 'ethique', 'travail', 'creativite', 'relations', 'pouvoir', 'attention'];
const FORMATS = ['essai', 'question', 'dialogue', 'note'];

const targetDir = path.resolve('src/content/textes');

// 2. Inventaire des articles déjà existants pour éviter les doublons et varier les thèmes
function getExistingArticles() {
  if (!fs.existsSync(targetDir)) return [];
  const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  const articles = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(targetDir, file), 'utf-8');
      const titleMatch = content.match(/title:\s*"([^"]+)"/);
      const themeMatch = content.match(/themes:\s*\[([^\]]+)\]/);
      articles.push({
        file,
        title: titleMatch ? titleMatch[1] : file,
        themes: themeMatch ? themeMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, '')) : [],
      });
    } catch {
      // ignore
    }
  }
  return articles;
}

const existing = getExistingArticles();
const existingTitles = existing.map((a) => a.title);

// Sélection intelligente d'un thème et d'un format (ou argument en ligne de commande)
const themeArg = process.argv[2] && THEMES.includes(process.argv[2])
  ? process.argv[2]
  : THEMES[Math.floor(Math.random() * THEMES.length)];

const typeArg = process.argv[3] && FORMATS.includes(process.argv[3])
  ? process.argv[3]
  : FORMATS[Math.floor(Math.random() * FORMATS.length)];

const todayDate = new Date().toISOString().slice(0, 10);

// Délais de rétrogradation exponentielle (Exponential Backoff)
const RETRY_DELAYS_MS = [10_000, 25_000, 60_000, 120_000];
const MAX_RETRIES = RETRY_DELAYS_MS.length;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Détecte si une erreur de l'API Gemini est temporaire (503, 429, 500, etc.)
 */
function isTransientError(err) {
  if (!err) return false;
  const msg = typeof err === 'string'
    ? err
    : `${err.message || ''} ${err.status || ''} ${err.statusText || ''} ${JSON.stringify(err)}`;

  const patterns = [
    /503/,
    /UNAVAILABLE/i,
    /429/,
    /RESOURCE_EXHAUSTED/i,
    /500/,
    /INTERNAL/i,
    /502/,
    /BAD_GATEWAY/i,
    /504/,
    /GATEWAY_TIMEOUT/i,
    /high demand/i,
    /spikes in demand/i,
    /temporarily unavailable/i,
    /overloaded/i,
    /rate limit/i,
    /quota exceeded/i,
    /fetch failed/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
  ];

  return patterns.some((p) => p.test(msg));
}

/**
 * Extrait le code ou nom d'erreur pour les logs
 */
function getErrorSummary(err) {
  if (!err) return 'UNKNOWN';
  if (err.status) return String(err.status);
  const msg = err.message || '';
  const match = msg.match(/"code":\s*(\d+)/) || msg.match(/\b(503|429|500|502|504)\b/);
  if (match) return match[1];
  const statusMatch = msg.match(/"status":\s*"([^"]+)"/);
  if (statusMatch) return statusMatch[1];
  return '503';
}

/**
 * Exécute l'appel Gemini avec Exponential Backoff + Jitter et Fallback multi-modèles
 */
async function generateWithFallbackAndRetry(prompt) {
  const candidateModels = Array.from(
    new Set(
      [
        process.env.GEMINI_MODEL,
        'gemini-3.8-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
      ].filter(Boolean)
    )
  );

  let lastError = null;

  for (let modelIdx = 0; modelIdx < candidateModels.length; modelIdx++) {
    const model = candidateModels[modelIdx];
    console.log(`\n🎯 Modèle sélectionné [${modelIdx + 1}/${candidateModels.length}] : ${model}`);

    // Tentative initiale (0) + jusqu'à MAX_RETRIES réessais
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.7,
          },
        });

        const rawText = response.text ? response.text.trim() : '';

        // Nettoyage éventuel des balises markdown englobantes
        const content = rawText
          .replace(/^```(?:markdown)?\n?/i, '')
          .replace(/\n?```$/i, '')
          .trim();

        // Validation stricte du contenu
        if (!content || content.length < 500) {
          throw new Error(`Contenu généré trop court ou vide (${content.length} caractères reçus).`);
        }

        if (!content.startsWith('---')) {
          throw new Error('Le frontmatter YAML est absent ou mal formé.');
        }

        const titleMatch = content.match(/title:\s*"([^"]+)"/);
        if (!titleMatch || !titleMatch[1].trim()) {
          throw new Error("Impossible d'extraire un titre valide depuis le frontmatter.");
        }

        return { content, title: titleMatch[1].trim(), modelUsed: model };
      } catch (err) {
        lastError = err;
        const isTransient = isTransientError(err);
        const errCode = getErrorSummary(err);

        if (!isTransient) {
          // Erreur non temporaire : arrêt immédiat
          console.error(`❌ Erreur fatale non transitoire (${errCode}) avec ${model} :`, err.message || err);
          throw err;
        }

        if (attempt < MAX_RETRIES) {
          const baseDelay = RETRY_DELAYS_MS[attempt];
          const jitter = Math.floor(Math.random() * 4000) + 1000; // 1s à 5s
          const totalWaitMs = baseDelay + jitter;
          const waitSec = (totalWaitMs / 1000).toFixed(1);

          console.warn(
            `⏳ Serveur Gemini occupé (${errCode}), nouvelle tentative ${attempt + 1}/${MAX_RETRIES} pour le modèle ${model} dans ${waitSec}s...`
          );
          await sleep(totalWaitMs);
        } else {
          console.warn(
            `⚠️ Le modèle ${model} a échoué après ${MAX_RETRIES} tentatives (${errCode}).`
          );
          if (modelIdx < candidateModels.length - 1) {
            console.log(`🔀 Bascule automatique vers le modèle de secours : ${candidateModels[modelIdx + 1]}...`);
          }
        }
      }
    }
  }

  throw new Error(`Tous les modèles ont échoué après les retries. Dernière erreur : ${lastError?.message || lastError}`);
}

async function generateDailyContent() {
  console.log(`🤖 [Gemini] Lancement de la génération pour le ${todayDate}`);
  console.log(`   Format : ${typeArg} | Thème : ${themeArg}`);
  console.log(`   Titres existants à ne pas répéter (${existingTitles.length}) :`, existingTitles.slice(0, 5));

  const prompt = `Tu es un philosophe et écrivain exigeant pour la revue "Marges" (réflexion philosophique profonde sur l'intelligence artificielle et la condition humaine).
Écris un article philosophique original, percutant et élégant, sur le thème "${themeArg}" sous la forme d'un "${typeArg}".

CONSIGNES STRICTES :
1. Titre et sujet UNIQUES : Ne traite pas un sujet déjà abordé dans ces titres :
${existingTitles.map((t) => `- "${t}"`).join('\n')}

2. Rigueur philosophique :
- Ne cite que des auteurs, ouvrages et concepts philosophiques réels et vérifiables (ex: Kant, Arendt, Simondon, Barthes, Jonas, Merleau-Ponty, Benjamin, Illich, etc.).
- N'invente aucune citation ni référence bibliographique.

3. Format Markdown et Frontmatter YAML :
Le texte DOIT commencer par le frontmatter YAML exact suivant :
---
title: "Titre inspirant et percutant"
subtitle: "Sous-titre synthétique"
date: ${todayDate}
summary: "Deux phrases d'accroche qui posent le paradoxe philosophique."
type: ${typeArg}
themes: [${themeArg}]
epigraph: "Une citation philosophique authentique et pertinente"
epigraphAuthor: "Auteur authentique de la citation"
dropcap: true
isAiGenerated: true
references:
  - author: "Auteur de référence"
    title: "Ouvrage authentique"
    note: "Année de publication et courte remarque"
---

4. Structure et style :
- Utilise des intertitres de niveau 2 (##).
- Insère au moins deux notes de bas de page philosophiques ([^1] et [^2]).
- Typographie soignée (guillemets français « », tirets cadratins —, espaces insécables).
- Longueur : au moins 500 mots, texte dense, sans remplissage creux ni platitudes d'assistant vocal.
- Rends uniquement le code Markdown brut, sans délimiteurs \`\`\`markdown.`;

  try {
    const { content, title, modelUsed } = await generateWithFallbackAndRetry(prompt);

    // Slugification propre pour le nom de fichier (ex: 2026-10-14-titre-du-texte.md)
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const fileName = `${todayDate}-${slug}.md`;
    const targetFile = path.join(targetDir, fileName);

    // Écriture sécurisée du fichier
    fs.writeFileSync(targetFile, content, 'utf-8');
    console.log(`\n✅ Texte philosophique quotidien généré avec succès :`);
    console.log(`   Fichier : ${fileName}`);
    console.log(`   Titre   : ${title}`);
    console.log(`   Modèle  : ${modelUsed}`);
    console.log(`   Taille  : ${content.length} caractères`);
  } catch (err) {
    console.error('\n❌ Échec définitif de la génération :', err.message);
    process.exit(1); // Sortie en erreur pour empêcher un commit corrompu
  }
}

generateDailyContent();
