const SAVED_KEY = 'ev-saved-items-v1';
const ACTIVITY_KEY = 'ev-activity-v1';

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function readList(key) {
  if (typeof window === 'undefined') return [];
  return safeParse(localStorage.getItem(key), []);
}

function writeList(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function notify(name) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(name));
}

function makeKey(item) {
  return `${item.type}:${item.id ?? item.itemId}`;
}

export function getSavedItems() {
  return readList(SAVED_KEY);
}

export function isSavedItem(item) {
  const key = makeKey(item);
  return getSavedItems().some(entry => makeKey(entry) === key);
}

export function toggleSavedItem(item) {
  const current = getSavedItems();
  const key = makeKey(item);
  const exists = current.some(entry => makeKey(entry) === key);
  const next = exists
    ? current.filter(entry => makeKey(entry) !== key)
    : [{ ...item, savedAt: new Date().toISOString() }, ...current];
  writeList(SAVED_KEY, next);
  notify('ev:saved-changed');
  return next;
}

export function removeSavedItem(item) {
  const next = getSavedItems().filter(entry => makeKey(entry) !== makeKey(item));
  writeList(SAVED_KEY, next);
  notify('ev:saved-changed');
  return next;
}

export function getActivityEntries() {
  return readList(ACTIVITY_KEY);
}

export function recordActivity(entry) {
  const current = getActivityEntries();
  const next = [
    { ...entry, id: `${entry.type}:${entry.id}`, ts: entry.ts || new Date().toISOString() },
    ...current.filter(existing => !(existing.type === entry.type && existing.id === entry.id)),
  ].slice(0, 24);
  writeList(ACTIVITY_KEY, next);
  notify('ev:activity-changed');
  return next;
}

export function clearActivityEntry(entry) {
  const next = getActivityEntries().filter(existing => !(existing.type === entry.type && existing.id === entry.id));
  writeList(ACTIVITY_KEY, next);
  notify('ev:activity-changed');
  return next;
}

export function formatRelativeTime(input) {
  const date = new Date(input);
  const diff = Date.now() - date.getTime();
  const abs = Math.abs(diff);
  const units = [
    { ms: 60_000, label: 'm' },
    { ms: 3_600_000, label: 'h' },
    { ms: 86_400_000, label: 'd' },
  ];
  if (Number.isNaN(date.getTime())) return '';
  if (abs < 60_000) return 'just now';
  for (const unit of units) {
    const value = Math.floor(abs / unit.ms);
    if (value < (unit.label === 'm' ? 60 : unit.label === 'h' ? 24 : 1000)) {
      return diff >= 0 ? `${value}${unit.label} ago` : `in ${value}${unit.label}`;
    }
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
