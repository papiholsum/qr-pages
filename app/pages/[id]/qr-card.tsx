"use client";

// Client component for the big QR + URL display + copy button.
// Generated client-side so we can render it at high res for download.
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCard({ url, name }: { url: string; name: string }) {
  const [src, setSrc]         = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      color: { dark: "#0f0f15", light: "#ffffff" },
    })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked in some browsers; ignore */
    }
  }

  function downloadQR() {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `qr-${name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
      <div className="mx-auto h-72 w-72 rounded-xl bg-white p-3 shadow-inner">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="QR" className="h-full w-full" />
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-ink-100" />
        )}
      </div>

      <p className="mt-3 text-center text-xs text-ink-600 dark:text-ink-400">
        Scan with any phone — opens the live page.
      </p>

      <div className="mt-5 space-y-2">
        <div className="rounded-md bg-ink-50 px-3 py-2 font-mono text-xs break-all dark:bg-ink-800">
          {url}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copy}
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:hover:bg-ink-800"
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-white hover:bg-accent-hover"
          >
            Open ↗
          </a>
        </div>

        <button
          type="button"
          onClick={downloadQR}
          disabled={!src}
          className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 disabled:opacity-50 dark:border-ink-800 dark:bg-ink-900 dark:hover:bg-ink-800"
        >
          Download QR (PNG)
        </button>
      </div>
    </div>
  );
}
