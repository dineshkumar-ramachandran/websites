import { SettingsForm } from "@/components/admin/settings-form";
import { razorpayConfigured } from "@/lib/razorpay";
import { getSettings } from "@/lib/settings";

export default async function AdminSettings() {
  const s = await getSettings();
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-3xl">Settings &amp; pages</h1>
      <div className="card p-4 text-sm">
        <p className="font-semibold">Integrations</p>
        <ul className="mt-1 list-disc pl-5">
          <li>Razorpay payments: {razorpayConfigured() ? <strong className="text-ok">configured</strong> : <strong className="text-warn">not configured — demo checkout in use</strong>} (set via environment variables, not here)</li>
          <li>Email/SMS notifications: not built in — see README “Next steps”.</li>
        </ul>
      </div>
      <SettingsForm initial={s} />
    </div>
  );
}
