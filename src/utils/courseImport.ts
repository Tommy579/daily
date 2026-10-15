import { saveDocumentFile } from './fileStorage';
import { createBatchUserCourses, getCurrentUserCached } from './supabase';

export interface ImportFolderResult {
  subjectCount: number;
  fileCount: number;
  pdfCount: number;
}

/**
 * Traite et enregistre l'arborescence complète d'un dossier sélectionné par l'utilisateur.
 * Sauvegarde les fichiers dans IndexedDB et Supabase Storage, puis crée les matières correspondantes dans Supabase.
 */
export async function processFolderUpload(
  fileList: FileList | File[],
  onProgress?: (message: string) => void
): Promise<ImportFolderResult> {
  const files = Array.from(fileList);
  if (files.length === 0) {
    throw new Error('Aucun fichier sélectionné.');
  }

  onProgress?.(`Analyse du dossier (${files.length} fichiers détectés)...`);

  const user = getCurrentUserCached();
  const userId = user?.id || '';

  let pdfCount = 0;
  for (const f of files) {
    if (f.name.toLowerCase().endsWith('.pdf')) pdfCount++;
  }

  // Détection de la hiérarchie relative
  const subjectsMap: Record<string, { subfolders: Record<string, string[]>; rootFiles: string[] }> = {};
  const paths = files.map((f) => (f.webkitRelativePath || f.name).split('/').filter(Boolean));
  const topSegments = new Set(paths.map((p) => p[0]));
  const isWrappedInTopFolder = topSegments.size === 1 && paths.some((p) => p.length >= 3);

  paths.forEach((parts, idx) => {
    let subjectName = '';
    let category = 'Documents';
    const fileName = parts[parts.length - 1];
    const fileObj = files[idx];

    if (isWrappedInTopFolder) {
      subjectName = parts[1] || parts[0];
      if (parts.length >= 4) {
        category = parts.slice(2, -1).join(' / ');
      }
    } else {
      subjectName = parts[0];
      if (parts.length >= 3) {
        category = parts.slice(1, -1).join(' / ');
      }
    }

    // Sauvegarde unifiée dans IndexedDB locale et téléversement transparent vers Supabase Storage
    if (fileObj) {
      saveDocumentFile(fileObj, {
        userId,
        subject: subjectName,
        folder: category,
        fileName,
      }).catch((e) => console.warn('[courseImport] Erreur sauvegarde document:', fileName, e));
    }

    if (!subjectsMap[subjectName]) {
      subjectsMap[subjectName] = { subfolders: {}, rootFiles: [] };
    }

    if (category === 'Documents') {
      subjectsMap[subjectName].rootFiles.push(fileName);
    } else {
      if (!subjectsMap[subjectName].subfolders[category]) {
        subjectsMap[subjectName].subfolders[category] = [];
      }
      subjectsMap[subjectName].subfolders[category].push(fileName);
    }
  });

  const newCourses: Array<{ title: string; body_md: string; tags: string[] }> = [];

  Object.entries(subjectsMap).forEach(([subjectName, data]) => {
    let md = `## Arborescence et documents de ${subjectName}\n\n`;
    const subCats = Object.entries(data.subfolders);
    if (subCats.length > 0) {
      subCats.forEach(([catName, fileNames]) => {
        md += `### ${catName}\n\n`;
        const sortedFiles = fileNames.slice().sort((a, b) =>
          a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' })
        );
        sortedFiles.forEach((fn) => {
          md += `- ${fn}\n`;
        });
        md += `\n`;
      });
    }
    if (data.rootFiles.length > 0) {
      md += `### Documents généraux\n\n`;
      const sortedRoot = data.rootFiles.slice().sort((a, b) =>
        a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' })
      );
      sortedRoot.forEach((fn) => {
        md += `- ${fn}\n`;
      });
      md += `\n`;
    }

    newCourses.push({
      title: subjectName,
      body_md: md,
      tags: [subjectName, 'Dossier importé'],
    });
  });

  if (newCourses.length === 0) {
    throw new Error('Aucune arborescence valide extraite.');
  }

  onProgress?.(`Enregistrement de ${newCourses.length} matière(s)...`);
  await createBatchUserCourses(newCourses);

  return {
    subjectCount: newCourses.length,
    fileCount: files.length,
    pdfCount,
  };
}
