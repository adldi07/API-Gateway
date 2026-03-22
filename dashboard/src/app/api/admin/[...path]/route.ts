import { NextRequest } from "next/server";

function getGatewayConfig() {
  const gatewayUrl =
    process.env.GATEWAY_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_URL ||
    "http://localhost:3001";

  const adminSecret = process.env.GATEWAY_ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET;

  if (!adminSecret) {
    throw new Error("Missing GATEWAY_ADMIN_SECRET");
  }

  return { gatewayUrl, adminSecret };
}

async function handle(req: NextRequest, path: string[]) {
  const { gatewayUrl, adminSecret } = getGatewayConfig();
  const query = req.nextUrl.search;
  const targetUrl = `${gatewayUrl}/admin/${path.join("/")}${query}`;

  const headers: HeadersInit = {
    Authorization: `Bearer ${adminSecret}`,
  };

  if (path.length > 0 && path[0] === "events") {
    headers.Accept = "text/event-stream";
    headers["Cache-Control"] = "no-cache";
    headers.Connection = "keep-alive";
  }

  if (req.headers.get("content-type")) {
    headers["Content-Type"] = req.headers.get("content-type") as string;
  }

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: hasBody ? await req.text() : undefined,
    cache: "no-store",
    signal: req.signal,
  });

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  if (contentType?.includes("text/event-stream")) {
    responseHeaders.set("cache-control", "no-cache");
    responseHeaders.set("connection", "keep-alive");
    responseHeaders.set("content-type", "text/event-stream");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(req, path);
}
