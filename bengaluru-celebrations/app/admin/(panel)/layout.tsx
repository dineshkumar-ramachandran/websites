import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LogoutButton } from "@/components/admin/logout-button";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/bookings", "Bookings"],
  ["/admin/bookings/calendar", "Calendar"],
  ["/admin/bookings/new", "New booking"],
  ["/admin/halls", "Halls"],
  ["/admin/locations", "Locations"],
  ["/admin/blocks", "Blocked dates"],
  ["/admin/settings", "Settings & pages"],
  ["/admin/audit", "Audit history"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, settings] = await Promise.all([requireAdminPage(), getSettings()]);
  return (
    <div className="min-h-screen bg-[#F6F2EC] lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="bg-plum-900 text-ivory-100 lg:min-h-screen">
        <div className="flex items-center justify-between p-4 lg:block">
          <Link href="/admin" className="font-display text-lg text-ivory-50 no-underline">{settings.brand_name}</Link>
          <p className="text-xs text-ivory-300 lg:mt-1">Admin · {admin.email}</p>
        </div>
        <nav aria-label="Admin">
          <ul className="flex gap-1 overflow-x-auto px-2 pb-2 lg:block lg:space-y-1 lg:px-3">
            {NAV.map(([href, label]) => (
              <li key={href} className="shrink-0">
                <Link href={href} className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ivory-100 no-underline hover:bg-plum-700">{label}</Link>
              </li>
            ))}
            <li className="shrink-0"><Link href="/" className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ivory-300 no-underline hover:bg-plum-700">View site ↗</Link></li>
            <li className="shrink-0"><LogoutButton /></li>
          </ul>
        </nav>
      </aside>
      <main id="main" className="min-w-0 p-4 sm:p-6">{children}</main>
    </div>
  );
}
