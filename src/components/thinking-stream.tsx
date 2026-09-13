"use client";

import { useState } from "react";
import { ChevronDown, BrainIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Live reasoning panel — streams model thinking tokens as they arrive so
 * waiting for an answer feels alive instead of a static loader.
 */
export function ThinkingStream({
  thinking,
  status,
  isStreaming,
}: {
  thinking: string | null;
  status: string | null;
  isStreaming: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (!isStreaming || (!thinking && !status)) return null;

  const label = status || "Thinking";

  return (
    <div className="mb-4 border border-border/50 rounded-lg overflow-hidden bg-card/40">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            <BrainIcon className="h-4 w-4" />
          </motion.div>
          <span className="font-medium">{label}</span>
          {thinking && (
            <span className="text-xs text-muted-foreground/60">
              · live reasoning
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            collapsed && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && thinking && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 max-h-48 overflow-y-auto text-xs text-muted-foreground/80 whitespace-pre-wrap font-mono leading-relaxed border-t border-border/30 pt-2">
              {thinking.slice(-2000)}
              <span className="inline-block w-1.5 h-3 bg-tint ml-0.5 align-text-bottom animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
