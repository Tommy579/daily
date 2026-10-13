/**
 * Notifications éphémères non bloquantes (remplacent `alert()`).
 * La zone est (re)créée à la demande : compatible avec les View Transitions d'Astro.
 */
export type ToastTone = 'success' | 'error' | 'info';

export function toast(message: string, tone: ToastTone = 'success', duration = 3200): void {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toast-region';
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }

  const el = document.createElement('div');
  el.className = `toast toast--${tone}`;
  el.textContent = message;
  region.appendChild(el);

  window.setTimeout(() => {
    el.classList.add('is-leaving');
    // Retrait garanti même si les animations sont désactivées (prefers-reduced-motion).
    window.setTimeout(() => el.remove(), 220);
  }, duration);
}
