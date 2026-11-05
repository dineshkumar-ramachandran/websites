import { TextBlock } from "@/components/site-chrome";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Cancellation policy" };

export default async function CancellationPage() {
  const s = await getSettings();
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl">Cancellation policy</h1>
      <TextBlock text={s.page_cancellation} className="card mt-6 p-6" />
    </div>
  );
}
