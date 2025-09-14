"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const REGIONS = [
  { code: "IN", label: "India" },
  { code: "US", label: "USA" },
  { code: "GB", label: "UK" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "Korea" },
];

const LANGS = [
  { code: "en-US", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
];

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const region = sp.get("region") || "IN";
  const language = sp.get("language") || "en-US";

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full flex items-center gap-3 py-3 sticky top-[52px] z-30 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/50">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-neutral-400">Region</label>
        <select
          value={region}
          onChange={(e) => update("region", e.target.value)}
          className="bg-neutral-900 text-white text-sm rounded px-2 py-1 border border-white/10"
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="text-neutral-400">Language</label>
        <select
          value={language}
          onChange={(e) => update("language", e.target.value)}
          className="bg-neutral-900 text-white text-sm rounded px-2 py-1 border border-white/10"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
