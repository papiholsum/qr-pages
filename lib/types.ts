// Shared types for the database `pages` table.

export interface Page {
  id: string;
  user_id: string;
  name: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  file_size: number;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Pretty-print byte size — same logic as the Mac app's formattedSize. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Friendly date for display on cards / detail. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
