import { NextResponse } from 'next/server';
import { deskKeyValid, KEY_COOKIE } from '../../../lib/access';

export const dynamic = 'force-dynamic';

// GET /api/unlock?key=XXXX
// Valid key -> set the desk-key cookie for 30 days and bounce to the board.
// Invalid -> bounce back to pricing with a #locked marker the UI can flag.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const base = `${url.protocol}//${url.host}`;

  if (key && deskKeyValid(key)) {
    const res = NextResponse.redirect(`${base}/`, 302);
    res.cookies.set(KEY_COOKIE, key, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return res;
  }
  return NextResponse.redirect(`${base}/#locked`, 302);
}
