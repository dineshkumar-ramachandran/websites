import Link from "next/link";
import { BookingDetails, PaymentBadge, PriceTable, StatusBadge } from "@/components/booking-summary";
import { Checkout, HoldTimer } from "@/components/checkout";
import { displayStatus, getBookingWithToken } from "@/lib/booking";
import { getHallDetail } from "@/lib/halls";
import { demoPaymentsEnabled, razorpayConfigured } from "@/lib/razorpay";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Review your booking", robots: { index: false } };

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const b = t ? await getBookingWithToken(id, t) : null;
  if (!b) {
    return (
      <div className="container-page max-w-2xl py-12">
        <h1 className="text-3xl">Booking link not valid</h1>
        <p className="mt-2 text-ink-soft">This link is incomplete or has been changed. Use “Find my booking” with your reference and email or phone.</p>
        <Link href="/my-booking" className="btn-primary mt-6">Find my booking</Link>
      </div>
    );
  }
  const [hall, settings] = await Promise.all([getHallDetail(b.hall_id, { includeInactive: true }), getSettings()]);
  const status = displayStatus(b);
  const mode = razorpayConfigured() && !(process.env.DEMO_PAYMENTS === "true") ? "razorpay" : demoPaymentsEnabled() ? "demo" : "none";

  return (
    <div className="container-page max-w-4xl py-8">
      {status === "held" && (
        <>
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-700">Step 2 of 2 · Review &amp; pay</p>
          <h1 className="mt-1 text-4xl">Review your booking</h1>
        </>
      )}
      {(status === "confirmed" || status === "completed") && (
        <div className="rounded-2xl border border-ok/40 bg-ok-bg p-6" role="status">
          <h1 className="text-4xl text-ok">Your booking is confirmed</h1>
          <p className="mt-2 text-lg">
            Reference <strong className="font-mono tracking-wider">{b.reference}</strong>. Please save it — you’ll need it with your email or phone to look up this booking.
          </p>
          {b.payment_status === "demo" && <p className="mt-2 font-semibold text-gold-700">Demo booking: no payment was taken.</p>}
        </div>
      )}
      {status === "expired" && (
        <div className="rounded-2xl border border-gold-500 bg-warn-bg p-6" role="alert">
          <h1 className="text-3xl">Your hold has expired</h1>
          {b.payment_status === "paid" ? (
            <p className="mt-2">
              We received a payment after the hold ended. Our team has been alerted and will contact you to confirm a slot or arrange a refund. Your reference is{" "}
              <strong className="font-mono">{b.reference}</strong>.
            </p>
          ) : (
            <p className="mt-2">The slot was released because payment wasn’t completed within {settings.hold_minutes} minutes. It may still be free — please choose again.</p>
          )}
          {hall && hall.is_active && (
            <Link href={`/book?hall=${hall.slug}&date=${b.event_date}`} className="btn-primary mt-4">
              Choose a slot again
            </Link>
          )}
        </div>
      )}
      {status === "cancelled" && (
        <div className="rounded-2xl border border-bad bg-bad-bg p-6" role="status">
          <h1 className="text-3xl text-bad">This booking was cancelled</h1>
          <p className="mt-2">Contact us with reference {b.reference} if you have questions.</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="card p-5" aria-labelledby="det-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="det-h" className="text-2xl">Booking details</h2>
            <div className="flex flex-wrap gap-2">
              <StatusBadge b={b} />
              <PaymentBadge status={b.payment_status} />
            </div>
          </div>
          <div className="mt-3">
            <BookingDetails b={b} hallName={hall?.name ?? "Hall"} locationName={hall?.location_name ?? ""} address={hall?.address} />
          </div>
        </section>
        <aside className="space-y-4">
          <section className="card p-5" aria-labelledby="price-h">
            <h2 id="price-h" className="text-2xl">Price breakdown</h2>
            <div className="mt-3">
              <PriceTable b={b} taxLabel={settings.tax_label} />
            </div>
            {hall?.is_demo && <p className="hint mt-2">Demo hall — sample prices.</p>}
          </section>
          {status === "held" && b.hold_expires_at && (
            <section className="card space-y-4 p-5" aria-labelledby="pay-h">
              <h2 id="pay-h" className="text-2xl">Payment</h2>
              <HoldTimer until={new Date(b.hold_expires_at).toISOString()} />
              <Checkout
                bookingId={b.id}
                token={t!}
                mode={mode}
                razorpayKeyId={process.env.RAZORPAY_KEY_ID}
                brandName={settings.brand_name}
                prefill={{ name: b.customer_name, email: b.customer_email, contact: b.customer_phone }}
              />
              <p className="text-sm text-ink-soft">
                Changed your mind? Just leave this page — the hold is released automatically.
              </p>
            </section>
          )}
          {(status === "confirmed" || status === "completed") && (
            <section className="card p-5">
              <h2 className="text-xl">What happens next</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                <li>The venue team may call you to discuss setup and catering.</li>
                <li>Need a change? Contact us with your reference — see the <Link href="/cancellation-policy">cancellation policy</Link>.</li>
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
