import { ScoreReasons } from "@/components/score-reasons";
import type { Announcement } from "@/lib/announcements";
import type { Brief } from "@/lib/brief";

function BriefContent({
  brief,
  sourceUrl,
}: {
  brief: Brief;
  sourceUrl?: string;
}) {
  return (
    <>
      <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line">
        {brief.body}
      </p>
      {brief.figures.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {brief.figures.map(({ label, value }) => (
            <div key={`${label}-${value}`} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className="font-mono tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-xs text-muted underline underline-offset-2 hover:text-foreground"
        >
          Document source
        </a>
      )}
    </>
  );
}

export function SelectionPanel({
  announcements,
}: {
  announcements: Announcement[];
}) {
  if (announcements.length === 0) return null;

  return (
    <section aria-labelledby="selection" className="border-b border-line bg-surface">
      <div className="page py-3">
        <h2 id="selection" className="text-xs font-semibold">
          À la une
        </h2>
        <ol className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          {announcements.map(
            ({ brief, company, documents, evaluation, id, title }) => (
              <li key={id} className="min-w-0">
                <p className="truncate text-xs text-muted">{company}</p>
                <a
                  href={documents[0]?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm leading-snug font-medium [overflow-wrap:anywhere] hover:underline"
                >
                  {brief?.title ?? title}
                </a>
                <ScoreReasons evaluation={evaluation} />
                {brief && (
                  <BriefContent brief={brief} sourceUrl={documents[0]?.url} />
                )}
              </li>
            ),
          )}
        </ol>
      </div>
    </section>
  );
}
