"use client";

import { useState } from "react";

export function Gallery({ images, hallName }: { images: { id: number; alt_text: string; is_demo: boolean }[]; hallName: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return <div className="grid aspect-[3/2] place-items-center rounded-2xl bg-plum-100 text-plum-700">Photos coming soon</div>;
  }
  const cur = images[Math.min(i, images.length - 1)];
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-plum-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/images/${cur.id}`} alt={cur.alt_text || `${hallName} photo ${i + 1}`} className="aspect-[3/2] w-full object-cover" />
        {cur.is_demo && <span className="demo-badge absolute left-3 top-3">Demo photo</span>}
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-between px-3">
            <button type="button" className="btn-sm btn rounded-full bg-ivory-50/90 text-plum-800" onClick={() => setI((i - 1 + images.length) % images.length)} aria-label="Previous photo">
              ←
            </button>
            <button type="button" className="btn-sm btn rounded-full bg-ivory-50/90 text-plum-800" onClick={() => setI((i + 1) % images.length)} aria-label="Next photo">
              →
            </button>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Choose photo">
          {images.map((im, idx) => (
            <li key={im.id}>
              <button type="button" onClick={() => setI(idx)} aria-label={`Show photo ${idx + 1} of ${images.length}`} aria-current={idx === i} className={`block h-16 w-24 overflow-hidden rounded-lg border-2 ${idx === i ? "border-plum-700" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/images/${im.id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
