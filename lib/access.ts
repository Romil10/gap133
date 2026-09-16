import { cookies } from 'next/headers';

// Desk-key access, v0: keys live in the DESK_KEYS env var (comma-separated).
// Romil's owner key lives there; paying users get keys added to the same list
// until the crypto-payment flow replaces manual keying.
// The key rides in an httpOnly cookie so the server (not the client) decides
// what's unlocked — the same check will gate /api/snapshot for the paid tier.

export const KEY_COOKIE = 'gap369_key';

export function deskKeyValid(key: string | undefined | null): boolean {
  if (!key) return false;
  const keys = (process.env.DESK_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean);
  return keys.includes(key);
}

export async function isUnlocked(): Promise<boolean> {
  try {
    const store = await cookies();
    return deskKeyValid(store.get(KEY_COOKIE)?.value);
  } catch {
    return false;
  }
}
