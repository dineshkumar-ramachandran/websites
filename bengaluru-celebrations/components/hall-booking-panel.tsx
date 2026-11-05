"use client";

import { useState } from "react";
import { AvailabilityPicker, PickerSelection } from "./availability-picker";

export function HallBookingPanel({ hallId, hallSlug, today, initialDate }: { hallId: number; hallSlug: string; today: string; initialDate?: string }) {
  const [sel, setSel] = useState<PickerSelection>(null);
  const href = sel ? `/book?hall=${encodeURIComponent(hallSlug)}&date=${sel.date}&option=${encodeURIComponent(sel.optionKey)}` : undefined;
  return (
    <div>
      <AvailabilityPicker hallId={hallId} today={today} initialDate={initialDate} onSelect={setSel} />
      <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-sm text-ink-soft sm:mr-auto" aria-live="polite">
          {sel ? `Selected: ${sel.option.label} on ${sel.date}` : "Choose a date and an available slot to continue."}
        </p>
        {href ? (
          <a href={href} className="btn-primary">
            Continue to booking
          </a>
        ) : (
          <button type="button" className="btn-primary" disabled>
            Continue to booking
          </button>
        )}
      </div>
    </div>
  );
}
