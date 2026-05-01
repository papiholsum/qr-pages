// Page detail. Two-column layout on wide screens: QR card on the left,
// editable metadata on the right. Delete button at the bottom.
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Nav } from "@/components/nav";
import { type Page, formatSize, formatDate } from "@/lib/types";
import { QrCard } from "./qr-card";
import { deletePageAction, updatePageMetaAction } from "./actions";

interface RouteProps {
  params: { id: string };
  searchParams: { error?: string };
}

export default async function PageDetail({ params, searchParams }: RouteProps) {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: page, error } = await supabase
    .from("pages")
    .select("*")
    .eq("id", params.id)
    .single<Page>();

  if (error || !page) notFound();

  return (
    <div>
      <Nav email={userData.user.email} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="text-sm text-ink-600 hover:text-accent dark:text-ink-400"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">
              {page.name}
            </h1>
            <p className="mt-1 truncate text-sm text-ink-600 dark:text-ink-400">
              {page.file_name} · {formatSize(page.file_size)} · uploaded{" "}
              {formatDate(page.created_at)}
            </p>
          </div>
        </div>

        {searchParams?.error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {decodeURIComponent(searchParams.error)}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,1.2fr]">
          <QrCard url={page.public_url} name={page.name} />

          <div className="space-y-5">
            {/* Edit metadata */}
            <form
              action={updatePageMetaAction}
              className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400">
                Edit details
              </h2>
              <input type="hidden" name="id" value={page.id} />

              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={page.name}
                  className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-ink-800 dark:bg-ink-900"
                />
              </div>

              <div>
                <label htmlFor="tags" className="mb-1 block text-sm font-medium">
                  Tags <span className="text-ink-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  defaultValue={page.tags.join(", ")}
                  className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-ink-800 dark:bg-ink-900"
                />
              </div>

              <div>
                <label htmlFor="notes" className="mb-1 block text-sm font-medium">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={page.notes}
                  className="w-full resize-y rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-ink-800 dark:bg-ink-900"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Save changes
              </button>
            </form>

            {/* File details */}
            <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400">
                File details
              </h2>
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
                <Detail label="Filename" value={page.file_name} />
                <Detail label="Size"     value={formatSize(page.file_size)} />
                <Detail label="Uploaded" value={formatDate(page.created_at)} />
                <Detail label="Updated"  value={formatDate(page.updated_at)} />
                <Detail label="Storage"  value={page.storage_path} mono />
              </dl>
            </div>

            {/* Delete */}
            <form
              action={deletePageAction}
              className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/50"
            >
              <input type="hidden" name="id" value={page.id} />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
                Delete page
              </h2>
              <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                Removes the file from Supabase Storage and this row from the
                database. The QR code URL stops working.
              </p>
              <button
                type="submit"
                className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
              >
                Delete this page
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-ink-600 dark:text-ink-400">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : "break-words"}>{value}</dd>
    </>
  );
}
