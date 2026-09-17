import Link from 'next/link';
import { SpiralMark } from './spiral-mark';

export default function NotFound() {
  return (
    <main className="wrap legal" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="guide-head" style={{ marginBottom: 0 }}>
        <SpiralMark size={44} />
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', marginTop: 18 }}>404 · market not found</h1>
        <p className="sub" style={{ marginTop: 10 }}>
          This page does not exist. The market you might be looking for is probably on the board.
        </p>
        <p style={{ marginTop: 22 }}>
          <Link href="/" className="cta">Back to the terminal</Link>
        </p>
      </div>
    </main>
  );
}
