// Upload page — gates with auth then renders the client form.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Nav } from "@/components/nav";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <div>
      <Nav email={data.user.email} />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-ink-600 hover:text-accent dark:text-ink-400"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Upload a page</h1>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
            HTML file goes to Supabase Storage. Public URL + QR code are generated immediately.
          </p>
        </div>

        <UploadForm />
      </main>
    </div>
  );
}
