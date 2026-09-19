import type { Metadata } from 'next';
import Link from 'next/link';
import { SpiralMark } from '../spiral-mark';

export const metadata: Metadata = {
  title: 'API & MCP',
  description: 'The gap133 desk API: tier-keyed REST for matched pairs, fee-adjusted gaps, executability — plus an MCP server so AI agents can query the board directly.',
};

export default function ApiDocs() {
  const code = `{
  "mcpServers": {
    "gap133": {
      "type": "http",
      "url": "https://gap133-production.up.railway.app/api/mcp",
      "headers": { "X-API-Key": "<your-desk-key>" }
    }
  }
}`;
  const curl = `curl -s https://gap133-production.up.railway.app/api/v1/pairs \\
  -H "X-API-Key: <your-desk-key>" \\
  -d limit=5 -d minNet=1`;
  const mt = `curl -s https://gap133-production.up.railway.app/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <your-desk-key>" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"biggest_gaps","arguments":{"limit":3}}}'`;

  return (
    <main className="wrap legal apidocs">
      <header className="guide-head">
        <Link href="/" className="backlink">&larr; back to the terminal</Link>
        <div className="guide-brand">
          <SpiralMark size={52} />
          <h1>API &amp; MCP</h1>
        </div>
        <p className="sub">
          The desk API: every verified pair with its raw gap, fee-adjusted net, executable
          size, and the full gate trail — as JSON. Plus an MCP server, so AI agents can query
          the board directly. Desk holders only; the same key that unlocks the terminal.
        </p>
      </header>

      <section>
        <h2>Authentication — one key</h2>
        <p>
          <code>&lt;your-desk-key&gt;</code> is your <b>desk key</b> — the same key that unlocks
          the terminal (the one in your <code>/api/unlock?key=...</code> link). Paste it wherever
          you see <code>&lt;your-desk-key&gt;</code> below. Requests without it return 401.
        </p>
      </section>

      <section>
        <h2>REST endpoints</h2>
        <table className="ep">
          <tbody>
            <tr><td className="m">GET /api/v1/pairs</td><td>All matched pairs. Params: <code>limit</code> (max 250), <code>minNet</code> (cents), <code>ticker</code> (single pair).</td></tr>
          </tbody>
        </table>
        <p>Auth: <code>X-API-Key: &lt;your-desk-key&gt;</code> header (or <code>?key=</code>). Rate limit: 120 requests per 10 minutes per key.</p>
        <pre className="code">{curl}</pre>
        <p>Every pair object carries the venue legs with deep links, the gap block (<code>rawCents</code>, <code>netCents</code>, <code>netPositive</code>, <code>buyVenue</code>, <code>execSizeUsd</code>) and the gate block (match score, Jev probability, staleness).</p>
      </section>

      <section>
        <h2>MCP server</h2>
        <p>
          Point any MCP client at <code>/api/mcp</code> (streamable HTTP, JSON-RPC 2.0).
          Discovery is open; tool calls need your desk key. Four tools: <code>list_pairs</code>,{' '}
          <code>get_pair</code>, <code>biggest_gaps</code>, <code>net_positive</code>.
        </p>
        <pre className="code">{code}</pre>
        <p>A raw call, for testing:</p>
        <pre className="code">{mt}</pre>
      </section>

      <section>
        <h2>Why we offer this</h2>
        <p>
          Most scanners lock their data behind a dashboard. Ours is a terminal for humans and
          for the agents you delegate to. If you run strategies in code, take the board with
          you. If your AI assistant tracks markets, it can ask gap133 directly.
        </p>
      </section>

      <footer className="ftr">
        <p className="ftr-line1">gap133 desk API · desk holders only · nothing here is trading advice.</p>
        <p className="ftr-line2">
          <Link href="/">terminal</Link> · <Link href="/guide">guide</Link> · <Link href="/audit">audit</Link> ·{' '}
          <Link href="/privacy">privacy</Link> · <Link href="/terms">terms</Link>
        </p>
      </footer>
    </main>
  );
}
