export default function Loading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 pb-16 animate-pulse">
      <div className="h-6 w-40 bg-white/10 rounded my-4" />
      <div className="relative h-[54vw] max-h-[420px] rounded-xl overflow-hidden bg-white/10" />

      <div className="mt-8">
        <div className="h-6 w-32 bg-white/10 rounded mb-3" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] w-full rounded-lg bg-white/10" />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="h-6 w-28 bg-white/10 rounded mb-3" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] w-full rounded-lg bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}
