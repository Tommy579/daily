import { findDocumentBlob, saveDocumentBlob, dataUrlToBlob } from './fileStorage';
import { getCurrentUserCached, type DbCourse } from './supabase';

export interface OpenPdfOptions {
  title: string;
  subject?: string;
  folder?: string;
  fileUrl?: string;
  rawCourse?: DbCourse;
}

let activeBlobUrl: string | null = null;
let currentDocContext: OpenPdfOptions | null = null;

export function setupPdfViewerModal(): void {
  if (typeof window === 'undefined') return;

  const modal = document.getElementById('modal-pdf-viewer') as HTMLDialogElement | null;
  const btnClose = document.getElementById('btn-close-pdf-viewer');
  const dropBox = document.getElementById('pdf-drop-box');
  const fileInput = document.getElementById('input-pdf-missing') as HTMLInputElement | null;

  btnClose?.addEventListener('click', () => {
    if (modal) {
      if (typeof modal.close === 'function') modal.close();
      else modal.style.display = 'none';
    }
    const frame = document.getElementById('pdf-viewer-frame') as HTMLIFrameElement | null;
    if (frame) frame.src = '';
  });

  // Gestion du glisser-déposer sur la zone de fichier manquant
  dropBox?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropBox.classList.add('drag-over');
  });

  dropBox?.addEventListener('dragleave', () => {
    dropBox.classList.remove('drag-over');
  });

  dropBox?.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropBox.classList.remove('drag-over');
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      await handleAttachedPdfFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', async () => {
    if (fileInput.files && fileInput.files[0]) {
      await handleAttachedPdfFile(fileInput.files[0]);
      fileInput.value = '';
    }
  });
}

async function handleAttachedPdfFile(file: File): Promise<void> {
  if (!currentDocContext) return;
  const user = getCurrentUserCached();
  const userId = user?.id || '';
  const title = currentDocContext.title;
  const subject = currentDocContext.subject || '';
  const folder = currentDocContext.folder || '';

  // Sauvegarde dans IndexedDB
  await saveDocumentBlob(`doc:${userId}:${subject}:${folder}:${title}`, file);
  await saveDocumentBlob(`doc:${userId}:${title}`, file);
  await saveDocumentBlob(`doc:${title}`, file);
  await saveDocumentBlob(title, file);

  // Réaffichage immédiat
  await openPdfViewer(currentDocContext);
}

export async function openPdfViewer(options: OpenPdfOptions): Promise<void> {
  currentDocContext = options;
  const modal = document.getElementById('modal-pdf-viewer') as HTMLDialogElement | null;
  if (!modal) return;

  const titleEl = document.getElementById('pdf-viewer-title');
  const breadcrumbEl = document.getElementById('pdf-viewer-breadcrumb');
  const btnNewTab = document.getElementById('btn-pdf-new-tab') as HTMLButtonElement | null;
  const btnDownload = document.getElementById('btn-pdf-download') as HTMLAnchorElement | null;
  const frameWrapper = document.getElementById('pdf-frame-wrapper');
  const frame = document.getElementById('pdf-viewer-frame') as HTMLIFrameElement | null;
  const missingZone = document.getElementById('pdf-missing-zone');
  const missingFilename = document.getElementById('pdf-missing-filename');

  const docTitle = options.title;
  const docSubject = options.subject || 'Cours';
  const docFolder = options.folder || 'Document';

  if (titleEl) titleEl.textContent = docTitle;
  if (breadcrumbEl) breadcrumbEl.textContent = `${docSubject} / ${docFolder}`;
  if (missingFilename) missingFilename.textContent = docTitle;

  // Nettoyage de l'ancien URL Blob
  if (activeBlobUrl && activeBlobUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(activeBlobUrl);
    } catch {}
    activeBlobUrl = null;
  }

  let finalUrl: string | null = null;

  // 1. URL fournie directement (ex: lien web ou /cours-files/...)
  if (options.fileUrl && (options.fileUrl.startsWith('http') || options.fileUrl.startsWith('/') || options.fileUrl.startsWith('blob:'))) {
    finalUrl = options.fileUrl;
  }

  // 2. Data URL embarquée dans le cours
  if (!finalUrl && options.rawCourse?.body_md && options.rawCourse.body_md.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(options.rawCourse.body_md);
      activeBlobUrl = URL.createObjectURL(blob);
      finalUrl = activeBlobUrl;
    } catch (e) {
      console.warn('[PdfViewer] Erreur conversion dataUrl:', e);
    }
  }

  // 3. Recherche dans la base locale IndexedDB
  if (!finalUrl) {
    const user = getCurrentUserCached();
    const blob = await findDocumentBlob(user?.id, docSubject, docFolder, docTitle);
    if (blob) {
      activeBlobUrl = URL.createObjectURL(blob);
      finalUrl = activeBlobUrl;
    }
  }

  // 4. Si introuvable mais qu'il s'agit d'un fichier du repo statique
  if (!finalUrl && docTitle.endsWith('.pdf')) {
    // Tester si présent dans /cours-files/
    const possibleStatic = `/cours-files/${encodeURI(docSubject)}/${encodeURI(docFolder)}/${encodeURI(docTitle)}`;
    try {
      const headCheck = await fetch(possibleStatic, { method: 'HEAD' });
      if (headCheck.ok) {
        finalUrl = possibleStatic;
      }
    } catch {}
  }

  // Affichage du modal
  if (typeof modal.showModal === 'function') {
    if (!modal.open) modal.showModal();
  } else {
    modal.style.display = 'flex';
  }

  // Configuration de l'affichage
  if (finalUrl) {
    if (frameWrapper) frameWrapper.style.display = 'flex';
    if (missingZone) missingZone.style.display = 'none';
    if (frame) frame.src = finalUrl + '#view=FitH';

    if (btnNewTab) {
      btnNewTab.style.display = 'inline-flex';
      btnNewTab.onclick = () => window.open(finalUrl!, '_blank');
    }
    if (btnDownload) {
      btnDownload.style.display = 'inline-flex';
      btnDownload.href = finalUrl;
      btnDownload.download = docTitle;
    }
  } else {
    // Fichier non encore chargé
    if (frameWrapper) frameWrapper.style.display = 'none';
    if (missingZone) missingZone.style.display = 'flex';
    if (frame) frame.src = '';
    if (btnNewTab) btnNewTab.style.display = 'none';
    if (btnDownload) btnDownload.style.display = 'none';
  }
}
