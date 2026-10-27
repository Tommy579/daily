import ICAL from 'ical.js';
import { STORAGE_KEYS, savePersistent, loadPersistent } from './persistence';
import {
  getSupabaseCredentials,
  getCurrentUser,
  fetchTimetableFromSupabase,
  syncTimetableToSupabase,
  clearUserScheduleEvents,
} from './supabase';

export interface TimetableEvent {

  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  location?: string;
  description?: string;
  courseId?: string;
  category?: 'cm' | 'td' | 'tp' | 'habit' | 'other';
}

export interface ReminderItem {
  id: string;
  title: string;
  type: 'texte' | 'cours' | 'custom';
  targetUrl: string;
  targetTitle: string;
  triggerTime: string; // ISO string
  createdTime: string; // ISO string
  status: 'pending' | 'triggered' | 'cancelled';
  notes?: string;
}

export interface WeeklyTemplateEvent {
  dayOffset: number; // 0 = Lundi, 1 = Mardi, 2 = Mercredi, ... 6 = Dimanche
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  title: string;
  location?: string;
  category: 'cm' | 'td' | 'tp' | 'habit' | 'other';
  description?: string;
}

/**
 * Modèle hebdomadaire des cours (issu de votre emploi du temps universitaire)
 */
export const WEEKLY_SCHEDULE_TEMPLATE: WeeklyTemplateEvent[] = [
  // LUNDI (0)
  {
    dayOffset: 0,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 90,
    title: 'CM - Analyse numérique 1 G01',
    location: 'Amphi C',
    description: 'Cours magistral : Méthodes directes et itératives de résolution de systèmes linéaires, conditionnement et interpolation polynomiale.',
    category: 'cm',
  },
  {
    dayOffset: 0,
    startHour: 14,
    startMinute: 0,
    durationMinutes: 120,
    title: 'TD - Analyse numérique 1 G02',
    location: 'Salle E109',
    description: 'Travaux dirigés : Exercices d’application sur les normes matricielles, factorisation LU et méthode de Cholesky. Apporter calculatrice ou support de notes.',
    category: 'td',
  },

  // MARDI (1)
  {
    dayOffset: 1,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 75,
    title: 'CM - Analyse numérique 1 G01',
    description: 'Cours magistral : Méthodes itératives de Jacobi, Gauss-Seidel et relaxation (SOR). Critères de convergence.',
    category: 'cm',
  },
  {
    dayOffset: 1,
    startHour: 10,
    startMinute: 15,
    durationMinutes: 120,
    title: 'TD - EDO & systèmes dynamiques G02/2',
    location: 'Salle E309',
    description: 'Travaux dirigés : Équations différentielles linéaires d’ordre 1 et 2, résolvante, exponentielle de matrice et portraits de phase.',
    category: 'td',
  },
  {
    dayOffset: 1,
    startHour: 13,
    startMinute: 45,
    durationMinutes: 60,
    title: 'CM - Algèbre linéaire numérique',
    description: 'Cours magistral : Décomposition en valeurs singulières (SVD), moindres carrés linéaires et orthogonalisation de Gram-Schmidt.',
    category: 'cm',
  },
  {
    dayOffset: 1,
    startHour: 14,
    startMinute: 45,
    durationMinutes: 135,
    title: 'TD - Algèbre linéaire numérique & matlab G02',
    location: 'Salle B214 (Salle informatique)',
    description: 'Travaux pratiques sur machine : Implémentation des algorithmes de factorisation QR et SVD sous Matlab/Octave.',
    category: 'td',
  },

  // MERCREDI (2)
  {
    dayOffset: 2,
    startHour: 13,
    startMinute: 30,
    durationMinutes: 120,
    title: 'TD - Analyse numérique 1 G02',
    location: 'Salle E109',
    description: 'Travaux dirigés : Intégration numérique (trapèzes, Simpson), calcul d’erreurs et quadrature de Gauss.',
    category: 'td',
  },
  {
    dayOffset: 2,
    startHour: 15,
    startMinute: 45,
    durationMinutes: 120,
    title: "CM - Histoire des sciences et de l'industrie",
    location: 'Salle A231 (Amphi Gradiné)',
    description: 'Cours magistral : Histoire des révolutions techniques et industrielles, genèse du calcul mécanisé et de l’informatique moderne.',
    category: 'cm',
  },

  // JEUDI (3)
  {
    dayOffset: 3,
    startHour: 10,
    startMinute: 15,
    durationMinutes: 120,
    title: 'TD - EDO & systèmes dynamiques G02/2',
    location: 'Salle E309',
    description: 'Travaux dirigés : Systèmes non-linéaires, points d’équilibre, linéarisation et théorème de stabilité de Lyapunov.',
    category: 'td',
  },
  {
    dayOffset: 3,
    startHour: 14,
    startMinute: 0,
    durationMinutes: 180,
    title: 'TD - Langage C G02',
    location: 'Salle Info B204',
    description: 'Programmation en C : Manipulation des pointeurs, allocation dynamique (malloc/free), gestion des structures et fichiers binaires.',
    category: 'td',
  },

  // VENDREDI (4)
  {
    dayOffset: 4,
    startHour: 10,
    startMinute: 0,
    durationMinutes: 120,
    title: 'TD - Matlab & Modélisation G02',
    location: 'Salle Info B102',
    description: 'Simulation numérique : Résolution d’EDO par Runge-Kutta sous Matlab et tracé des trajectoires dans l’espace des phases.',
    category: 'td',
  },
  {
    dayOffset: 4,
    startHour: 14,
    startMinute: 0,
    durationMinutes: 120,
    title: 'CM - Épistémologie & Philosophie des Techniques',
    location: 'Amphi Émilie du Châtelet',
    description: 'Séminaire philosophique : La technique comme milieu humain, critique de l’automatisation et dialogue avec les textes d’Arendt et Simondon.',
    category: 'cm',
  },
];

