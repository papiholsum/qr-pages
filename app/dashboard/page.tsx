// Dashboard — list of the signed-in user's pages, newest first.
// RLS guarantees we only ever see our own rows even with a generic SELECT.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Nav } from "@/components/nav";
import { PageCard } from "@/components/page-card";
import { DashboardDropZone } from "@/components/dashboard-dropzone";
import { type Page } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: pages, error } = await supabase
    .from("pages")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <Nav email={userData.user.email} />

      {/* Window-level drag-and-drop overlay. Drops anywhere on the page
          upload to Supabase + refresh the list. */}
      <DashboardDropZone userId={userData.user.id} />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your pages</h1>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
              {pages?.length
                ? `${pages.length} hosted page${pages.length === 1 ? "" : "s"} — drop more anywhere on this page to add.`
                : "Drag an HTML file anywhere on this page, or click Upload."}
            </p>
          </div>
          <Link
            href="/upload"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Upload HTML
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Couldn&apos;t load pages: {error.message}
          </div>
        )}

        {pages && pages.length === 0 && <EmptyState />}

        {pages && pages.length > 0 && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {(pages as Page[]).map((p) => (
              <PageCard key={p.id} page={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center dark:border-ink-800 dark:bg-ink-900">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400">
        <span className="text-2xl">⤴</span>
      </div>
      <h2 className="text-lg font-semibold">No pages yet</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-600 dark:text-ink-400">
        Drag an HTML file anywhere on this page, or click the button below. Each one gets a public URL and a QR code, and shows up here.
      </p>
      <Link
        href="/upload"
        className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Upload your first page
      </Link>
    </div>
  );
}
