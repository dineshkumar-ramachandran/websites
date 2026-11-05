import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div>
        <h1 className="text-4xl">Page not found</h1>
        <p className="mt-2 text-ink-soft">This page doesn’t exist, or the hall is no longer taking bookings.</p>
        <Link href="/halls" className="btn-primary mt-6">See available halls</Link>
      </div>
    </main>
  );
}
