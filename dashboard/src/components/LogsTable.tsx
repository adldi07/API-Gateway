"use client";

import { RequestLog } from "@/lib/api";

export default function LogsTable({ rows }: { rows: RequestLog[] }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-100/80 text-left text-slate-700">
          <tr>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Method</th>
            <th className="px-3 py-2">Path</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Latency</th>
            <th className="px-3 py-2">Rate Limited</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log) => (
            <tr className="border-t border-slate-100" key={log.id}>
              <td className="px-3 py-2">{new Date(log.created_at).toLocaleString()}</td>
              <td className="px-3 py-2">{log.method}</td>
              <td className="px-3 py-2">{log.path}</td>
              <td className="px-3 py-2">{log.status_code}</td>
              <td className="px-3 py-2">{log.latency_ms} ms</td>
              <td className="px-3 py-2">{log.rate_limited ? "yes" : "no"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-3 py-8 text-center text-slate-500" colSpan={6}>
                No logs for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
