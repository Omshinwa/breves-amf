import { SelectionRotator } from "@/components/selection-rotator";
import type { Announcement } from "@/lib/announcements";
import type { Brief } from "@/lib/brief";

// Une brève de 100 à 150 mots se lit en 40 secondes environ, un titre en 4.
const BRIEF_SECONDS = 40;
const TITLE_SECONDS = 4;

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

function SelectionSlide({ brief, documents, title }: Announcement) {
  return (
    <div className="max-w-3xl">
      <a
        href={documents[0]?.url}
        target="_blank"
        rel="noreferrer"
        className="text-[15px] leading-snug font-medium [overflow-wrap:anywhere] hover:underline"
      >
        {brief?.title ?? title}
      </a>
      {brief && <BriefContent brief={brief} sourceUrl={documents[0]?.url} />}
    </div>
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
        <SelectionRotator
          key={announcements.map(({ id }) => id).join()}
          slides={announcements.map((announcement) => ({
            id: announcement.id,
            label: announcement.company,
            seconds: announcement.brief ? BRIEF_SECONDS : TITLE_SECONDS,
            content: <SelectionSlide {...announcement} />,
          }))}
        />
      </div>
    </section>
  );
}
