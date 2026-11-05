import { Suspense } from "react";
import { AnnouncementList } from "@/components/announcement-list";
import { ColumnHeadings } from "@/components/column-headings";
import { ExplorerSkeleton } from "@/components/explorer-skeleton";
import { FilterBar } from "@/components/filter-bar";
import { SelectionPanel } from "@/components/selection-panel";
import { getAnnouncements, hasBrief } from "@/lib/announcements";
import {
  applyFilters,
  companyFacets,
  parseFilters,
  typeFacets,
} from "@/lib/filters";
import { selectTop } from "@/lib/selection";

const SOURCE_URL = "https://www.info-financiere.gouv.fr";

async function Explorer({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  const announcements = await getAnnouncements();
  const visible = applyFilters(announcements, filters);

  return (
    <div className="group">
      <FilterBar
        filters={filters}
        companies={companyFacets(announcements, filters)}
        types={typeFacets(announcements, filters)}
        firstDay={announcements.at(-1)?.day}
        lastDay={announcements.at(0)?.day}
        count={visible.length}
      />
      <div className="transition-opacity group-has-data-pending:opacity-50">
        <SelectionPanel announcements={selectTop(visible.filter(hasBrief))} />
        <ColumnHeadings />
        <AnnouncementList announcements={visible} filters={filters} />
      </div>
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <header className="border-b border-line">
        <div className="page flex items-center justify-between gap-4 py-3">
          <div className="flex items-baseline gap-3">
            <h1 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <span className="size-2 bg-accent" aria-hidden="true" />
              Brèves AMF
            </h1>
            <p className="hidden text-[13px] text-muted sm:block">
              Publications réglementées des sociétés cotées
            </p>
          </div>
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-muted hover:text-foreground"
          >
            info-financiere.gouv.fr
          </a>
        </div>
      </header>

      <main className="flex-1">
        <Suspense fallback={<ExplorerSkeleton />}>
          <Explorer searchParams={searchParams} />
        </Suspense>
      </main>

      <footer className="page space-y-1 py-5 text-[11px] leading-relaxed text-muted">
      </footer>
    </>
  );
}
