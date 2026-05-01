// Server actions for the page detail view.
//   deletePage(id)         → remove storage object + DB row, redirect to dashboard
//   updatePageMeta(id, …)  → save name / tags / notes edits
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function deletePageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Look up the row first so we know the storage path. RLS makes this
  // safe — the user can only see their own row.
  const { data: page, error } = await supabase
    .from("pages")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (error || !page) {
    return; // already gone
  }

  // Storage delete first; if it fails we keep the row so the user can retry.
  const { error: rmErr } = await supabase
    .storage
    .from("pages")
    .remove([page.storage_path]);
  if (rmErr) {
    // Keep the row — surface error via a redirect query param.
    redirect(`/pages/${id}?error=${encodeURIComponent(rmErr.message)}`);
  }

  const { error: delErr } = await supabase.from("pages").delete().eq("id", id);
  if (delErr) {
    redirect(`/pages/${id}?error=${encodeURIComponent(delErr.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updatePageMetaAction(formData: FormData) {
  const id     = String(formData.get("id")    ?? "");
  const name   = String(formData.get("name")  ?? "").trim();
  const tags   = String(formData.get("tags")  ?? "")
                    .split(",")
                    .map((t) => t.trim().toLowerCase())
                    .filter(Boolean);
  const notes  = String(formData.get("notes") ?? "").trim();

  if (!id) return;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("pages")
    .update({ name: name || "Untitled", tags, notes })
    .eq("id", id);
  if (error) {
    redirect(`/pages/${id}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/pages/${id}`);
  revalidatePath("/dashboard");
}