/**
 * Génère les événements du planning récurrent pour une semaine donnée (commençant le lundi spécifié).
 */
export function generateWeekEvents(monday: Date): Array<{
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  category: 'cm' | 'td' | 'tp' | 'habit' | 'other';
}> {
  return WEEKLY_SCHEDULE_TEMPLATE.map((tpl, idx) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + tpl.dayOffset);
    start.setHours(tpl.startHour, tpl.startMinute, 0, 0);

    const end = new Date(start.getTime() + tpl.durationMinutes * 60 * 1000);

    return {
      id: `ev-${start.toISOString()}-${idx}`,
      title: tpl.title,
      start,
      end,
      location: tpl.location,
      description: tpl.description,
      category: tpl.category,
    };
  });
}

export const SAMPLE_ICS_DATA = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Marges Universitaire//FR
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:sample-num1-cm@marges
DTSTART:20261013T090000
DTEND:20261013T101500
SUMMARY:CM - ECUE Analyse numérique 1 G01
DESCRIPTION:CM Analyse numérique
END:VEVENT
BEGIN:VEVENT
UID:sample-edo-td@marges
DTSTART:20261013T101500
DTEND:20261013T121500
SUMMARY:TD - MA3 EDO & systèmes dynamiques G02/2
LOCATION:Salle E309
DESCRIPTION:10:15 (08:15 GMT)
END:VEVENT
BEGIN:VEVENT
UID:sample-alg-cm@marges
DTSTART:20261013T134500
DTEND:20261013T144500
SUMMARY:CM - ECUE Algèbre linéaire numérique &...
DESCRIPTION:Algèbre linéaire et calcul matriciel
END:VEVENT
BEGIN:VEVENT
UID:sample-alg-td@marges
DTSTART:20261013T144500
DTEND:20261013T170000
SUMMARY:TD - ECUE Algèbre linéaire numérique & matlab G02
LOCATION:Salle B214 (Salle informatique)
DESCRIPTION:14:45 (12:45 GMT)
END:VEVENT
BEGIN:VEVENT
UID:sample-num2-td@marges
DTSTART:20261014T133000
DTEND:20261014T153000
SUMMARY:TD - ECUE Analyse numérique 1 G02
LOCATION:Salle E109
DESCRIPTION:13:30 (11:30 GMT)
END:VEVENT
BEGIN:VEVENT
UID:sample-hist-cm@marges
DTSTART:20261014T154500
DTEND:20261014T174500
SUMMARY:CM - MA3 Histoire des sciences et de l'industrie
LOCATION:Salle A231 (Amphi Gradiné)
DESCRIPTION:15:45 (13:45 GMT)
END:VEVENT
END:VCALENDAR`;

/**
 * Convertit un flux RSS/Atom contenant des événements vers le format iCalendar standard (VCalendar).
 */
export function convertRssToIcs(xmlText: string): string {
  if (typeof DOMParser === 'undefined') return xmlText;
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item, entry'));
    if (!items.length) return xmlText;

    let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Marges RSS Adapter//FR\r\nCALSCALE:GREGORIAN\r\n";
    items.forEach((item, idx) => {
      const title = item.querySelector('title')?.textContent || 'Événement';
      const desc = item.querySelector('description, summary, content')?.textContent || '';
      const dateStr = item.querySelector('pubDate, date, updated, published')?.textContent;
      const d = dateStr ? new Date(dateStr) : new Date();
      const end = new Date(d.getTime() + 90 * 60 * 1000); // 1h30 par défaut

      const toIcsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      ics += "BEGIN:VEVENT\r\n";
      ics += `UID:rss-${idx}-${d.getTime()}@marges\r\n`;
      ics += `DTSTART:${toIcsDate(d)}\r\n`;
      ics += `DTEND:${toIcsDate(end)}\r\n`;
      ics += `SUMMARY:${title.replace(/\r?\n/g, ' ')}\r\n`;
      if (desc) ics += `DESCRIPTION:${desc.slice(0, 200).replace(/\r?\n/g, ' ')}\r\n`;
      ics += "END:VEVENT\r\n";
    });
    ics += "END:VCALENDAR\r\n";
    return ics;
  } catch {
    return xmlText;
  }
}

/**
 * Extrait et normalise un contenu iCalendar (.ics) ou RSS depuis une réponse brute ou enveloppée en JSON (ex: AllOrigins /get).
 */
function extractValidCalendarContent(rawText: string): string | null {
  if (!rawText) return null;
  let candidate = rawText.trim();

  // Si la réponse provient d'un endpoint JSON type /get?url=... ({ contents: "..." })
  if (candidate.startsWith('{') && candidate.includes('"contents"')) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed.contents === 'string') {
        candidate = parsed.contents.trim();
        // Certains proxys encodent application/octet-stream en data URI base64
        if (candidate.startsWith('data:') && candidate.includes(';base64,')) {
          const b64 = candidate.split(';base64,')[1] || '';
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          candidate = new TextDecoder('utf-8').decode(bytes).trim();
        }
      }
    } catch {}
  }

  if (candidate.includes('BEGIN:VCALENDAR') || candidate.includes('BEGIN:VEVENT')) {
    return candidate;
  }
  if (candidate.includes('<rss') || candidate.includes('<feed')) {
    return convertRssToIcs(candidate);
  }
  return null;
}

async function fetchWithTimeout(targetUrl: string, timeoutMs: number, headers?: Record<string, string>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    const valid = extractValidCalendarContent(text);
    if (!valid) {
      throw new Error('Contenu iCalendar non reconnu');
    }
    return valid;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Télécharge un calendrier distant depuis une URL (iCal, Hyperplanning, ADE, Webcal ou RSS)
 * avec contournement automatique du blocage CORS des navigateurs web.
 */
export async function fetchCalendarFromUrl(rawUrl: string): Promise<string> {
  let url = rawUrl.trim();
  if (!url) throw new Error('URL de calendrier manquante.');

  // Normalisation des protocoles Webcal et Feed
  if (url.startsWith('webcal://')) {
    url = 'https://' + url.slice('webcal://'.length);
  } else if (url.startsWith('feed://')) {
    url = 'https://' + url.slice('feed://'.length);
  }

  // 1. Si on est sur le serveur local Node (dev), tenter le proxy local en priorité (instantané et sans restriction CORS)
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    try {
      return await fetchWithTimeout(`${base}/api/calendar/proxy?url=${encodeURIComponent(url)}`, 5000);
    } catch {}
  }

  // 2. Tenter un fetch direct (si le serveur universitaire autorise CORS)
  try {
    return await fetchWithTimeout(url, 3500, {
      Accept: 'text/calendar, application/rss+xml, application/atom+xml, text/plain, */*',
    });
  } catch {}

  // 3. Passerelles CORS publiques lancées en parallèle (Promise.any retient la première qui répond avec un .ics valide)
  // Indispensable sur un site web statique (GitHub Pages) car les serveurs comme Hyperplanning / Apogée
  // n'envoient pas l'en-tête navigateur Access-Control-Allow-Origin (contrairement à Apple Calendar qui n'est pas un navigateur).
  const encoded = encodeURIComponent(url);
  const proxyCandidates = [
    `https://allorigins.hexlet.app/raw?url=${encoded}`,
    `https://allorigins.hexlet.app/get?disableCache=true&url=${encoded}`,
    `https://api.allorigins.win/raw?url=${encoded}`,
    `https://api.allorigins.win/get?disableCache=true&url=${encoded}`,
    `https://api.codetabs.com/v1/proxy?quest=${encoded}`,
  ];

  try {
    return await Promise.any(
      proxyCandidates.map((proxyUrl) => fetchWithTimeout(proxyUrl, 10000))
    );
  } catch {
    throw new Error(
      "Impossible de récupérer le flux directement en ligne (les passerelles CORS n'ont pas pu joindre le serveur de votre établissement). Vous pouvez télécharger le fichier .ics en ouvrant votre lien dans un nouvel onglet puis le déposer dans le champ d'importation de fichier."
    );
  }
}

