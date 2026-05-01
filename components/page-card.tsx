"use client";

// Card representing a single hosted page. Mini QR thumbnail on the left,
// metadata on the right, click anywhere to open the detail page.
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { type Page, formatSize, formatDate } from "@/lib/types";

export function PageCard({ page }: { page: Page }) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(page.public_url, {
      margin: 0,
      width: 96,
      color: { dark: "#0f0f15", light: "#ffffff" },
    })
      .then(setQrSrc)
      .catch(() => setQrSrc(null));
  }, [page.public_url]);

  return (
    <Link
      href={`/pages/${page.id}`}
      className="group flex items-center gap-4 rounded-xl border border-ink-200 bg-white p-3 transition hover:border-accent hover:shadow-sm dark:border-ink-800 dark:bg-ink-900 dark:hover:border-accent"
    >
      <div className="h-16 w-16 shrink-0 rounded-md border border-ink-200 bg-white p-1 dark:border-ink-800">
        {qrSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSrc} alt="QR" className="h-full w-full" />
        ) : (
          <div className="h-full w-full rounded-sm bg-ink-100 dark:bg-ink-800" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{page.name}</div>
        <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-ink-600 dark:text-ink-400">
          <span className="truncate">{page.file_name}</span>
          <span aria-hidden>•</span>
          <span>{formatSize(page.file_size)}</span>
          <span aria-hidden>•</span>
          <span>{formatDate(page.created_at)}</span>
        </div>
        {page.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {page.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="text-ink-400 group-hover:text-accent">→</div>
    </Link>
  );
}
