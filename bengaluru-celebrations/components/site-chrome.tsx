import Link from "next/link";
import type { SiteSettings } from "@/lib/settings";

const NAV = [
  { href: "/halls", label: "Halls" },
  { href: "/my-booking", label: "Find my booking" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  return (
    <header className="border-b border-ivory-300 bg-ivory-50/95">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-plum-700 focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-3 no-underline hover:no-underline">
          <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-plum-700 font-display text-lg text-gold-300">
            {settings.brand_name.trim().charAt(0) || "B"}
          </span>
          <span className="font-display text-xl font-semibold text-plum-800 sm:text-2xl">{settings.brand_name}</span>
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="btn-ghost btn-sm text-base">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/halls" className="btn-primary btn-sm ml-2">
                Check availability
              </Link>
            </li>
          </ul>
        </nav>
        <details className="relative md:hidden">
          <summary className="btn-outline btn-sm cursor-pointer list-none" aria-label="Open menu">
            Menu
          </summary>
          <nav aria-label="Mobile" className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-ivory-300 bg-ivory-50 p-2 shadow-card">
            <ul>
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="block min-h-[48px] rounded-lg px-4 py-3 text-ink no-underline hover:bg-plum-50">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="mt-16 bg-plum-800 text-ivory-200">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-xl text-ivory-50">{settings.brand_name}</p>
          <p className="mt-2 text-sm text-ivory-300">{settings.brand_tagline}</p>
          <p className="mt-4 text-xs text-ivory-300">
            Demo website: halls, photos, prices and addresses shown are sample content until replaced by the business.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-2 text-sm">
            {[
              ["/halls", "All halls"],
              ["/my-booking", "Find my booking"],
              ["/faq", "FAQ"],
              ["/cancellation-policy", "Cancellation policy"],
              ["/privacy", "Privacy"],
              ["/contact", "Contact"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-ivory-100 underline-offset-4 hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-sm">
          <p className="font-semibold text-ivory-50">Contact</p>
          <p className="mt-2">{settings.contact_phone}</p>
          <p>{settings.contact_email}</p>
          <p className="mt-2 text-ivory-300">{settings.contact_address}</p>
          <p className="mt-4 text-xs text-ivory-300">All times are Indian Standard Time (Asia/Kolkata). Prices in Indian rupees (₹).</p>
        </div>
      </div>
    </footer>
  );
}

/** Renders admin-editable plain text: blank-line/newline separated paragraphs, "•" lines as a list. No HTML is interpreted. */
export function TextBlock({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`u${out.length}`} className="mb-3 list-disc space-y-1 pl-6">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  for (const l of lines) {
    if (/^[•\-*]\s+/.test(l)) bullets.push(l.replace(/^[•\-*]\s+/, ""));
    else {
      flush();
      out.push(<p key={`p${out.length}`}>{l}</p>);
    }
  }
  flush();
  return <div className={`prose-simple ${className}`}>{out}</div>;
}
