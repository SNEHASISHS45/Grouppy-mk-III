"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-screen-xl mx-auto px-4 pb-16">
      <div className="mt-6 p-4 rounded-md bg-red-500/10 text-red-300">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm mt-1">{error.message || "We couldn't load content right now."}</p>
        <button onClick={() => reset()} className="mt-3 px-3 py-1.5 rounded bg-white text-black text-sm">
          Try again
        </button>
      </div>
    </div>
  );
}
