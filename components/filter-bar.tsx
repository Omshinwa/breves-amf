"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { ColumnHeadings } from "@/components/column-headings";
import { Combobox } from "@/components/combobox";
import { filterHref, hasFilters, type Facet, type Filters } from "@/lib/filters";

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string | undefined;
  min: string | undefined;
  max: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="field flex min-w-0 flex-1 items-center gap-2 lg:w-40 lg:flex-none">
      <span className="text-muted">{label}</span>
      <input
        type="date"
        className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
    </label>
  );
}

export function FilterBar({
  filters,
  companies,
  types,
  firstDay,
  lastDay,
  count,
}: {
  filters: Filters;
  companies: Facet[];
  types: Facet[];
  firstDay: string | undefined;
  lastDay: string | undefined;
  count: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(filters);

  function update(next: Filters) {
    startTransition(() => {
      setOptimistic(next);
      router.push(filterHref(next));
    });
  }

  return (
    <div
      data-pending={isPending ? "" : undefined}
      className="z-20 border-b border-line bg-background lg:sticky lg:top-0"
    >
      <div className="page grid gap-2 py-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,20rem)_minmax(0,15rem)_auto_minmax(max-content,1fr)] lg:items-center">
        <Combobox
          label="Société"
          placeholder="Toutes les sociétés"
          options={companies}
          value={optimistic.company}
          onChange={(company) => update({ ...optimistic, company })}
        />
        <Combobox
          label="Type d'information"
          placeholder="Tous les types"
          options={types}
          value={optimistic.type}
          onChange={(type) => update({ ...optimistic, type })}
        />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <DateField
            label="Du"
            value={optimistic.from}
            min={firstDay}
            max={optimistic.to ?? lastDay}
            onChange={(from) => update({ ...optimistic, from })}
          />
          <DateField
            label="Au"
            value={optimistic.to}
            min={optimistic.from ?? firstDay}
            max={lastDay}
            onChange={(to) => update({ ...optimistic, to })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 text-[13px] sm:col-span-2 lg:col-span-1 lg:justify-end">
          {hasFilters(optimistic) && (
            <button
              type="button"
              className="whitespace-nowrap text-muted underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => update({})}
            >
              Effacer les filtres
            </button>
          )}
          <p aria-live="polite" className="ml-auto whitespace-nowrap text-muted">
            <span className="font-mono font-medium text-foreground tabular-nums">
              {count}
            </span>{" "}
            {count > 1 ? "annonces" : "annonce"}
          </p>
        </div>
      </div>
      <ColumnHeadings />
    </div>
  );
}
