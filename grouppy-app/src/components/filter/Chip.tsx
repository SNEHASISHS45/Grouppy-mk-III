"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export default function Chip({
  label,
  param,
  value,
  active,
}: {
  label: string;
  param: string;
  value: string;
  active?: boolean;
}) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const href = (() => {
    const params = new URLSearchParams(sp?.toString() || "");
    if (active) {
      params.delete(param);
    } else {
      params.set(param, value);
    }
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  })();
  return (
    <Link
      href={href}
      className={`px-2 py-1 rounded-full border text-xs transition-colors ${
        active ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
}
