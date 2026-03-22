"use client";

import { useEffect, useState } from "react";
import ApiKeyTable from "@/components/ApiKeyTable";
import { ApiKey, createApiKey, deleteApiKey, fetchApiKeys, updateApiKey } from "@/lib/api";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApiKeys(1, 50);
      setApiKeys(data.data);
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
    if (!name.trim()) return;
    await createApiKey(name.trim());
    setName("");
    await load();
  }

  async function onToggleActive(apiKey: ApiKey) {
    await updateApiKey(apiKey.id, { is_active: !apiKey.is_active });
    await load();
  }

  async function onDelete(apiKey: ApiKey) {
    if (!confirm(`Delete API key \"${apiKey.name}\"?`)) return;
    await deleteApiKey(apiKey.id);
    await load();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="field">
            <span>New API key label</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production mobile app"
            />
          </label>
        </div>
        <button className="btn-primary" onClick={() => void onCreate()}>
          Create Key
        </button>
      </div>

      {error && <div className="card p-4 text-red-700">{error}</div>}
      {loading ? (
        <div className="card p-6">Loading API keys...</div>
      ) : (
        <ApiKeyTable apiKeys={apiKeys} onToggleActive={(k) => void onToggleActive(k)} onDelete={(k) => void onDelete(k)} />
      )}
    </section>
  );
}
