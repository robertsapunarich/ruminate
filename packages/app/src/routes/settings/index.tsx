import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "../../api/client";
import type { User } from "@ruminate/shared";

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
              <span className="text-muted">name:</span> {user.displayName ?? "—"}
            </p>
            <p>
              <span className="text-muted">id:</span> {user.cfAccessId}
            </p>
          </div>
        ) : (
          <p className="text-muted text-xs">loading…</p>
        )}
      </section>

      {/* Import/Export — Phase 3 */}
      <section className="mb-6">
        <h3 className="text-xs font-bold text-muted mb-2">import / export</h3>
        <p className="text-xs text-muted">coming soon — OPML import, bookmark import/export.</p>
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
