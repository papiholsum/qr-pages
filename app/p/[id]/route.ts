// GET /p/[id] — public proxy that serves an uploaded HTML page with proper
// Content-Type and no restrictive CSP.
//
// Why this exists:
//   Supabase Storage's PUBLIC bucket endpoint deliberately serves every
//   object as `text/plain` and slaps a sandboxed CSP on it
//   (`default-src 'none'; sandbox`) to prevent stored-XSS attacks against
//   anyone visiting the URL directly. That's good security, but it means
//   our HTML pages render as source code, not as pages.
//
//   So we proxy: look up the storage path for this page id, fetch the
//   file body server-side from the public bucket (no auth needed for
//   reading public objects), and re-emit it with `text/html`. Browsers
//   render it normally.
//
// Auth model:
//   The lookup uses the service-role key so the route works for anyone
//   visiting the URL (anonymous QR scanners). The service-role client
//   ONLY runs on the server and never crosses to the browser.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force dynamic so we always do a fresh lookup; cache headers below
// still let Vercel's edge cache short-lived copies for performance.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const id          = params.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

  // 2. Fetch the HTML body from the public bucket. The bucket is public,
  // so no Authorization header is needed — the proxy just reads the bytes.
  const fileUrl = `${supabaseUrl}/storage/v1/object/public/pages/${page.storage_path}`;
  const fileRes = await fetch(fileUrl, { cache: "no-store" });

  if (!fileRes.ok) {
    return new NextResponse(
      `Page file unavailable (HTTP ${fileRes.status}).`,
      { status: 502 },
    );
  }

  const html = await fileRes.text();

  // 3. Hand the body back with the right headers so the browser renders it.
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type":  "text/html; charset=utf-8",
      // Short edge cache. Long enough that QR-scan refresh storms don't
      // hammer the lookup, short enough that updates show up quickly.
      "Cache-Control": "public, max-age=60, s-maxage=300",
      // Make sure proxies / CDNs don't downgrade us back to text/plain.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
