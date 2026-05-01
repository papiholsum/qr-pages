"use client";

// Dashboard-wide drag-and-drop overlay. Listens for HTML file drops
// anywhere on the dashboard, uploads them straight to Supabase Storage
// using the browser-side client (auth session is already in cookies),
// inserts a row in the pages table, and refreshes the server-rendered
// list so the new card shows up immediately.
//
// Why a client component? The dashboard server component just lists
// pages — drag/drop is a browser-side interaction with multi-step
// progress UI, so it's easier to do everything from the client and
// call router.refresh() at the end.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

interface DashboardDropZoneProps {
  userId: string;
}

type Phase = "idle" | "dragging" | "uploading" | "done" | "error";

export function DashboardDropZone({ userId }: DashboardDropZoneProps) {
  const router = useRouter();

  const [phase,    setPhase]    = useState<Phase>("idle");
  const [message,  setMessage]  = useState<string>("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // We track drag depth so transient leave events from child elements
  // don't prematurely hide the overlay. Increment on enter, decrement
  // on leave; only hide when the count is back to zero.
  const dragDepth = useRef(0);

  const isHtmlFile = (file: File) => {
    const name = file.name.toLowerCase();
    return name.endsWith(".html") || name.endsWith(".htm");
  };

  const uploadOne = useCallback(
    async (file: File) => {
      const supabase = createSupabaseBrowserClient();

      const pageId      = crypto.randomUUID();
      const storagePath = `${userId}/${pageId}.html`;

      const { error: upErr } = await supabase
        .storage
        .from("pages")
        .upload(storagePath, file, {
          contentType: "text/html; charset=utf-8",
          upsert: false,
        });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

      const { data: pub } = supabase.storage.from("pages").getPublicUrl(storagePath);
      const publicUrl = pub.publicUrl;

      const fallbackName = file.name
        .replace(/\.(html?|htm)$/i, "")
        .replace(/[_-]+/g, " ")
        .trim();
      const name = fallbackName || "Untitled";

      const { error: insErr } = await supabase.from("pages").insert({
        id:           pageId,
        user_id:      userId,
        name,
        file_name:    file.name,
        storage_path: storagePath,
        public_url:   publicUrl,
        file_size:    file.size,
        tags:         [],
        notes:        "",
      });
      if (insErr) {
        // Best-effort cleanup so the storage object doesn't orphan.
        await supabase.storage.from("pages").remove([storagePath]);
        throw new Error(`Saving row failed: ${insErr.message}`);
      }
    },
    [userId],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      const htmls = files.filter(isHtmlFile);

      if (htmls.length === 0) {
        setPhase("error");
        setMessage("Only .html / .htm files are accepted.");
        setTimeout(() => setPhase("idle"), 3000);
        return;
      }

      setPhase("uploading");
      setProgress({ done: 0, total: htmls.length });
      setMessage(htmls.length === 1 ? `Uploading ${htmls[0].name}…` : `Uploading ${htmls.length} pages…`);

      let success = 0;
      let firstError: string | null = null;

      for (let i = 0; i < htmls.length; i++) {
        try {
          await uploadOne(htmls[i]);
          success++;
        } catch (err) {
          if (!firstError) firstError = err instanceof Error ? err.message : String(err);
        }
        setProgress({ done: i + 1, total: htmls.length });
      }

      if (success > 0) {
        setPhase("done");
        setMessage(
          success === htmls.length
            ? success === 1
              ? "Uploaded! Adding to your dashboard…"
              : `Uploaded ${success} pages.`
            : `Uploaded ${success} of ${htmls.length}. ${firstError ?? ""}`,
        );
        // Re-render the server component so the new pages appear.
        router.refresh();
      } else {
        setPhase("error");
        setMessage(firstError ?? "Upload failed.");
      }

      setTimeout(() => {
        setPhase("idle");
        setProgress(null);
      }, 2200);
    },
    [router, uploadOne],
  );

  // Window-level drag events — drops anywhere on the page count.
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      // Ignore if not actually dragging files
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      dragDepth.current += 1;
      // Only flip to "dragging" if we're idle — don't interrupt an upload
      setPhase((p) => (p === "idle" ? "dragging" : p));
    };

    const onDragOver = (e: DragEvent) => {
      // Required to make the drop event fire
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
      }
    };

    const onDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) {
        setPhase((p) => (p === "dragging" ? "idle" : p));
      }
    };

    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      dragDepth.current = 0;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        void handleFiles(files);
      } else {
        setPhase("idle");
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover",  onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop",      onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover",  onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop",      onDrop);
    };
  }, [handleFiles]);

  // Nothing to render in idle state — the overlay only appears during
  // drag / upload / status.
  if (phase === "idle") return null;

  const tone =
    phase === "error"
      ? "border-red-400 bg-red-500/10"
      : phase === "done"
        ? "border-green-400 bg-green-500/10"
        : "border-accent bg-accent/10";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${tone} pointer-events-none`}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border-2 border-dashed bg-white p-10 text-center shadow-2xl dark:bg-ink-900 dark:border-ink-800">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400">
          <span className="text-2xl">
            {phase === "dragging"  && "⤴"}
            {phase === "uploading" && "⏳"}
            {phase === "done"      && "✓"}
            {phase === "error"     && "⚠"}
          </span>
        </div>

        <h2 className="text-lg font-semibold">
          {phase === "dragging"  && "Drop your HTML to upload"}
          {phase === "uploading" && "Uploading…"}
          {phase === "done"      && "Done!"}
          {phase === "error"     && "Couldn't upload"}
        </h2>

        {phase === "dragging" && (
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
            .html or .htm — we&apos;ll generate the QR code for you.
          </p>
        )}

        {phase === "uploading" && progress && (
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
            {progress.done} / {progress.total} —{" "}
            <span className="font-mono">{message}</span>
          </p>
        )}

        {(phase === "done" || phase === "error") && (
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{message}</p>
        )}
      </div>
    </div>
  );
}
