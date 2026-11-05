"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Loader2, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface InfiniteScrollSelectProps {
  /** Currently selected value */
  value: string;
  /** Called when the user picks an option */
  onChange: (value: string, label?: string) => void;
  /** Placeholder shown when nothing is selected */
  placeholder?: string;
  /** Whether the control is disabled */
  disabled?: boolean;
  /** Called whenever the search text changes (debounced 300 ms) */
  onSearchChange: (search: string) => void;
  /** Flat list of options already fetched so far (all pages flattened) */
  options: SelectOption[];
  /** Whether the initial data is loading */
  isLoading?: boolean;
  /** Whether there are more pages to load */
  hasNextPage?: boolean;
  /** Whether the next page is currently being fetched */
  isFetchingNextPage?: boolean;
  /** Trigger loading the next page */
  fetchNextPage: () => void;
  /** Label to display for an already-selected option that is not in `options` (e.g. edit mode) */
  selectedLabel?: string;
  /** Called when the dropdown is opened */
  onOpen?: () => void;
  /** Force the dropdown menu to open upwards or auto detect */
  dropUp?: boolean;
  /** Custom max height for the options list (e.g. "max-h-40") */
  maxListHeight?: string;
}

export function InfiniteScrollSelect({
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  onSearchChange,
  options,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  selectedLabel,
  onOpen,
  dropUp,
  maxListHeight = "max-h-52",
}: InfiniteScrollSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isDropUp, setIsDropUp] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isInitialMount = useRef(true);

  // Auto-detect direction
  useEffect(() => {
    if (open) {
      if (dropUp !== undefined) {
        setIsDropUp(dropUp);
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 240 && rect.top > 240) {
          setIsDropUp(true);
        } else {
          setIsDropUp(false);
        }
      }
    }
  }, [open, dropUp]);

  // Propagate debounced search up so parent can update query params (only on actual change, skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  // IntersectionObserver — triggers fetchNextPage when sentinel enters view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: listRef.current, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Close on outside click
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

  // Focus search when dropdown opens
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

  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ??
      selectedLabel ??
      (isLoading ? "Loading..." : "Select..."))
    : null;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((prev) => !prev);
        }}
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

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-50 w-full rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden ring-1 ring-black/5",
            "animate-in fade-in-0 zoom-in-95",
            isDropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          {/* Search */}
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

          {/* Options list */}
          <div
            ref={listRef}
            role="listbox"
            className={cn("overflow-y-auto py-1 divide-y divide-slate-50 bg-white", maxListHeight)}
          >
            {isLoading && options.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-500 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                Loading…
              </div>
            ) : options.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No results found
              </p>
            ) : (
              <>
                {options.map((option) => (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={value === option.value}
                    onClick={() => handleSelect(option.value, option.label)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center px-3 py-2 text-xs text-slate-700 transition-colors",
                      "hover:bg-blue-50 hover:text-blue-700",
                      value === option.value && "bg-blue-50/80 font-semibold text-blue-700",
                    )}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {value === option.value && (
                      <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    )}
                  </div>
                ))}

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="py-1">
                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-2 text-xs text-slate-400 gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      Loading more…
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

