import fs from 'node:fs';
import path from 'node:path';

export interface CourseFile {
  name: string;
  path: string; // relative to COURS_DIR, ex: "matlab/TD3/fibo.m"
  url: string;  // web public url to open/download
  viewerUrl: string;
  size: number;
  ext: string;
  type: 'pdf' | 'code' | 'text' | 'other';
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
    codeCount: number;
  };
}

export const COURS_ROOT = '/home/tom/Documents/Cours';

function getFileType(ext: string): 'pdf' | 'code' | 'text' | 'other' {
  const e = ext.toLowerCase();
  if (e === '.pdf') return 'pdf';
  if (['.c', '.h', '.cpp', '.m', '.py', '.js', '.ts', '.sh'].includes(e)) return 'code';
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
          url: `/cours-files/${encodeURI(relPath)}`,
          viewerUrl: `/cours/viewer/${encodeURI(relPath)}`,
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

  subfolders.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return {
    name: folderName,
    path: relativeBase,
    subfolders,
    files,
  };
}

function countFolderStats(folder: CourseFolder): { totalFiles: number; pdfCount: number; codeCount: number } {
  let totalFiles = folder.files.length;
  let pdfCount = folder.files.filter((f) => f.type === 'pdf').length;
  let codeCount = folder.files.filter((f) => f.type === 'code').length;

  for (const sub of folder.subfolders) {
    const subStats = countFolderStats(sub);
    totalFiles += subStats.totalFiles;
    pdfCount += subStats.pdfCount;
    codeCount += subStats.codeCount;
  }

  return { totalFiles, pdfCount, codeCount };
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
        subjects.push({
          id: item.toLowerCase(),
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
