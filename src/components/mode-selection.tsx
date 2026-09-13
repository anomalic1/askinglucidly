"use client";

import { useConfigStore, SearchMode } from "@/stores";
import { cn } from "@/lib/utils";
import { Compass, Search, Telescope } from "lucide-react";

const modes: { value: SearchMode; label: string; icon: React.ReactNode }[] = [
  { value: "ask", label: "Ask", icon: <Compass className="h-3.5 w-3.5" /> },
  { value: "research", label: "Research", icon: <Search className="h-3.5 w-3.5" /> },
  { value: "deepsearch", label: "DeepSearch", icon: <Telescope className="h-3.5 w-3.5" /> },
];

export function ModeSelection() {
  const { mode, setMode } = useConfigStore();

  return (
    <div className="flex items-center gap-0.5 bg-card border border-border/50 rounded-full p-0.5">
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => setMode(m.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer select-none",
            mode === m.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={mode === m.value}
        >
          {m.icon}
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
