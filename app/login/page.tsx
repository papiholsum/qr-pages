"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

// Minimal login: a single Google sign-in button. Supabase handles the
// rest — it forwards to Google, Google redirects back to /auth/callback,
// the callback handler exchanges the code for a session cookie.
export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setErr(null);
    const supabase = createSupabaseBrowserClient();
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback?next=/dashboard` },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
    }
    // On success Supabase navigates the window — no need to setBusy(false).
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm space-y-8 rounded-2xl border border-ink-200 bg-white p-8 shadow-sm dark:border-ink-800 dark:bg-ink-900">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-accent grid place-items-center">
            <span className="text-2xl">⌖</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">QR Pages</h1>
          <p className="text-sm text-ink-600 dark:text-ink-400">
            Sign in to manage your hosted pages.
          </p>
        </div>

        <button
          type="button"
          onClick={signIn}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-ink-50 disabled:opacity-60 dark:border-ink-800 dark:bg-ink-800 dark:hover:bg-ink-800/70"
        >
          <GoogleIcon />
          {busy ? "Signing in…" : "Sign in with Google"}
        </button>

        {err && (
          <p className="text-sm text-red-600 text-center">{err}</p>
        )}

        <p className="text-xs text-center text-ink-400">
          By signing in you agree to host content responsibly. Your pages are public — anyone with a link or QR code can view them.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/>
      <path fill="#4285F4" d="M21.2 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4z" opacity="0"/>
    </svg>
  );
}
