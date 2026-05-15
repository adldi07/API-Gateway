"use client";

import { UpstreamRoute } from "@/lib/api";

type Props = {
  routes: UpstreamRoute[];
  onDelete: (route: UpstreamRoute) => void;
};

export default function RoutesTable({ routes, onDelete }: Props) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-100/80 text-left text-slate-700">
          <tr>
            <th className="px-4 py-3">Path Prefix</th>
            <th className="px-4 py-3">Target URL</th>
            <th className="px-4 py-3">Strip Prefix</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-mono text-xs font-medium">{row.path_prefix}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.target_url}</td>
              <td className="px-4 py-3">
                <span className={`pill ${row.strip_prefix ? "pill-on" : "pill-off"}`}>
                  {row.strip_prefix ? "yes" : "no"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`pill ${row.is_active ? "pill-on" : "pill-off"}`}>
                  {row.is_active ? "active" : "inactive"}
                </span>
              </td>
              <td className="px-4 py-3">
                <button className="btn-danger" onClick={() => onDelete(row)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {routes.length === 0 && (
            <tr>
              <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                No upstream routes configured yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
