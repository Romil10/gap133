import { NextResponse } from 'next/server';
import { deskKeyValid, KEY_COOKIE } from '../../../lib/access';

export const dynamic = 'force-dynamic';

// GET /api/unlock?key=XXXX
// Valid key -> set the desk-key cookie for 30 days and bounce to the board.
// Invalid -> bounce back to pricing with a #locked marker the UI can flag.
// Redirects are RELATIVE: behind Railway's proxy, an absolute URL built from
// request internals pointed users at https://localhost:8080/ (reproduced).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (key && deskKeyValid(key)) {
    const res = NextResponse.redirect('/?unlocked=1', 302);
    res.cookies.set(KEY_COOKIE, key, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return res;
  }
  return NextResponse.redirect('/#locked', 302);
}
