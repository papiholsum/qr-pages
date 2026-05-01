// Top nav for authenticated pages. Logo + user email + Upload + Sign out.
import Link from "next/link";

interface NavProps {
  email?: string | null;
}

export function Nav({ email }: NavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-900/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">⌖</span>
          QR Pages
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            <span className="text-base leading-none">+</span>
            Upload
          </Link>

          {email && (
            <span className="hidden sm:inline text-xs text-ink-600 dark:text-ink-400">
              {email}
            </span>
          )}

          <form action="/api/sign-out" method="POST">
            <button
              type="submit"
              className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:hover:bg-ink-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
