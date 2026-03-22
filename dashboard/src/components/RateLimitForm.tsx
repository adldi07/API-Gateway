"use client";

import { RateLimitConfig } from "@/lib/api";

type Props = {
  value: RateLimitConfig | null;
  onChange: (next: RateLimitConfig) => void;
  onSave: () => void;
  disabled?: boolean;
};

export default function RateLimitForm({ value, onChange, onSave, disabled }: Props) {
  if (!value) {
    return <div className="card p-6 text-slate-500">Select an API key to edit its rate limits.</div>;
  }

  const set = <K extends keyof RateLimitConfig>(key: K, val: RateLimitConfig[K]) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-lg font-semibold">Rate Limit Configuration</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="field">
          <span>Algorithm</span>
          <select
            value={value.algorithm}
            onChange={(e) => set("algorithm", e.target.value as RateLimitConfig["algorithm"])}
          >
            <option value="token_bucket">token_bucket</option>
            <option value="sliding_window">sliding_window</option>
          </select>
        </label>

        <label className="field">
          <span>Bucket Capacity</span>
          <input
            type="number"
            value={value.bucket_capacity}
            onChange={(e) => set("bucket_capacity", Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span>Refill Rate</span>
          <input
            type="number"
            value={value.refill_rate}
            onChange={(e) => set("refill_rate", Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span>Refill Interval (ms)</span>
          <input
            type="number"
            value={value.refill_interval_ms}
            onChange={(e) => set("refill_interval_ms", Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span>Window Size (ms)</span>
          <input
            type="number"
            value={value.window_size_ms}
            onChange={(e) => set("window_size_ms", Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span>Max Requests</span>
          <input
            type="number"
            value={value.max_requests}
            onChange={(e) => set("max_requests", Number(e.target.value))}
          />
        </label>
      </div>

      <div className="mt-5">
        <button className="btn-primary" disabled={disabled} onClick={onSave}>
          Save Configuration
        </button>
      </div>
    </div>
  );
}
