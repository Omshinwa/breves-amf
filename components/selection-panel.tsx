import { BriefArticle } from "@/components/brief-article";
import { SelectionRotator } from "@/components/selection-rotator";
import type { BriefedAnnouncement } from "@/lib/announcements";

export function SelectionPanel({
  announcements,
}: {
  announcements: BriefedAnnouncement[];
}) {
  if (announcements.length === 0) return null;

  return (
    <section aria-labelledby="selection" className="border-b border-line bg-surface">
      <div className="page py-2">
        <SelectionRotator
          key={announcements.map(({ id }) => id).join()}
          slides={announcements.map(({ brief, company, documents, id }) => ({
            id,
            label: company,
            title: brief.title,
            excerpt: brief.body,
            article: (
              <BriefArticle brief={brief} sourceUrl={documents[0]?.url} />
            ),
          }))}
        />
      </div>
    </section>
  );
}
