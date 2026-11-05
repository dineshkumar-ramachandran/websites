import { query, Db } from "./db";

export type FaqItem = { q: string; a: string };

export type SiteSettings = {
  brand_name: string;
  brand_tagline: string;
  hold_minutes: number;
  tax_percent: number;
  tax_label: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_address: string;
  contact_hours: string;
  page_contact_intro: string;
  page_cancellation: string;
  page_privacy: string;
  faq: FaqItem[];
};

// Every value below is placeholder content to be edited in Admin → Settings.
export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: "Bengaluru Celebrations",
  brand_tagline: "Party halls for every celebration across Bengaluru",
  hold_minutes: 10,
  tax_percent: 18,
  tax_label: "GST",
  contact_phone: "[Add phone number]",
  contact_whatsapp: "",
  contact_email: "[Add email address]",
  contact_address: "[Add office address], Bengaluru, Karnataka",
  contact_hours: "[Add office hours, e.g. Mon–Sun, 10 AM – 8 PM]",
  page_contact_intro:
    "Have a question about a hall, a date or a booking? Reach us using the details below. (Placeholder text — edit in Admin → Settings.)",
  page_cancellation: [
    "PLACEHOLDER POLICY — the business owner must replace this text with their actual cancellation terms before going live.",
    "Suggested structure:",
    "• Cancellations more than [X] days before the event: [refund terms].",
    "• Cancellations between [Y] and [X] days before the event: [refund terms].",
    "• Cancellations within [Y] days of the event: [refund terms].",
    "• Date changes are subject to availability and may be requested by contacting us with your booking reference.",
    "• Refunds, where applicable, are returned to the original payment method within [N] working days.",
    "Only an authorised administrator can cancel a confirmed booking. Please contact us with your booking reference.",
  ].join("\n"),
  page_privacy: [
    "PLACEHOLDER PRIVACY NOTICE — the business owner should review this with a legal adviser before going live.",
    "What we collect: your name, phone number, email address, event details and booking notes that you enter in the booking form.",
    "Why we collect it: to hold and confirm your booking, contact you about your event, and keep records required for accounting.",
    "Payments: card/UPI details are entered directly with the payment provider (Razorpay) and are not stored by this website.",
    "Sharing: we do not sell your data. It is shared only with service providers needed to run bookings (hosting, payments, email).",
    "Your choices: to view, correct or delete your data, contact us at the email address on the Contact page.",
    "Cookies: this site uses only essential cookies (for administrator login). Booking pages do not use tracking cookies.",
  ].join("\n"),
  faq: [
    { q: "How do I check whether a hall is free on my date?", a: "Open a hall and pick a date on its calendar. Free slots can be selected; booked or blocked slots are shown as unavailable and cannot be selected." },
    { q: "What is the difference between a time slot and a full-day booking?", a: "A time slot reserves the hall for a set period such as an evening. A full-day booking reserves the hall for its whole operating day, so no other slot can be booked that day." },
    { q: "Why is my slot held for a few minutes?", a: "When you continue to review, the slot is held only for you for a short time while you complete payment. If the hold runs out, the slot is released and you may need to choose again." },
    { q: "Do the times include decoration and clean-up?", a: "Each hall has setup and clean-up time before and after your event. That time is reserved automatically, which is why slots next to an existing booking may be unavailable." },
    { q: "How can I see my booking later?", a: "Use the Find my booking page with your booking reference and the email address or phone number used when booking." },
    { q: "Can I cancel or change my date?", a: "Please contact us with your booking reference. See the Cancellation policy page for terms (placeholder — to be set by the business)." },
  ],
};

export async function getSettings(db?: Db): Promise<SiteSettings> {
  const rows = db
    ? (await db.query<{ key: string; value: unknown }>("SELECT key, value FROM settings")).rows
    : await query<{ key: string; value: unknown }>("SELECT key, value FROM settings");
  const out: any = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) out[r.key] = r.value;
  return out as SiteSettings;
}

export async function saveSettings(db: Db, values: Partial<SiteSettings>) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    await db.query(
      `INSERT INTO settings(key, value, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)]
    );
  }
}
