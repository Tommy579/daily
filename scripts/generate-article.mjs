import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

// Clé d'API récupérée depuis l'environnement ou .env
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(`❌ Erreur : Clé GEMINI_API_KEY manquante.
Pour l'utiliser, ajoutez votre clé dans le fichier .env :
GEMINI_API_KEY=votre_cle_ici`);
  process.exit(1);
}

const themeArg = process.argv[2] || 'conscience';
const typeArg = process.argv[3] || 'essai';

const ai = new GoogleGenAI({ apiKey });

async function generateEssay() {
  console.log(`🤖 Génération d'une publication philosophique (Thème: ${themeArg}, Format: ${typeArg})...`);

  const prompt = `Tu es un philosophe contemporain qui écrit pour le site "Marges" (philosophie sur l'intelligence artificielle et la condition humaine).
Écris un article philosophique profond, bien écrit et sans jargon creux, sur le thème "${themeArg}" au format "${typeArg}".
Le format éditorial doit comporter exactement ce frontmatter YAML au début, suivi du texte en Markdown :

---
title: "Titre percutant"
subtitle: "Sous-titre explicatif"
date: ${new Date().toISOString().slice(0, 10)}
summary: "Deux phrases qui posent le problème et donnent envie de lire."
type: ${typeArg}
themes: [${themeArg}]
epigraph: "Citation philosophique pertinente"
epigraphAuthor: "Auteur de la citation"
dropcap: true
references:
  - author: "Auteur pertinent"
    title: "Ouvrage de référence"
    note: "Année et courte remarque"
---

Puis rédige le corps du texte.
- Utilise des intertitres de niveau 2 (##).
- Ajoute au moins deux notes de bas de page philosophiques ([^1], [^2]).
- Soigne la typographie française (guillemets français « », tirets cadratins —).
Ne mets rien d'autre que le contenu Markdown brut (pas de balises de code englobantes comme \`\`\`markdown).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const content = response.text.trim().replace(/^```markdown\n/, '').replace(/\n```$/, '');
    
    // Extraction du titre pour le nom de fichier slugifié
    const titleMatch = content.match(/title:\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : `texte-${Date.now()}`;
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const targetDir = path.resolve('src/content/textes');
    const targetFile = path.join(targetDir, `${slug}.md`);

    fs.writeFileSync(targetFile, content, 'utf-8');
    console.log(`✓ Texte publié avec succès dans : ${targetFile}`);
  } catch (err) {
    console.error('❌ Erreur lors de la génération IA :', err.message);
  }
}

generateEssay();
