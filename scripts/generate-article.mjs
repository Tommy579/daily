import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

// 1. Vérification de la clé API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Erreur : Variable d\'environnement GEMINI_API_KEY manquante.');
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
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

    // 3. Validation stricte du contenu
    if (!content || content.length < 500) {
      throw new Error(`Le contenu généré est trop court ou vide (${content.length} caractères reçus).`);
    }

    if (!content.startsWith('---')) {
      throw new Error('Le frontmatter YAML est absent ou mal formé.');
    }

    const titleMatch = content.match(/title:\s*"([^"]+)"/);
    if (!titleMatch || !titleMatch[1].trim()) {
      throw new Error('Impossible d\'extraire un titre valide depuis le frontmatter.');
    }

    const title = titleMatch[1].trim();

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
    console.log(`✅ Texte philosophique quotidien généré avec succès :`);
    console.log(`   Fichier : ${fileName}`);
    console.log(`   Titre   : ${title}`);
    console.log(`   Taille  : ${content.length} caractères`);
  } catch (err) {
    console.error('❌ Échec de la génération :', err.message);
    process.exit(1); // Sortie en erreur pour empêcher un commit corrompu
  }
}

generateDailyContent();
