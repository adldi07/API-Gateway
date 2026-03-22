import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gateway Control Room",
  description: "Live API gateway operations dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-shell text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
          <header className="card flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-teal-700">Distributed Gateway</p>
              <h1 className="text-2xl font-bold">Control Room</h1>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link className="tab-link" href="/">Overview</Link>
              <Link className="tab-link" href="/api-keys">API Keys</Link>
              <Link className="tab-link" href="/rate-limits">Rate Limits</Link>
              <Link className="tab-link" href="/logs">Logs</Link>
            </nav>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
