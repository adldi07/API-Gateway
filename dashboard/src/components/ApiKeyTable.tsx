"use client";

import { ApiKey } from "@/lib/api";

type Props = {
  apiKeys: ApiKey[];
  onToggleActive: (apiKey: ApiKey) => void;
  onDelete: (apiKey: ApiKey) => void;
};

export default function ApiKeyTable({ apiKeys, onToggleActive, onDelete }: Props) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-100/80 text-left text-slate-700">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Key</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Algorithm</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {apiKeys.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.key_value}</td>
              <td className="px-4 py-3">
                <span className={`pill ${row.is_active ? "pill-on" : "pill-off"}`}>
                  {row.is_active ? "active" : "revoked"}
                </span>
              </td>
              <td className="px-4 py-3">{row.algorithm ?? "token_bucket"}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => onToggleActive(row)}>
                    {row.is_active ? "Revoke" : "Activate"}
                  </button>
                  <button className="btn-danger" onClick={() => onDelete(row)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {apiKeys.length === 0 && (
            <tr>
              <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                No API keys yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
