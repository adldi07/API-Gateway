"use client";

import { useMemo } from "react";
import { Activity, Database, Gauge, Radio } from "lucide-react";
import LiveChart from "@/components/LiveChart";
import { useSSE } from "@/hooks/useSSE";
import { fetchSummary } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Home() {
  const { connected, requestEvents } = useSSE();
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<{
    totalRequests: number;
    avgLatency: number;
    errorRate: number;
    topPaths: Array<{ path: string; count: number }>;
  } | null>(null);

  useEffect(() => {
    void fetchSummary().then(setSummary).catch(() => setSummary(null));
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const item of requestEvents.slice(-30)) {
      const key = new Date(item.timestamp).toLocaleTimeString();
      bucket.set(key, (bucket.get(key) || 0) + 1);
    }
    return Array.from(bucket.entries()).map(([time, requests]) => ({ time, requests }));
  }, [requestEvents]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="stat-label"><Activity size={14} /> Total Requests</p>
          <p className="stat-value">{summary?.totalRequests ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="stat-label"><Gauge size={14} /> Avg Latency</p>
          <p className="stat-value">{Math.round(summary?.avgLatency ?? 0)} ms</p>
        </div>
        <div className="card p-4">
          <p className="stat-label"><Database size={14} /> Error Rate</p>
          <p className="stat-value">{Math.round((summary?.errorRate ?? 0) * 100)}%</p>
        </div>
        <div className="card p-4">
          <p className="stat-label"><Radio size={14} /> Stream</p>
          <p className={`stat-value ${connected ? "text-teal-700" : "text-amber-700"}`}>
            {connected ? "connected" : "disconnected"}
          </p>
        </div>
      </div>

      {mounted ? <LiveChart data={chartData} /> : <div className="card h-80 p-4">Loading chart...</div>}

      <div className="card p-5">
        <h3 className="mb-4 text-lg font-semibold">Top Paths (24h)</h3>
        <div className="space-y-2">
          {(summary?.topPaths || []).map((item) => (
            <div key={`${item.path}-${item.count}`} className="flex items-center justify-between text-sm">
              <span className="font-mono">{item.path}</span>
              <span className="pill pill-on">{item.count}</span>
            </div>
          ))}
          {(summary?.topPaths?.length || 0) === 0 && <p className="text-slate-500">No traffic captured yet.</p>}
        </div>
      </div>
    </section>
  );
}
