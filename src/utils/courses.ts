import fs from 'node:fs';
import path from 'node:path';
import { url } from './url';

export type CourseFileType = 'pdf' | 'doc' | 'code' | 'text' | 'other';

export interface CourseFile {
  name: string;
  path: string; // relative to COURS_DIR, ex: "EDO/CM/Cours9.pdf"
  url: string;  // web public url to open/download
  viewerUrl: string;
  size: number;
  ext: string;
  type: CourseFileType;
  modified: string;
}

export interface CourseFolder {
  name: string;
  path: string;
  subfolders: CourseFolder[];
  files: CourseFile[];
}

export interface CourseSubject {
  id: string;
  name: string;
  description?: string;
  folder: CourseFolder;
  stats: {
    totalFiles: number;
    pdfCount: number;
    docCount: number;
    codeCount: number;
  };
}

const LOCAL_COURS_DIR = '/home/tom/Documents/Cours';
const BUNDLED_COURS_DIR = path.resolve('public/cours-files');

export const COURS_ROOT =
  fs.existsSync(LOCAL_COURS_DIR) && fs.readdirSync(LOCAL_COURS_DIR).filter((i) => !i.startsWith('.')).length > 0
    ? LOCAL_COURS_DIR
    : BUNDLED_COURS_DIR;

function getFileType(ext: string): CourseFileType {
  const e = ext.toLowerCase();
  if (e === '.pdf') return 'pdf';
  if (['.doc', '.docx', '.odt', '.rtf'].includes(e)) return 'doc';
  if (['.c', '.h', '.cpp', '.m', '.py', '.js', '.ts', '.sh', '.sci', '.sce'].includes(e)) return 'code';
  if (['.txt', '.md'].includes(e)) return 'text';
  return 'other';
}

function scanFolder(dirPath: string, relativeBase: string = ''): CourseFolder {
  const folderName = path.basename(dirPath);
  const items = fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
  
  const subfolders: CourseFolder[] = [];
  const files: CourseFile[] = [];

  for (const item of items) {
    if (item.startsWith('.')) continue;
    const fullPath = path.join(dirPath, item);
    const relPath = relativeBase ? `${relativeBase}/${item}` : item;
    
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        subfolders.push(scanFolder(fullPath, relPath));
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        files.push({
          name: item,
          path: relPath,
          url: url(`/cours-files/${encodeURI(relPath)}`),
          viewerUrl: url(`/cours/viewer/${encodeURI(relPath)}`),
          size: stat.size,
          ext,
          type: getFileType(ext),
          modified: stat.mtime.toISOString(),
        });
      }
    } catch {
      // ignore
    }
  }

  subfolders.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' }));
  files.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' }));

  return {
    name: folderName,
    path: relativeBase,
    subfolders,
    files,
  };
}

function countFolderStats(folder: CourseFolder): { totalFiles: number; pdfCount: number; docCount: number; codeCount: number } {
  let totalFiles = folder.files.length;
  let pdfCount = folder.files.filter((f) => f.type === 'pdf').length;
  let docCount = folder.files.filter((f) => f.type === 'doc').length;
  let codeCount = folder.files.filter((f) => f.type === 'code').length;

  for (const sub of folder.subfolders) {
    const subStats = countFolderStats(sub);
    totalFiles += subStats.totalFiles;
    pdfCount += subStats.pdfCount;
    docCount += subStats.docCount;
    codeCount += subStats.codeCount;
  }

  return { totalFiles, pdfCount, docCount, codeCount };
}

export function getCourses(): CourseSubject[] {
  if (!fs.existsSync(COURS_ROOT)) return [];

  const items = fs.readdirSync(COURS_ROOT);
  const subjects: CourseSubject[] = [];

  for (const item of items) {
    if (item.startsWith('.')) continue;
    const fullPath = path.join(COURS_ROOT, item);
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        const folder = scanFolder(fullPath, item);
        const stats = countFolderStats(folder);
        const slugId = item
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        subjects.push({
          id: slugId || item.toLowerCase(),
          name: item,
          folder,
          stats,
        });
      }
    } catch {
      // ignore
    }
  }

  subjects.sort((a, b) => a.name.localeCompare(b.name));
  return subjects;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