export interface ParsedCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  category: 'cm' | 'td' | 'tp' | 'habit' | 'other';
}

/**
 * Extrait les événements d'un contenu iCalendar (.ics) strictement compris dans une fenêtre temporelle
 * (en respectant les dates réelles, les fuseaux horaires et les récurrences RRULE éventuelles).
 */
export function parseIcsEvents(
  icsContent: string,
  rangeStart: Date,
  rangeEnd: Date
): ParsedCalendarEvent[] {
  if (!icsContent || !icsContent.includes('BEGIN:VCALENDAR')) return [];
  const events: ParsedCalendarEvent[] = [];
  const seen = new Set<string>();

  try {
    const icalLib = (ICAL as any).default || ICAL;
    if (!icalLib || !icalLib.parse) return [];

    const jcal = icalLib.parse(icsContent);
    const comp = new icalLib.Component(jcal);
    const vevents = comp.getAllSubcomponents('vevent');

    for (const vevent of vevents) {
      const ev = new icalLib.Event(vevent);
      const title = (ev.summary || 'Cours').trim();
      if (!title) continue;

      let category: 'cm' | 'td' | 'tp' | 'other' = 'cm';
      const t = title.toUpperCase();
      if (t.includes('TD')) category = 'td';
      else if (t.includes('TP')) category = 'tp';

      const location = ev.location ? ev.location.trim() : undefined;
      const description = ev.description ? ev.description.trim() : undefined;

      if (ev.isRecurring()) {
        const iter = ev.iterator();
        let next;
        while ((next = iter.next())) {
          const evStart = next.toJSDate();
          if (evStart > rangeEnd) break;
          const dur = ev.duration;
          const evEnd = new Date(evStart.getTime() + (dur ? dur.toSeconds() * 1000 : 3600 * 1000));
          if (evEnd >= rangeStart && evStart <= rangeEnd) {
            const key = `${title}|${evStart.getTime()}`;
            if (!seen.has(key)) {
              seen.add(key);
              events.push({
                id: ev.uid ? `${ev.uid}-${evStart.getTime()}` : `ics-${Math.random()}`,
                title,
                start: evStart,
                end: evEnd,
                location,
                description,
                category,
              });
            }
          }
        }
      } else {
        const evStart = ev.startDate.toJSDate();
        const evEnd = ev.endDate ? ev.endDate.toJSDate() : new Date(evStart.getTime() + 3600 * 1000);
        if (evEnd >= rangeStart && evStart <= rangeEnd) {
          const key = `${title}|${evStart.getTime()}`;
          if (!seen.has(key)) {
            seen.add(key);
            events.push({
              id: ev.uid || `ics-${Math.random()}`,
              title,
              start: evStart,
              end: evEnd,
              location,
              description,
              category,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Calendar Parse] Erreur parseIcsEvents:', err);
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}

let lastLiveUrlRefreshTs = 0;
const LIVE_REFRESH_INTERVAL_MS = 2 * 60 * 1000; // Rafraîchissement live toutes les 2 minutes max par session

/**
 * Synchronisation automatique bidirectionnelle de l'emploi du temps entre le stockage local,
 * le flux live iCal (Hyperplanning / ADE) et le Cloud Supabase.
 */
export async function syncTimetableState(options?: {
  forcePushLocal?: boolean;
  forceLiveRefresh?: boolean;
}): Promise<{
  synced: boolean;
  source: 'local' | 'cloud' | 'none';
  icsContent?: string;
  icsUrl?: string;
}> {
  if (typeof window === 'undefined') {
    return { synced: false, source: 'none' };
  }

  const { isConfigured } = getSupabaseCredentials();
  const localIcs = loadPersistent(STORAGE_KEYS.TIMETABLE_ICS);
  const localUrl = loadPersistent(STORAGE_KEYS.TIMETABLE_URL);

  if (!isConfigured) {
    return {
      synced: false,
      source: 'local',
      icsContent: localIcs || undefined,
      icsUrl: localUrl || undefined,
    };
  }

  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (!user) {
    return {
      synced: false,
      source: 'local',
      icsContent: localIcs || undefined,
      icsUrl: localUrl || undefined,
    };
  }

  try {
    const cloud = await fetchTimetableFromSupabase();

    // Cas 1 : L'utilisateur a explicitement demandé de pousser son fichier local (forcePushLocal: true)
    if (options?.forcePushLocal && (localIcs || localUrl)) {
      console.log('[Marges Sync] Synchronisation du calendrier local vers Supabase Cloud (forcée)...');
      await syncTimetableToSupabase({
        icsContent: localIcs || undefined,
        icsUrl: localUrl || undefined,
      });

      // Nettoyer les faux créneaux auto-générés dans schedule_events pour éviter les doublons
      await clearUserScheduleEvents().catch(() => {});

      return {
        synced: true,
        source: 'local',
        icsContent: localIcs || undefined,
        icsUrl: localUrl || undefined,
      };
    }

    // Cas 2 : Le Cloud Supabase possède l'emploi du temps de cet utilisateur
    if (cloud && (cloud.icsContent || cloud.icsUrl)) {
      let activeIcs = cloud.icsContent || '';
      let activeUrl = cloud.icsUrl || '';

      savePersistent(STORAGE_KEYS.TIMETABLE_ICS, activeIcs);
      savePersistent(STORAGE_KEYS.TIMETABLE_URL, activeUrl);

      // Si une URL iCal (ex: Hyperplanning) est enregistrée, rafraîchir le flux en direct
      // pour répercuter automatiquement les cours déplacés, ajoutés ou supprimés.
      const shouldRefreshLive =
        Boolean(activeUrl) &&
        (options?.forceLiveRefresh ||
          !activeIcs ||
          Date.now() - lastLiveUrlRefreshTs > LIVE_REFRESH_INTERVAL_MS);

      if (shouldRefreshLive && activeUrl) {
        try {
          const fetched = await fetchCalendarFromUrl(activeUrl);
          if (fetched && fetched.includes('BEGIN:VCALENDAR')) {
            lastLiveUrlRefreshTs = Date.now();
            const hasChanged = fetched !== activeIcs;
            activeIcs = fetched;
            savePersistent(STORAGE_KEYS.TIMETABLE_ICS, fetched);
            if (hasChanged) {
              await syncTimetableToSupabase({ icsContent: fetched, icsUrl: activeUrl }).catch(() => {});
            }
          }
        } catch (fetchErr) {
          console.warn('[Marges Sync] Repli sur la dernière version en cache du calendrier:', fetchErr);
        }
      }

      await clearUserScheduleEvents().catch(() => {});

      return {
        synced: true,
        source: 'cloud',
        icsContent: activeIcs || undefined,
        icsUrl: activeUrl || undefined,
      };
    }

    // Cas 3 : Si l'utilisateur a configuré son emploi du temps localement (.ics ou URL) mais que le Cloud est encore vide,
    // on le synchronise automatiquement vers son compte Supabase !
    if (localIcs || localUrl) {
      console.log('[Marges Sync] Synchronisation automatique du calendrier local vers le compte Supabase...');
      await syncTimetableToSupabase({
        icsContent: localIcs || undefined,
        icsUrl: localUrl || undefined,
      }).catch((e) => console.warn('[Marges Sync] Auto-sync échoué:', e));

      return {
        synced: true,
        source: 'local',
        icsContent: localIcs || undefined,
        icsUrl: localUrl || undefined,
      };
    }

    return {
      synced: true,
      source: 'none',
      icsContent: '',
      icsUrl: '',
    };
  } catch (syncErr) {
    console.warn('[Marges Sync] Erreur lors de la synchronisation Supabase:', syncErr);
    return {
      synced: false,
      source: 'local',
      icsContent: localIcs || undefined,
      icsUrl: localUrl || undefined,
    };
  }
}

