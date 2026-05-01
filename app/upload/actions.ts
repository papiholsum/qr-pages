// Server action that handles the HTML upload:
//   1. Read the file from FormData
//   2. PUT into Supabase Storage at {user_id}/{page_id}.html
//   3. INSERT a row into public.pages with the public URL
//   4. Redirect to the new page's detail view
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type UploadState = { error?: string } | undefined;

export async function uploadPage(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in." };

  const file     = formData.get("file") as File | null;
  const nameRaw  = (formData.get("name")  as string | null) ?? "";
  const tagsRaw  = (formData.get("tags")  as string | null) ?? "";
  const notesRaw = (formData.get("notes") as string | null) ?? "";

  if (!file || file.size === 0) {
    return { error: "Pick an HTML file to upload." };
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "html" && ext !== "htm") {
    return { error: "Only .html / .htm files are accepted." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "Max 10 MB per page (Supabase Storage default)." };
  }

  // Generate a fresh page id and a storage path scoped to this user's folder.
  // The folder = user.id is required by the Storage RLS policy.
  const pageId      = crypto.randomUUID();
  const storagePath = `${userData.user.id}/${pageId}.html`;

  // Upload — content type explicit so the file renders as HTML when fetched.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase
    .storage
    .from("pages")
    .upload(storagePath, bytes, {
      contentType: "text/html; charset=utf-8",
      upsert: false,
    });
  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  // Public URL — bucket is public so this works without a signed URL.
  const { data: pub } = supabase.storage.from("pages").getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;

  // Pretty-default the display name from the filename if the user left
  // the name field blank.
  const fallbackName = file.name
    .replace(/\.(html?|htm)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  const name = nameRaw.trim() || fallbackName || "Untitled";

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const { error: insErr } = await supabase.from("pages").insert({
    id:           pageId,
    user_id:      userData.user.id,
    name,
    file_name:    file.name,
    storage_path: storagePath,
    public_url:   publicUrl,
    file_size:    file.size,
    tags,
    notes:        notesRaw.trim(),
  });
  if (insErr) {
    // Best-effort cleanup so we don't leave an orphaned object on Storage.
    await supabase.storage.from("pages").remove([storagePath]);
    return { error: `Couldn't save page: ${insErr.message}` };
  }

  revalidatePath("/dashboard");
  redirect(`/pages/${pageId}`);
}
