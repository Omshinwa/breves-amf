"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Facet } from "@/lib/filters";

// Sans accents : les noms légaux sont en capitales non accentuées.
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function Combobox({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: Facet[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const needle = normalize(query.trim());
  const matches = options.filter((option) =>
    normalize(`${option.label} ${option.keywords ?? ""}`).includes(needle),
  );
  const selected = options.find((option) => option.value === value);

  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function select(next: string | undefined) {
    close();
    onChange(next);
  }

  function move(delta: number) {
    if (!matches.length) return;
    const next = (activeIndex + delta + matches.length) % matches.length;
    setActiveIndex(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (open) move(event.key === "ArrowDown" ? 1 : -1);
      else setOpen(true);
    } else if (event.key === "Enter" && open && matches[activeIndex]) {
      event.preventDefault();
      select(matches[activeIndex].value);
    } else if (event.key === "Escape") {
      close();
    }
  }

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[activeIndex] ? `${id}-${activeIndex}` : undefined
        }
        autoComplete="off"
        spellCheck={false}
        className="field w-full truncate pr-8 data-[filled=true]:border-accent/50"
        data-filled={Boolean(value)}
        placeholder={open ? (selected?.label ?? placeholder) : placeholder}
        value={open ? query : (selected?.label ?? "")}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={close}
        onKeyDown={handleKeyDown}
      />

      {value ? (
        <button
          type="button"
          aria-label={`Effacer le filtre ${label}`}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted hover:text-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => select(undefined)}
        >
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
            <path
              d="M2.5 2.5l7 7m0-7l-7 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : (
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-muted"
          aria-hidden="true"
        >
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-80 w-full min-w-72 overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-lg"
        >
          {matches.length === 0 && (
            <li className="px-3 py-2 text-[13px] text-muted">Aucun résultat</li>
          )}
          {matches.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === activeIndex}
              className="flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-[13px] data-[active=true]:bg-line/60 aria-selected:text-accent"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option.value)}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.hint && (
                <span className="font-mono text-[11px] text-muted">
                  {option.hint}
                </span>
              )}
              <span className="w-7 text-right font-mono text-[11px] text-muted tabular-nums">
                {option.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
