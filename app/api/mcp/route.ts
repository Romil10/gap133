import { NextRequest, NextResponse } from 'next/server';
import { deskKeyValid } from '../../../lib/access';
import { getTieredSnapshot } from '../../../lib/snapshot';
import { deskData } from '../../../lib/deskdata';

// gap133 MCP server — streamable HTTP transport (JSON-RPC 2.0).
// Lets AI agents (Claude, GPT, any MCP client) query the board directly:
//   tools: list_pairs, get_pair, biggest_gaps, net_positive
// Auth: the desk key rides on Connect/CallSession via the X-API-Key header
// (configured in the MCP client's headers block) or ?key= on the endpoint URL.
// No scanner in the field offers this; PredRadar's MCP is Pro-gated at $30/mo.

export const dynamic = 'force-dynamic';

interface JsonRpcReq {
  jsonrpc?: string;
  id?: number | string;
  method: string;
  params?: any;
}

async function handleTool(name: string, args: any): Promise<any> {
  const snap = await getTieredSnapshot(true); // MCP is desk-only, full board
  const fmt = (p: any) => deskData.pairJson(p);

  switch (name) {
    case 'list_pairs': {
      const limit = Math.min(parseInt(args?.limit ?? '25', 10) || 25, 250);
      return {
        fetchedAt: snap.fetchedAt,
        scanned: { pm: snap.pmCount, kx: snap.kxCount },
        count: snap.pairs.length,
        pairs: snap.pairs.slice(0, limit).map(fmt),
      };
    }
    case 'get_pair': {
      const t = String(args?.ticker ?? '').toLowerCase();
      const p = snap.pairs.find((x) => x.kx.ticker.toLowerCase() === t);
      if (!p) throw new Error(`no matched pair for Kalshi ticker ${t}`);
      return fmt(p);
    }
    case 'biggest_gaps': {
      const top = [...snap.pairs]
        .filter((p) => !p.needsReview && !p.stale)
        .sort((a, b) => (b.gapCents ?? 0) - (a.gapCents ?? 0))
        .slice(0, parseInt(args?.limit ?? '5', 10) || 5);
      return top.map(fmt);
    }
    case 'net_positive': {
      const pos = snap.pairs.filter((p) => p.netPositive && !p.needsReview && !p.stale);
      return {
        count: pos.length,
        note: 'net-positive = raw gap clears both venues taker fees at traded prices',
        pairs: pos.slice(0, parseInt(args?.limit ?? '10', 10) || 10).map(fmt),
      };
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function toolDefs() {
  const pairShape = {
    kx: 'Kalshi leg (ticker, yesBid, bid/ask sizes, deep link)',
    second: 'other venue leg (polymarket; question, yes price, deep link)',
    gap: '{ rawCents, netCents (fee-adjusted), netPositive, buyVenue, execSizeUsd (cross-venue top-of-book min-leg) }',
    gates: '{ matchScore, jevProbability, needsReview, dismissed, lastPrint per venue }',
  };
  return [
    {
      name: 'list_pairs',
      description: 'List gap133 matched prediction-market pairs (Kalshi vs Polymarket) with raw gap, fee-adjusted net gap, executability and verification gates.',
      inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'max pairs (default 25, max 250)' } } },
    },
    {
      name: 'get_pair',
      description: 'Get one matched pair by Kalshi ticker.',
      inputSchema: { type: 'object', properties: { ticker: { type: 'string', description: 'Kalshi market ticker, e.g. KXPRESNOMD-28-AOC' } }, required: ['ticker'] },
    },
    {
      name: 'biggest_gaps',
      description: 'The widest verified gaps right now (confident matches, both venues live).',
      inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'default 5' } } },
    },
    {
      name: 'net_positive',
      description: 'Pairs whose raw gap clears both venues taker fees (net +), verified and live only.',
      inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'default 10' } } },
    },
  ].map((t) => ({ ...t, pairShapeNote: pairShape }));
}

export async function POST(req: NextRequest) {
  // auth: header or ?key=
  const key = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  const body: JsonRpcReq = await req.json().catch(() => null);
  if (!body?.method) return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'not a JSON-RPC request' } }, { status: 400 });

  // initialize and tools/list are open (discovery); tools/call requires the key
  if (body.method === 'initialize') {
    return NextResponse.json({
      jsonrpc: '2.0', id: body.id,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'gap133', version: '1.0.0' },
      },
    });
  }

  if (body.method === 'tools/list') {
    return NextResponse.json({ jsonrpc: '2.0', id: body.id, result: { tools: toolDefs() } });
  }

  if (body.method === 'tools/call') {
    if (!deskKeyValid(key)) {
      return NextResponse.json({ jsonrpc: '2.0', id: body.id, error: { code: -32001, message: 'desk key required (X-API-Key header). See /api-docs' } }, { status: 401 });
    }
    try {
      const result = await handleTool(body.params?.name, body.params?.arguments);
      return NextResponse.json({
        jsonrpc: '2.0', id: body.id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      });
    } catch (e: any) {
      return NextResponse.json({ jsonrpc: '2.0', id: body.id, error: { code: -32000, message: e?.message ?? 'tool error' } });
    }
  }

  return NextResponse.json({ jsonrpc: '2.0', id: body.id ?? null, error: { code: -32601, message: `method not found: ${body.method}` } }, { status: 404 });
}

export async function GET() {
  return NextResponse.json({
    server: 'gap133 MCP',
    transport: 'streamable-http (POST JSON-RPC 2.0)',
    auth: 'desk key via X-API-Key header (tools/call only; discovery is open)',
    tools: ['list_pairs', 'get_pair', 'biggest_gaps', 'net_positive'],
    docs: '/api-docs',
  });
}
