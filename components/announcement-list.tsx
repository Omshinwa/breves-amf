import Link from "next/link";
import { BriefArticle } from "@/components/brief-article";
import type { Announcement, AnnouncementDocument } from "@/lib/announcements";
import { formatDay, formatTime } from "@/lib/dates";
import { filterHref, type Filters } from "@/lib/filters";
import { infoTypeLabel } from "@/lib/info-types";
import { WORTH_ARTICLE_SCORE } from "@/lib/selection";

function DocumentLink({ lang, url }: AnnouncementDocument) {
  const extension = url.split(".").pop()?.toUpperCase();
  const code = lang.slice(0, 2).toUpperCase();

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`Ouvrir le document source (${code}, ${extension})`}
      className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-foreground hover:text-foreground"
    >
      {code}
      {extension !== "PDF" && ` ${extension}`}
    </a>
  );
}

function rowBackground({ brief, evaluation }: Announcement): string {
  if (brief) return "bg-highlight";
  if (evaluation.score >= WORTH_ARTICLE_SCORE) return "bg-worthy";
  return "hover:bg-surface";
}

function AnnouncementRow({
  announcement,
  filters,
}: {
  announcement: Announcement;
  filters: Filters;
}) {
  const { brief, company, documents, publishedAt, ticker, title, type } =
    announcement;
  const typeLabel = infoTypeLabel(type);
  const titleClass =
    "min-w-0 text-sm leading-snug font-medium [overflow-wrap:anywhere] [grid-area:title]";

  const row = (
    <div className="page publication-row gap-y-1 py-2 lg:items-baseline">
      <time
        dateTime={publishedAt}
        className="[grid-area:time] font-mono text-xs text-muted tabular-nums"
      >
        {formatTime(publishedAt)}
      </time>
      <span className="[grid-area:ticker] truncate font-mono text-xs font-medium">
        {ticker ?? "—"}
      </span>
      <div className="flex min-w-0 items-baseline gap-1.5 [grid-area:company]">
        <Link
          href={filterHref({ ...filters, company })}
          title={company}
          className="truncate text-xs text-muted hover:text-foreground hover:underline"
        >
          {company}
        </Link>
        {announcement.isCac40 && (
          <span className="shrink-0 font-mono text-[10px] text-accent">
            CAC40
          </span>
        )}
      </div>
      {/* Avec une brève, le titre ouvre la ligne : la colonne occupe presque
          toute sa largeur, un lien y prendrait tous les clics. */}
      {brief ? (
        <span className={titleClass}>{title}</span>
      ) : (
        <a
          href={documents[0]?.url}
          target="_blank"
          rel="noreferrer"
          className={`${titleClass} hover:underline`}
        >
          {title}
        </a>
      )}
      <Link
        href={filterHref({ ...filters, type })}
        className="flex min-w-0 items-baseline gap-1.5 text-xs text-muted [grid-area:type] hover:text-foreground"
      >
        <span
          title={
            announcement.isInsideInformation
              ? "Information privilégiée"
              : undefined
          }
          className={`size-1.5 shrink-0 -translate-y-px rounded-full ${
            announcement.isInsideInformation ? "bg-accent" : ""
          }`}
        />
        {announcement.isInsideInformation && (
          <span className="sr-only">Information privilégiée :</span>
        )}
        <span className="truncate">{typeLabel}</span>
      </Link>
      <div className="flex justify-end gap-1 [grid-area:docs] lg:justify-start">
        {documents.map((document) => (
          <DocumentLink key={document.url} {...document} />
        ))}
        {brief && (
          <svg
            viewBox="0 0 12 12"
            className="ml-auto size-3 self-center text-muted transition-transform group-open/row:rotate-180"
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
      </div>
    </div>
  );

  return (
    <li
      className={`border-b border-line/70 transition-colors ${rowBackground(announcement)}`}
    >
      {brief ? (
        <details className="group/row">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            {row}
          </summary>
          <div className="page publication-row pb-3">
            <div className="[grid-area:title]">
              <BriefArticle brief={brief} sourceUrl={documents[0]?.url} />
            </div>
          </div>
        </details>
      ) : (
        row
      )}
    </li>
  );
}

function groupByDay(announcements: Announcement[]): Announcement[][] {
  const days = new Map<string, Announcement[]>();
  for (const announcement of announcements) {
    const day = days.get(announcement.day);
    if (day) day.push(announcement);
    else days.set(announcement.day, [announcement]);
  }
  return [...days.values()];
}

export function AnnouncementList({
  announcements,
  filters,
}: {
  announcements: Announcement[];
  filters: Filters;
}) {
  if (announcements.length === 0) {
    return (
      <div className="page py-20 text-center">
        <p className="text-sm font-medium">
          Aucune annonce ne correspond à ces filtres.
        </p>
        <Link
          href="/"
          className="mt-2 inline-block text-[13px] text-muted underline underline-offset-2 hover:text-foreground"
        >
          Effacer les filtres
        </Link>
      </div>
    );
  }

  return groupByDay(announcements).map((items) => {
    const { day, publishedAt } = items[0];
    return (
      <section key={day} aria-labelledby={`jour-${day}`}>
        <div className="sticky top-0 z-10 border-b border-line bg-background lg:top-(--sticky-offset)">
          <div className="page flex items-baseline justify-between py-1.5">
            <h2 id={`jour-${day}`} className="text-xs font-semibold">
              <Link
                href={filterHref({ ...filters, from: day, to: day })}
                className="hover:underline"
              >
                {formatDay(publishedAt)}
              </Link>
            </h2>
            <span className="font-mono text-[11px] text-muted tabular-nums">
              {items.length}
            </span>
          </div>
        </div>
        <ol>
          {items.map((announcement) => (
            <AnnouncementRow
              key={announcement.id}
              announcement={announcement}
              filters={filters}
            />
          ))}
        </ol>
      </section>
    );
  });
}
