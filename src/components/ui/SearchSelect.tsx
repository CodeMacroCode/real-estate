"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchOption {
  value: string;
  label: string;
}

interface SearchSelectProps {
  value: string;
  onChange: (value: string, label?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  options: SearchOption[];
  selectedLabel?: string;
  dropUp?: boolean;
  maxListHeight?: string;
}

export function SearchSelect({
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  options,
  selectedLabel,
  dropUp,
  maxListHeight = "max-h-52",
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isDropUp, setIsDropUp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto detect if dropdown should open upwards or downwards if dropUp prop is not explicitly forced
  useEffect(() => {
    if (open) {
      if (dropUp !== undefined) {
        setIsDropUp(dropUp);
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        // If less than 240px below and more space above, open upwards
        if (spaceBelow < 240 && rect.top > 240) {
          setIsDropUp(true);
        } else {
          setIsDropUp(false);
        }
      }
    }
  }, [open, dropUp]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when open
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSelect = useCallback(
    (optionValue: string, optionLabel: string) => {
      onChange(optionValue, optionLabel);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const s = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(s) ||
        opt.value.toLowerCase().includes(s),
    );
  }, [options, search]);

  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ?? selectedLabel ?? value)
    : null;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !displayLabel && "text-slate-400",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{displayLabel ?? placeholder}</span>
        <ChevronDown
          className={cn(
            "ml-2 h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className={cn(
            "absolute z-50 w-full rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden ring-1 ring-black/5",
            "animate-in fade-in-0 zoom-in-95",
            isDropUp ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {/* Search Bar */}
          <div className="flex items-center border-b border-slate-100 bg-slate-50/80 px-3 py-2 gap-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            className={cn(
              "overflow-y-auto py-1 divide-y divide-slate-50 bg-white",
              maxListHeight,
            )}
          >
            {filteredOptions.length === 0 ? (
              <p className="py-5 text-center text-xs text-slate-400">
                No results found
              </p>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => handleSelect(option.value, option.label)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center px-3 py-2 text-xs text-slate-700 transition-colors",
                    "hover:bg-blue-50 hover:text-blue-700",
                    value === option.value &&
                      "bg-blue-50/80 font-semibold text-blue-700",
                  )}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {value === option.value && (
                    <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
