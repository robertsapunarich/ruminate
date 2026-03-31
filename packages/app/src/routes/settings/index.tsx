import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { api } from "../../api/client";
import type { User, ImportResult } from "@ruminate/shared";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-sm font-bold mb-3">settings</h2>

      {/* User info */}
      <section className="mb-6">
        <h3 className="text-xs font-bold text-muted mb-2">account</h3>
        {user ? (
          <div className="text-xs space-y-1">
            <p>
              <span className="text-muted">name:</span>{" "}
              {user.displayName ?? "—"}
            </p>
            <p>
              <span className="text-muted">id:</span> {user.cfAccessId}
            </p>
          </div>
        ) : (
          <p className="text-muted text-xs">loading…</p>
        )}
      </section>

      {/* Import / Export */}
      <section className="mb-6">
        <h3 className="text-xs font-bold text-muted mb-2">import / export</h3>
        <div className="space-y-4">
          <OpmlImport />
          <OpmlExport />
        </div>
      </section>

      {/* About */}
      <section>
        <h3 className="text-xs font-bold text-muted mb-2">about</h3>
        <p className="text-xs text-muted">
          ruminate is an open-source RSS reader and bookmark manager.
        </p>
      </section>
    </div>
  );
}

function OpmlImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);
    setError(null);

    try {
      const importResult = await api.importExport.importOpml(file);
      setResult(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="text-xs">
      <p className="mb-1">
        <span className="font-bold">import OPML</span>
        <span className="text-muted"> — import feeds from another reader</span>
      </p>
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".opml,.xml,text/xml,application/xml"
          className="text-xs"
        />
        <button
          onClick={handleImport}
          className="btn"
          disabled={importing}
        >
          {importing ? "importing…" : "import"}
        </button>
      </div>
      {result && (
        <div className="mt-2 border border-border p-2">
          <p>
            imported {result.imported} of {result.total} feeds
            {result.skipped > 0 && (
              <span className="text-muted">
                {" "}({result.skipped} already subscribed)
              </span>
            )}
          </p>
          {result.errors.length > 0 && (
            <details className="mt-1">
              <summary className="text-muted cursor-pointer">
                {result.errors.length} error{result.errors.length > 1 ? "s" : ""}
              </summary>
              <ul className="mt-1 text-muted space-y-0.5">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}

function OpmlExport() {
  return (
    <div className="text-xs">
      <p className="mb-1">
        <span className="font-bold">export OPML</span>
        <span className="text-muted">
          {" "}— download your feeds for another reader
        </span>
      </p>
      <a href={api.importExport.exportOpml()} download className="btn">
        export
      </a>
    </div>
  );
}
