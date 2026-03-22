"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  time: string;
  requests: number;
};

export default function LiveChart({ data }: { data: Point[] }) {
  return (
    <div className="card h-80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Live Request Throughput</h3>
        <span className="text-sm text-slate-500">rolling 30 events</span>
      </div>
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="time" tick={{ fill: "#334155", fontSize: 12 }} />
          <YAxis tick={{ fill: "#334155", fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="requests"
            stroke="#0f766e"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
