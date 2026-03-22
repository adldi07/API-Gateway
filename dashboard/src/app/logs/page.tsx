"use client";

import { useEffect, useState } from "react";
import LogsTable from "@/components/LogsTable";
import { RequestLog, fetchLogs } from "@/lib/api";

export default function LogsPage() {
  const [rows, setRows] = useState<RequestLog[]>([]);
  const [pathFilter, setPathFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetchLogs({
      page: 1,
      limit: 100,
      path: pathFilter || undefined,
      status: statusFilter ? Number(statusFilter) : undefined,
    });
    setRows(res.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="space-y-6">
      <div className="card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="field">
            <span>Path contains</span>
            <input value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} placeholder="/s" />
          </label>

          <label className="field">
            <span>Status code</span>
            <input value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="200" />
          </label>

          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={() => void load()}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {loading ? <div className="card p-6">Loading logs...</div> : <LogsTable rows={rows} />}
    </section>
  );
}
