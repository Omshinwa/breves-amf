import type { Brief } from "@/lib/brief";

export function BriefArticle({
  brief,
  sourceUrl,
}: {
  brief: Brief;
  sourceUrl?: string;
}) {
  return (
    <div className="max-w-3xl">
      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="text-[15px] leading-snug font-medium [overflow-wrap:anywhere] hover:underline"
      >
        {brief.title}
      </a>
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
    </div>
  );
}
