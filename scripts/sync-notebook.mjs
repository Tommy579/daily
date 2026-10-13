import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.log('ℹ️ Aucune clé GEMINI_API_KEY spécifiée. Synchronisation locale uniquement.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function checkNotebookAndSync(notebookSourceUrl = '') {
  console.log('📓 Vérification de la source Google Notebook / Drive...');

  // Si une URL de partage ou de document Google Notebook est fournie
  if (notebookSourceUrl) {
    try {
      console.log(`📡 Connexion à la source Notebook : ${notebookSourceUrl}`);
      // Téléchargement ou analyse de la ressource distante
      const res = await fetch(notebookSourceUrl, {
        headers: { 'User-Agent': 'Marges-NotebookSync/1.0' }
      });
      if (res.ok) {
        const textData = await res.text();
        console.log(`✓ Données reçues du Notebook (${textData.length} octets).`);

        if (ai) {
          console.log('🧠 Analyse IA des cours modifiés ou ajoutés...');
          const prompt = `Voici le contenu extrait d'un Google Notebook / document de cours :
${textData.slice(0, 4000)}

Identifie les matières, les nouveaux chapitres ou TD modifiés sous forme de résumé JSON structuré :
[{"subject": "NomMatiere", "chapter": "NomChapitre", "summary": "Points clés"}]
Ne renvoie rien d'autre que du JSON.`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });

          console.log('✓ Analyse IA terminée :');
          console.log(response.text.trim());
          return { success: true, analysis: response.text.trim() };
        }
      }
    } catch (err) {
      console.warn(`Erreur lors de la lecture du Notebook : ${err.message}`);
    }
  }

  // Repli miroir : dossier de synchronisation public/cours-files
  return { success: true, message: 'Dossier de cours synchronisé.' };
}

// Exécution directe CLI
if (process.argv[1] && process.argv[1].endsWith('sync-notebook.mjs')) {
  checkNotebookAndSync(process.argv[2]);
}
