"use client";

import { useEffect, useMemo, useState } from "react";

type EventMessage = {
  type: string;
  data: unknown;
};

export function useSSE(path = "/api/admin/events") {
  const [events, setEvents] = useState<EventMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(path);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    const append = (type: string) => (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data);
        setEvents((prev) => [...prev.slice(-199), { type, data: parsed }]);
      } catch {
        setEvents((prev) => [...prev.slice(-199), { type, data: event.data }]);
      }
    };

    source.addEventListener("request", append("request"));
    source.addEventListener("rate_limit", append("rate_limit"));
    source.addEventListener("heartbeat", append("heartbeat"));

    return () => {
      source.close();
    };
  }, [path]);

  const requestEvents = useMemo(
    () => events.filter((event) => event.type === "request").map((event) => event.data as {
      method: string;
      path: string;
      statusCode: number;
      latencyMs: number;
      apiKeyId: string | null;
      timestamp: string;
    }),
    [events]
  );

  return {
    connected,
    events,
    requestEvents,
  };
}
