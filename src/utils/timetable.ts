export interface TimetableEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  location?: string;
  description?: string;
  courseId?: string; // liaison optionnelle avec un cours
  category?: 'cm' | 'td' | 'tp' | 'exam' | 'other';
}

export interface ReminderItem {
  id: string;
  title: string;
  type: 'texte' | 'cours' | 'custom';
  targetUrl: string; // ex: /textes/ia-peut-elle-nous-comprendre/ ou /cours/viewer/matlab/...
  targetTitle: string;
  triggerTime: string; // ISO string
  createdTime: string; // ISO string
  status: 'pending' | 'triggered' | 'cancelled';
  notes?: string;
}

export const SAMPLE_ICS_DATA = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Marges Universitaire//FR
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:sample-philo-1@marges
DTSTART:20261014T083000Z
DTEND:20261014T103000Z
SUMMARY:Philosophie des Techniques & IA
LOCATION:Amphithéâtre Émilie du Châtelet
DESCRIPTION:Épistémologie des modèles statistiques et éthique computationnelle.
END:VEVENT
BEGIN:VEVENT
UID:sample-c-td@marges
DTSTART:20261014T140000Z
DTEND:20261014T170000Z
SUMMARY:Langage C — TD4 : Types & Pointeurs
LOCATION:Salle Info B204
DESCRIPTION:Travaux pratiques sur allocation dynamique et structures.
END:VEVENT
BEGIN:VEVENT
UID:sample-matlab-td@marges
DTSTART:20261015T100000Z
DTEND:20261015T120000Z
SUMMARY:Matlab — TD3 : Matrices & Fibonacci
LOCATION:Salle Info B102
DESCRIPTION:Matrices Toeplitz et algorithmes matriciels.
END:VEVENT
BEGIN:VEVENT
UID:sample-edo@marges
DTSTART:20261016T083000Z
DTEND:20261016T113000Z
SUMMARY:Équations Différentielles Ordinaires (EDO)
LOCATION:Amphi 2
DESCRIPTION:Résolution des systèmes différentiels linéaires du 1er ordre.
END:VEVENT
END:VCALENDAR`;
