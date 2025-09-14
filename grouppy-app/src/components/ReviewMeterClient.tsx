"use client";

import React from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

// Verdict keys shared with MovieReviewsClient
export type Verdict = "skip" | "timepass" | "go" | "perfect";

const DEFAULT_COLORS: Record<Verdict, string> = {
  skip: "#f43f5e", // rose-500
  timepass: "#f59e0b", // amber-500
  go: "#10b981", // emerald-500
  perfect: "#8b5cf6", // violet-500
};

function formatPct(n: number) {
  return `${Math.round(n)}%`;
}

type Props = {
  movieId: number;
  colors?: Partial<Record<Verdict, string>>;
  order?: Verdict[]; // order of arcs around the ring
  animationMs?: number;
  showStars?: boolean; // show star-style weighted average from numeric ratings
};

export default function ReviewMeterClient({ movieId, colors, order, animationMs = 900, showStars = true }: Props) {
  const palette = { ...DEFAULT_COLORS, ...(colors || {}) } as Record<Verdict, string>;
  const arcOrder: Verdict[] = order && order.length ? order : ["skip", "timepass", "go", "perfect"];

  const [counts, setCounts] = React.useState<Record<Verdict, number>>({ skip: 0, timepass: 0, go: 0, perfect: 0 });
  const [ratingAvg10, setRatingAvg10] = React.useState<number>(0); // 0-10

  React.useEffect(() => {
    const col = collection(db, "movies", String(movieId), "reviews");
    const unsub = onSnapshot(col, (snap) => {
      const next: Record<Verdict, number> = { skip: 0, timepass: 0, go: 0, perfect: 0 };
      let rSum = 0;
      let rCnt = 0;
      snap.forEach((doc) => {
        const data = doc.data() as any;
        const v = data?.verdict as Verdict | undefined;
        if (v && next[v] !== undefined) next[v]++;
        if (typeof data?.rating === "number") { rSum += data.rating; rCnt += 1; }
      });
      setCounts(next);
      setRatingAvg10(rCnt > 0 ? rSum / rCnt : 0);
    });
    return () => unsub();
  }, [movieId]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const positive = counts.go + counts.perfect;
  const positivePct = total > 0 ? (positive / total) * 100 : 0;

  // Build target percentages following desired order
  const targetPcts = React.useMemo(() => arcOrder.map((k) => (total ? (counts[k] / total) * 100 : 0)), [arcOrder, counts, total]);

  // Animation state for arc percentages and center counter
  const [animatedPcts, setAnimatedPcts] = React.useState<number[]>(arcOrder.map(() => 0));
  const [animatedPositive, setAnimatedPositive] = React.useState(0);

  React.useEffect(() => {
    const start = performance.now();
    const fromPcts = animatedPcts.slice();
    const fromPos = animatedPositive;
    const duration = Math.max(200, animationMs);
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const et = ease(t);
      setAnimatedPcts(arcOrder.map((_, i) => fromPcts[i] + (targetPcts[i] - fromPcts[i]) * et));
      setAnimatedPositive(fromPos + (positivePct - fromPos) * et);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPcts.map((n) => n.toFixed(2)).join("|"), positivePct, animationMs]);

  // Create gradient string from animated percentages
  let acc = 0;
  const stops: string[] = [];
  for (let i = 0; i < animatedPcts.length; i++) {
    const color = palette[arcOrder[i]];
    const startDeg = acc;
    const endDeg = acc + (animatedPcts[i] / 100) * 360;
    stops.push(`${color} ${startDeg}deg ${endDeg}deg`);
    acc = endDeg;
  }
  const gradient = stops.length ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(#222 0deg 360deg)";

  // Star-style average from numeric ratings (0-10 -> 0-5 stars)
  const starAvg = ratingAvg10 / 2;
  const fullStars = Math.floor(starAvg);
  const halfStar = starAvg - fullStars >= 0.5;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold mb-4">Review Meter</h3>
      <div className="flex flex-col items-center">
        <div className="relative w-72 h-36 overflow-hidden">
          <div className="absolute inset-0 rounded-full" style={{ background: gradient }} />
          {/* Mask lower half */}
          <div className="absolute left-0 right-0 bottom-0 h-1/2 bg-white/5" />
          {/* Inner cutout to create ring */}
          <div className="absolute inset-4 rounded-full bg-black" style={{ clipPath: "inset(50% 0 0 0)" }} />
          <div className="absolute inset-4 rounded-full bg-black/0" style={{ clipPath: "inset(50% 0 0 0)" }} />
          <div className="absolute inset-0 grid place-items-center" style={{ top: "auto", height: "100%" }}>
            <div className="-mt-2 text-center">
              <div className="text-3xl font-bold">{formatPct(animatedPositive)}</div>
              <div className="text-xs text-neutral-400">{positive}/{total} Votes</div>
            </div>
          </div>
        </div>

        {showStars && (
          <div className="mt-3 flex items-center gap-1" aria-label={`Average rating ${starAvg.toFixed(1)} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => {
              const idx = i + 1;
              let fill = idx <= fullStars ? 1 : idx === fullStars + 1 && halfStar ? 0.5 : 0;
              return (
                <StarIcon key={i} fillFrac={fill} />
              );
            })}
            <span className="ml-2 text-sm text-neutral-300">{starAvg.toFixed(1)} / 5</span>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Legend label="Skip" color={palette.skip} pct={total ? (counts.skip / total) * 100 : 0} />
          <Legend label="Timepass" color={palette.timepass} pct={total ? (counts.timepass / total) * 100 : 0} />
          <Legend label="Go for it" color={palette.go} pct={total ? (counts.go / total) * 100 : 0} />
          <Legend label="Perfection" color={palette.perfect} pct={total ? (counts.perfect / total) * 100 : 0} />
        </div>
      </div>
    </div>
  );
}

function Legend({ label, color, pct }: { label: string; color: string; pct: number }) {
  return (
    <div className="flex items-center gap-2 text-neutral-300">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm">{label}</span>
      <span className="ml-1 text-xs text-neutral-400">{formatPct(pct)}</span>
    </div>
  );
}

function StarIcon({ fillFrac }: { fillFrac: number }) {
  const clip = `${(1 - fillFrac) * 100}%`;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="text-neutral-700">
      <defs>
        <linearGradient id="starFill" x1="0" x2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.21l8.2-1.192z"
        fill="url(#starFill)"
        style={{ clipPath: `inset(0 ${clip} 0 0)` }}
      />
      <path
        d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.21l8.2-1.192z"
        fill="none"
        stroke="#ffffff22"
      />
    </svg>
  );
}
