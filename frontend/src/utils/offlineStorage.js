// src/utils/offlineStorage.js
const FILE_CACHE = 'examvault-files-v1';

export const saveFileOffline = async (url) => {
  if (!('caches' in window)) return false;
  try {
    const cache = await caches.open(FILE_CACHE);
    await cache.add(url);
    return true;
  } catch (err) {
    console.error('Failed to cache file', err);
    return false;
  }
};

export const removeFileOffline = async (url) => {
  if (!('caches' in window)) return false;
  try {
    const cache = await caches.open(FILE_CACHE);
    return await cache.delete(url);
  } catch {
    return false;
  }
};

export const checkFileOffline = async (url) => {
  if (!('caches' in window)) return false;
  try {
    const cache = await caches.open(FILE_CACHE);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
};
