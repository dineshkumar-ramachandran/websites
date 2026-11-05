import { getSettings } from "@/lib/settings";

export const metadata = { title: "FAQ" };

export default async function FaqPage() {
  const s = await getSettings();
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl">Frequently asked questions</h1>
      {s.faq.length === 0 ? (
        <p className="mt-4 text-ink-soft">No questions added yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {s.faq.map((f, i) => (
            <details key={i} className="card group p-0">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold text-plum-800">
                {f.q}
                <span aria-hidden className="text-gold-700 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-5 pb-4 text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
