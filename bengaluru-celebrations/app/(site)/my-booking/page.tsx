import { LookupForm } from "@/components/lookup-form";

export const metadata = { title: "Find my booking", robots: { index: false } };

export default function MyBookingPage() {
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-4xl">Find my booking</h1>
      <p className="mt-2 text-ink-soft">Enter your booking reference and the email address or phone number you used. For your privacy we only show a booking when both match.</p>
      <div className="mt-6">
        <LookupForm />
      </div>
    </div>
  );
}
