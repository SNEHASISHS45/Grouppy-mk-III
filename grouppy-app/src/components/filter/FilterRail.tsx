"use client";

import React from "react";
import Chip from "@/components/filter/Chip";

export type ChipGroup = {
  title: string;
  param: string;
  options: Array<{ label: string; value: string }>; // use empty value to clear
};

export default function FilterRail({ groups }: { groups: ChipGroup[] }) {
  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div className="sticky top-24 space-y-4">
        {groups.map((g) => (
          <FilterGroup key={g.param} group={g} />
        ))}
      </div>
    </aside>
  );
}

function useParamActive(param: string, value: string) {
  if (typeof window === "undefined") return false;
  const sp = new URLSearchParams(window.location.search);
  const cur = sp.get(param) || "";
  return cur === value || (!!value === false && cur === "");
}

function FilterGroup({ group }: { group: ChipGroup }) {
  const [open, setOpen] = React.useState(true);
  return (
    <section className="rounded-xl border border-white/10 bg-white/5">
      <header className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-semibold">{group.title}</h3>
        <button onClick={() => setOpen((v) => !v)} className="text-xs text-neutral-300 hover:text-white">
          {open ? "Hide" : "Show"}
        </button>
      </header>
      {open && (
        <div className="px-3 pb-3 flex flex-wrap gap-2">
          {group.options.map((o) => (
            <Chip
              key={o.value || "_all"}
              label={o.label}
              param={group.param}
              value={o.value}
              active={typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get(group.param) || "") === o.value : false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
