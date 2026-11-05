import type { Announcement } from "./announcements";
import { INFO_TYPES } from "./info-types";

export type Filters = {
  company?: string;
  type?: string;
  from?: string;
  to?: string;
};

export type Facet = {
  value: string;
  label: string;
  hint?: string;
  keywords?: string;
  count: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function day(value: string | string[] | undefined): string | undefined {
  const text = single(value);
  return text && DAY.test(text) ? text : undefined;
}

export function parseFilters(params: SearchParams): Filters {
  const type = single(params.type);
  return {
    company: single(params.company),
    type: INFO_TYPES.some(({ id }) => id === type) ? type : undefined,
    from: day(params.from),
    to: day(params.to),
  };
}

export function filterHref(filters: Filters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function hasFilters(filters: Filters): boolean {
  return Object.values(filters).some(Boolean);
}

export function applyFilters(
  announcements: Announcement[],
  { company, type, from, to }: Filters,
): Announcement[] {
  return announcements.filter(
    (announcement) =>
      (!company || announcement.company === company) &&
      (!type || announcement.type === type) &&
      (!from || announcement.day >= from) &&
      (!to || announcement.day <= to),
  );
}

// Chaque liste de choix tient compte des autres filtres, pas du sien : on voit
// ce qu'il reste à sélectionner sans jamais proposer de choix qui mène à zéro.
export function companyFacets(
  announcements: Announcement[],
  filters: Filters,
): Facet[] {
  const facets = new Map<string, Facet>();
  for (const { company, ticker, isin } of applyFilters(announcements, {
    ...filters,
    company: undefined,
  })) {
    const facet = facets.get(company);
    if (facet) {
      facet.count += 1;
    } else {
      facets.set(company, {
        value: company,
        label: company,
        hint: ticker ?? undefined,
        keywords: [ticker, isin].filter(Boolean).join(" "),
        count: 1,
      });
    }
  }

  const selected = filters.company;
  if (selected && !facets.has(selected)) {
    facets.set(selected, { value: selected, label: selected, count: 0 });
  }
  return [...facets.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function typeFacets(
  announcements: Announcement[],
  filters: Filters,
): Facet[] {
  const counts = new Map<string, number>();
  for (const { type } of applyFilters(announcements, {
    ...filters,
    type: undefined,
  })) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return INFO_TYPES.filter(
    ({ id }) => counts.has(id) || id === filters.type,
  ).map(({ id, label }) => ({ value: id, label, count: counts.get(id) ?? 0 }));
}
