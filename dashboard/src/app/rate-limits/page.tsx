"use client";

import { useEffect, useState } from "react";
import RateLimitForm from "@/components/RateLimitForm";
import { ApiKey, RateLimitConfig, fetchApiKeys, fetchRateLimit, saveRateLimit } from "@/lib/api";

export default function RateLimitsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");
  const [config, setConfig] = useState<RateLimitConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetchApiKeys(1, 100);
      setApiKeys(res.data);
      if (res.data.length > 0) {
        setSelectedApiKeyId(res.data[0].id);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedApiKeyId) return;
    void (async () => {
      const res = await fetchRateLimit(selectedApiKeyId);
      setConfig(res.data);
    })();
  }, [selectedApiKeyId]);

  async function onSave() {
    if (!selectedApiKeyId || !config) return;
    setSaving(true);
    try {
      await saveRateLimit(selectedApiKeyId, config);
      alert("Rate limit configuration saved");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card p-6">Loading configuration...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="card p-4">
        <label className="field">
          <span>Select API key</span>
          <select value={selectedApiKeyId} onChange={(e) => setSelectedApiKeyId(e.target.value)}>
            {apiKeys.map((key) => (
              <option key={key.id} value={key.id}>
                {key.name} ({key.key_value})
              </option>
            ))}
          </select>
        </label>
      </div>

      <RateLimitForm value={config} onChange={setConfig} onSave={() => void onSave()} disabled={saving} />
    </section>
  );
}
