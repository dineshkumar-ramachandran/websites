import { TextBlock } from "@/components/site-chrome";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl">Privacy notice</h1>
      <TextBlock text={s.page_privacy} className="card mt-6 p-6" />
    </div>
  );
}
