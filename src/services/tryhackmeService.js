// backend/src/services/tryhackmeService.js



let fetchFn;
async function getFetch() {
  if (!fetchFn) {
    fetchFn = (await import('node-fetch')).default;
  }
  return fetchFn;
}

/**
 * Fetch TryHackMe user profile and progress by username
 * @param {string} username
 * @returns {Promise<object>} profile data or null
 */

export async function fetchTryHackMeProfile(username) {
  const url = `https://tryhackme.com/api/user/${encodeURIComponent(username)}`;
  const fetch = await getFetch();
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}
