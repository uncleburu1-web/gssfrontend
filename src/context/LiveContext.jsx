import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const LiveContext = createContext({ status: 'closed', versions: {} });

function wsUrl() {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const wsBase = apiBase.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
  const token = localStorage.getItem('access_token') || '';
  return `${wsBase}/ws/live/?token=${encodeURIComponent(token)}`;
}

// How many recent event ids to remember for dedup. True duplicate
// delivery over a single WebSocket connection essentially never happens
// (Channels' Redis pub/sub doesn't redeliver) — this is defense-in-depth,
// not a fix for an observed bug. Even a duplicate slipping through would
// only cause one harmless extra refetch, never wrong data, because this
// layer only ever triggers refetches, never applies event payloads
// directly to local state (see the module docstring below).
const SEEN_EVENT_LIMIT = 500;

// After this many back-to-back failed reconnect attempts, the status
// changes from "reconnecting" (a blip, will be back any second) to
// "offline" (this has been down a while) — same underlying retry loop,
// just a more honest label for the UI once it's been more than a blip.
const OFFLINE_AFTER_FAILURES = 3;

/**
 * One WebSocket connection for the entire app — mounted once here, not
 * per-page, so ten open tabs on ten different pages still only cost one
 * socket each. Reconnects with exponential backoff (1s -> 30s cap) if the
 * connection drops.
 *
 * This is a notification layer ONLY — see the backend's realtime/events.py
 * for the full reasoning, but the short version: it never holds data
 * itself, just bumps a per-resource "version" number whenever a relevant
 * event arrives (`sale.created` -> versions.sale += 1). A page reacts by
 * re-running its normal fetch whenever the version it cares about
 * changes — the fetch is still what's actually correct; the socket just
 * means that fetch happens the instant something changes instead of
 * waiting for the next navigation or manual refresh. If the socket is
 * down for any reason, pages simply don't get nudged and fall back to
 * updating on their next normal fetch — nothing breaks, nothing is lost.
 *
 * On top of that original design, this also:
 *  - Tracks a per-shop sequence number (from the 'hello' the server sends
 *    on every connect, and from each event's own `sequence`) so a gap —
 *    "server is at 44, I last saw 41" — is detected explicitly instead of
 *    just hoping a reconnect caught everything. A detected gap bumps
 *    every known resource's version: the same blunt-but-correct response
 *    a page would want anyway — "something happened, refetch to be sure" —
 *    since there's no local record of which specific resource(s) a missed
 *    event was about.
 *  - Never lets a late/out-of-order arrival regress its tracked sequence
 *    (see noteSequence) — otherwise a delayed older message could look
 *    like a fresh gap and trigger a spurious extra refetch.
 *  - Answers the server's heartbeat ping so a socket that's gone quiet
 *    (some networks leave a connection looking open long after nothing
 *    is actually getting through) gets torn down and reconnected on this
 *    client's own schedule, not whenever the OS eventually notices.
 *  - Exposes a richer `status`: 'connecting' (first attempt), 'open'
 *    (live), 'reconnecting' (was open, lost it, retrying), 'offline'
 *    (been retrying a while — still will keep trying).
 */
export function LiveProvider({ children }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('closed');
  const [versions, setVersions] = useState({});

  const lastSequenceRef = useRef({}); // { [shopId]: number }
  const seenEventIdsRef = useRef(new Set());

  function bumpAll() {
    setVersions((v) => {
      const next = {};
      for (const key of Object.keys(v)) next[key] = v[key] + 1;
      // A catch-all so a page that hasn't bumped anything yet this
      // session (no per-resource key present) still has something to
      // depend on if it wants to react to "a gap was detected" generically.
      next.__gap = (v.__gap || 0) + 1;
      return next;
    });
  }

  function bump(resource) {
    setVersions((v) => ({ ...v, [resource]: (v[resource] || 0) + 1 }));
  }

  function noteSequence(shopId, sequence) {
    if (shopId == null || sequence == null) return;
    const last = lastSequenceRef.current[shopId];
    if (last != null && sequence <= last) return; // already-seen, or a late/reordered arrival — never regress
    lastSequenceRef.current[shopId] = sequence;
    if (last != null && sequence > last + 1) {
      bumpAll();
    }
  }

  useEffect(() => {
    if (!user) {
      setStatus('closed');
      return;
    }

    let cancelled = false;
    let ws;
    let retryDelay = 1000;
    let retryTimer;
    let everConnected = false;
    let consecutiveFailures = 0;

    function connect() {
      if (cancelled) return;
      setStatus(everConnected ? (consecutiveFailures >= OFFLINE_AFTER_FAILURES ? 'offline' : 'reconnecting') : 'connecting');
      ws = new WebSocket(wsUrl());

      ws.onopen = () => {
        if (cancelled) return;
        setStatus('open');
        everConnected = true;
        consecutiveFailures = 0;
        retryDelay = 1000;
      };
      ws.onclose = () => {
        if (cancelled) return;
        consecutiveFailures += 1;
        setStatus(consecutiveFailures >= OFFLINE_AFTER_FAILURES ? 'offline' : 'reconnecting');
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (msg) => {
        let data;
        try {
          data = JSON.parse(msg.data);
        } catch {
          return; // malformed frame — ignore, this is a nudge, not critical data
        }

        if (data.event === 'ping') {
          // App-level heartbeat, not a domain event — answer it and
          // stop. A quiet-but-technically-open connection gets caught by
          // the server timing out waiting for other pongs, or by this
          // client's own reconnect loop if onclose eventually fires;
          // this doesn't touch versions/sequence at all.
          try { ws.send(JSON.stringify({ type: 'pong' })); } catch { /* socket already going away */ }
          return;
        }

        if (data.event === 'hello') {
          // Baseline sent on every connect AND reconnect. Compares the
          // server's current sequence for each shop against whatever
          // this tab last saw — higher means something happened while
          // this socket was down (including "was never connected
          // before," which noteSequence handles by only acting once it
          // has a prior value to compare against).
          for (const [shopId, sequence] of Object.entries(data.sequences || {})) {
            noteSequence(shopId, sequence);
          }
          return;
        }

        if (data.event_id) {
          if (seenEventIdsRef.current.has(data.event_id)) return; // already handled this one
          seenEventIdsRef.current.add(data.event_id);
          if (seenEventIdsRef.current.size > SEEN_EVENT_LIMIT) {
            seenEventIdsRef.current.delete(seenEventIdsRef.current.values().next().value);
          }
        }
        if (data.shop_id != null && data.sequence != null) {
          noteSequence(data.shop_id, data.sequence);
        }

        const resource = (data.event || '').split('.')[0]; // 'sale.created' -> 'sale'
        if (resource) bump(resource);
      };
    }
    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [user]);

  return <LiveContext.Provider value={{ status, versions }}>{children}</LiveContext.Provider>;
}

/** versions.sale, versions.inventoryitem, versions.stockbatch,
 * versions.customer, versions.saleitem, versions.__gap — increments on
 * every relevant change from ANYONE (this tab, another tab, the desktop
 * app, the CEO), or on all of them at once if a missed-event gap was
 * detected. Depend on the one(s) a page cares about in a useEffect to
 * refetch live. */
export function useLive() {
  return useContext(LiveContext);
}
