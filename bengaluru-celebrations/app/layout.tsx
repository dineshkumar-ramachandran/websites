import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings().catch(() => null);
  const name = s?.brand_name ?? "Bengaluru Celebrations";
  return {
    title: { default: `${name} — Party halls in Bengaluru`, template: `%s · ${name}` },
    description: s?.brand_tagline ?? "Book party halls across Bengaluru.",
  };
}

export const viewport: Viewport = { themeColor: "#4A1838", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
