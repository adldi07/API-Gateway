"use client";

import { useEffect, useState } from "react";
import RoutesTable from "@/components/RoutesTable";
import { UpstreamRoute, createRoute, deleteRoute, fetchRoutes } from "@/lib/api";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<UpstreamRoute[]>([]);
  const [pathPrefix, setPathPrefix] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [stripPrefix, setStripPrefix] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoutes();
      setRoutes(data.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate() {
    if (!pathPrefix.trim() || !targetUrl.trim()) return;
    setError(null);
    try {
      await createRoute({
        path_prefix: pathPrefix.trim(),
        target_url: targetUrl.trim(),
        strip_prefix: stripPrefix,
      });
      setPathPrefix("");
      setTargetUrl("");
      setStripPrefix(true);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onDelete(route: UpstreamRoute) {
    if (!confirm(`Delete upstream route "${route.path_prefix}" → ${route.target_url}?`)) return;
    await deleteRoute(route.id);
    await load();
  }

  return (
    <section className="space-y-6">
      <div className="card p-5 space-y-4">
        <p className="text-xs uppercase tracking-[0.04em] text-slate-500">Add upstream route</p>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="field">
            <span>Path Prefix</span>
            <input
              value={pathPrefix}
              onChange={(e) => setPathPrefix(e.target.value)}
              placeholder="/api/users"
            />
          </label>

          <label className="field">
            <span>Target URL</span>
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://users-service.example.com"
            />
          </label>

          <label className="field">
            <span>Strip Prefix</span>
            <select value={String(stripPrefix)} onChange={(e) => setStripPrefix(e.target.value === "true")}>
              <option value="true">Yes — remove prefix before forwarding</option>
              <option value="false">No — keep full path</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => void onCreate()}>
            Add Route
          </button>
        </div>
      </div>

      {error && <div className="card p-4 text-red-700">{error}</div>}

      {loading ? (
        <div className="card p-6">Loading routes...</div>
      ) : (
        <RoutesTable routes={routes} onDelete={(r) => void onDelete(r)} />
      )}
    </section>
  );
}
