"use client";

// ============================================================
// QuickSelectChips — Horizontal row of selectable capsule chips
// for quick selection in AI chat conversations (steel type,
// spec, region, etc.)
//
// Design system: 1px border, no shadows, no gradients.
// Colors: steel-ink / steel-line / steel-muted tokens.
// ============================================================

import { useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

export interface QuickSelectChipsProps {
  /** Chip options to display */
  options: string[];
  /** Optional label text shown above the chip row */
  label?: string;
  /** When true, all chips become non-interactive */
  disabled?: boolean;
  /** Currently selected chip value (null = none selected) */
  selectedValue?: string | null;
  /** Called with the chip's text value when any chip is clicked */
  onSelect: (value: string) => void;
}

// ============================================================
// Component
// ============================================================

export function QuickSelectChips({
  options,
  label,
  disabled = false,
  selectedValue = null,
  onSelect,
}: QuickSelectChipsProps) {
  const [locked, setLocked] = useState(false);

  if (!options.length) return null;

  const isDisabled = disabled || locked;

  return (
    <div className="w-full max-w-full">
      {/* Optional label */}
      {label && (
        <p className="text-[12px] leading-[1.5] text-steel-muted mb-2 select-none">
          {label}
        </p>
      )}

      {/* Chip row */}
      <div
        className="flex flex-row flex-wrap gap-2 max-w-full overflow-x-auto"
        role="group"
        aria-label={label || "快捷选择"}
      >
        {options.map((option) => {
          const isSelected = selectedValue === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                setLocked(true);
                onSelect(option);
              }}
              disabled={isDisabled}
              className={cn(
                // Base chip
                "rounded-full border text-[13px] leading-[1.5] px-4 py-2 whitespace-nowrap select-none",
                "cursor-pointer transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-ink/10",
                // Unselected: line border, ink text, hover darkens border
                !isSelected && "border-steel-line text-steel-ink hover:border-steel-ink",
                // Selected: solid ink fill, white text
                isSelected && "bg-steel-ink text-white border-steel-ink",
                // Disabled state
                isDisabled && "opacity-50 pointer-events-none",
              )}
              aria-pressed={isSelected ? true : undefined}
              aria-disabled={isDisabled || undefined}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickSelectChips;
