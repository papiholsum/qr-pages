"use client";

// Client form that wraps the uploadPage server action. We use useFormState
// for surfacing the action's error message inline, and a manual file picker
// + drag-drop area for nicer UX than a bare <input type=file>.
import { useFormState, useFormStatus } from "react-dom";
import { useRef, useState } from "react";
import { uploadPage, type UploadState } from "./actions";

export function UploadForm() {
  const [state, action] = useFormState<UploadState, FormData>(uploadPage, undefined);
  const [file, setFile]   = useState<File | null>(null);
  const [drag, setDrag]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
  }

  return (
    <form action={action} className="space-y-5">
      {/* Drop zone */}
      <label
        htmlFor="file"
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          pickFile(f);
          if (f && inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(f);
            inputRef.current.files = dt.files;
          }
        }}
        className={[
          "block cursor-pointer rounded-2xl border-2 border-dashed bg-white p-10 text-center transition dark:bg-ink-900",
          drag
            ? "border-accent bg-accent/5"
            : "border-ink-200 hover:border-accent dark:border-ink-800",
        ].join(" ")}
      >
        <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400">
          <span className="text-xl">⤴</span>
        </div>
        <div className="font-medium">
          {file ? file.name : "Drop an HTML file here"}
        </div>
        <div className="mt-1 text-xs text-ink-600 dark:text-ink-400">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB · click to change`
            : "or click to choose · .html / .htm · max 10 MB"}
        </div>
        <input
          ref={inputRef}
          id="file"
          name="file"
          type="file"
          accept=".html,.htm,text/html"
          required
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </label>

      {/* Name */}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Name <span className="text-ink-400 font-normal">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Defaults to the filename"
          className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-ink-800 dark:bg-ink-900"
        />
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="mb-1 block text-sm font-medium">
          Tags <span className="text-ink-400 font-normal">(comma-separated, optional)</span>
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="shot-list, recipe, docs"
          className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-ink-800 dark:bg-ink-900"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          Notes <span className="text-ink-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Free-form notes — only visible to you."
          className="w-full resize-y rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-ink-800 dark:bg-ink-900"
        />
      </div>

      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton hasFile={!!file} />
    </form>
  );
}

function SubmitButton({ hasFile }: { hasFile: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!hasFile || pending}
      className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? "Uploading…" : "Upload page"}
    </button>
  );
}
