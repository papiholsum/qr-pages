// GET /p/[id] — public proxy that serves an uploaded HTML page with proper
// Content-Type, no restrictive CSP, and a small live-sync script appended
// so checkbox state stays in sync across every device viewing the URL.
//
// Why this exists:
//   1. Supabase Storage's PUBLIC bucket endpoint deliberately serves every
//      object as `text/plain` and slaps a sandboxed CSP on it. We re-emit
//      with `text/html` so the browser actually renders the page.
//   2. Static HTML keeps checkbox state in localStorage by default — phone
//      and computer never sync. We inject a script that reads/writes a
//      shared `page_state` table (anon RLS) and listens to Supabase
//      Realtime for changes, so any toggle anywhere shows up everywhere.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const id          = params.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return new NextResponse(
      "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set.",
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Resolve the page id → storage path.
  const { data: page, error: lookupErr } = await admin
    .from("pages")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (lookupErr || !page) {
    return new NextResponse("Page not found.", { status: 404 });
  }

  // 2. Fetch the HTML body from the public bucket.
  const fileUrl = `${supabaseUrl}/storage/v1/object/public/pages/${page.storage_path}`;
  const fileRes = await fetch(fileUrl, { cache: "no-store" });

  if (!fileRes.ok) {
    return new NextResponse(
      `Page file unavailable (HTTP ${fileRes.status}).`,
      { status: 502 },
    );
  }

  const html = await fileRes.text();

  // 3. Inject the sync script just before </body> (or append to end if
  //    the user's HTML happens to omit a </body> tag).
  const sync = buildSyncScript({ pageId: id, supabaseUrl, anonKey });
  const withSync = injectBeforeBodyEnd(html, sync);

  return new NextResponse(withSync, {
    status: 200,
    headers: {
      "Content-Type":           "text/html; charset=utf-8",
      "Cache-Control":          "public, max-age=60, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function injectBeforeBodyEnd(html: string, snippet: string): string {
  // Case-insensitive </body> match; fall back to appending if missing.
  const idx = html.toLowerCase().lastIndexOf("</body>");
  if (idx === -1) return html + snippet;
  return html.slice(0, idx) + snippet + html.slice(idx);
}

interface SyncOpts {
  pageId:      string;
  supabaseUrl: string;
  anonKey:     string;
}

/**
 * The script that runs INSIDE every served page.
 *
 * Identifies checkboxes by their position in document order (the user
 * picked "Position in document" — robust for stable HTML, shifts if the
 * uploaded file's checkbox order changes between uploads).
 *
 * Anti-feedback: when applying state from the server we set a guard
 * flag so our own change-listener doesn't write the same value back to
 * the DB and re-trigger another broadcast.
 *
 * Native `change` + `input` events are dispatched after applying state
 * so any progress-bar / counter logic in the user's own HTML reruns.
 */
function buildSyncScript(opts: SyncOpts): string {
  // Constants are JSON-stringified safely so quotes / specials in the
  // env vars can't break out of the script string.
  const PAGE_ID_JSON = JSON.stringify(opts.pageId);
  const URL_JSON     = JSON.stringify(opts.supabaseUrl);
  const KEY_JSON     = JSON.stringify(opts.anonKey);

  return `
<!-- ===== QR Pages: live-sync (auto-injected) ===== -->
<script>
(function () {
  var PAGE_ID = ${PAGE_ID_JSON};
  var SB_URL  = ${URL_JSON};
  var SB_KEY  = ${KEY_JSON};

  // Avoid double-init if someone re-runs the script.
  if (window.__qrPagesSyncStarted) return;
  window.__qrPagesSyncStarted = true;

  function loadSDK(cb) {
    if (window.supabase && window.supabase.createClient) return cb();
    // Try jsdelivr first (more reliable CORS); fall back to unpkg.
    var sources = [
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
      'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
    ];
    function tryNext(i) {
      if (i >= sources.length) {
        console.warn('[qr-pages] Failed to load supabase-js from any CDN; live sync disabled.');
        return;
      }
      var s = document.createElement('script');
      s.src     = sources[i];
      s.async   = true;
      s.onload  = function () {
        if (window.supabase && window.supabase.createClient) cb();
        else tryNext(i + 1);
      };
      s.onerror = function () { tryNext(i + 1); };
      document.head.appendChild(s);
    }
    tryNext(0);
  }

  function start() {
    var client = window.supabase.createClient(SB_URL, SB_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });

    var checkboxes = Array.prototype.slice.call(
      document.querySelectorAll('input[type="checkbox"]')
    );
    if (checkboxes.length === 0) return;

    // Guard so realtime-applied changes don't re-write to the DB and loop.
    var applying = false;

    function fire(el) {
      // Trigger any progress / counter listeners the user's own JS attached.
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input',  { bubbles: true }));
    }

    function applyState(idx, checked) {
      var el = checkboxes[idx];
      if (!el || el.checked === checked) return;
      applying = true;
      el.checked = checked;
      fire(el);
      applying = false;
    }

    // 1. Initial fetch — paint the page with whatever state already exists.
    client
      .from('page_state')
      .select('item_index, checked')
      .eq('page_id', PAGE_ID)
      .then(function (res) {
        if (res.error) {
          console.warn('[qr-pages] state fetch failed', res.error);
          return;
        }
        (res.data || []).forEach(function (row) {
          applyState(row.item_index, row.checked);
        });
      });

    // 2. On any local toggle, upsert to the DB.
    checkboxes.forEach(function (cb, i) {
      cb.addEventListener('change', function () {
        if (applying) return;
        client
          .from('page_state')
          .upsert(
            {
              page_id:    PAGE_ID,
              item_index: i,
              checked:    cb.checked,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'page_id,item_index' }
          )
          .then(function (res) {
            if (res.error) {
              console.warn('[qr-pages] state write failed', res.error);
            }
          });
      });
    });

    // 3. Subscribe to live updates from other devices/people.
    client
      .channel('qr-page-' + PAGE_ID)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'page_state',
          filter: 'page_id=eq.' + PAGE_ID,
        },
        function (payload) {
          var row = payload.new || payload.old;
          if (!row) return;
          if (typeof row.item_index !== 'number') return;
          var checked = payload.eventType === 'DELETE' ? false : !!row.checked;
          applyState(row.item_index, checked);
        }
      )
      .subscribe();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadSDK(start);
  } else {
    document.addEventListener('DOMContentLoaded', function () { loadSDK(start); });
  }
})();
</script>
<!-- ===== /QR Pages: live-sync ===== -->
`;
}
