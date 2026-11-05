export function Marquee({ words }: { words: string[] }) {
  const row = [...words, ...words]
  return (
    <div aria-hidden className="overflow-hidden border-y border-white/10 bg-lime py-4 text-black">
      <div className="marquee flex w-max gap-10 whitespace-nowrap">
        {[...row, ...row].map((w, i) => (
          <span key={i} className="display flex items-center gap-10 text-3xl sm:text-5xl">{w}<span className="text-xl">✦</span></span>
        ))}
      </div>
    </div>
  )
}
