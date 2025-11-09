import { db } from './db';

export async function ensureDatabaseHealthy() {
  try {
    await db.info();
    return true;
  } catch (err) {
    console.warn('[SmartNotes] IndexedDB broken, forcing self-repair...', err);
    try {
      await db.destroy();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error('[SmartNotes] FAIL during self-repair:', e);
    }
    return false;
  }
}
