import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";
import type { Brief } from "./brief";
import { isCac40 } from "./cac40";
import { parisDay } from "./dates";
import { infoTypeOf, type InfoTypeId } from "./info-types";
import {
  evaluatePublication,
  fetchPublications,
  type PublicationRow,
} from "./publications";
import type { Evaluation } from "./selection";

export type AnnouncementDocument = { lang: string; url: string };

export type Announcement = {
  id: string;
  publishedAt: string;
  day: string;
  company: string;
  ticker: string | null;
  isin: string | null;
  isCac40: boolean;
  isInsideInformation: boolean;
  title: string;
  type: InfoTypeId;
  documents: AnnouncementDocument[];
  evaluation: Evaluation;
  figureCount: number;
  textError: string | null;
  brief: Brief | null;
};

// Une annonce = un group_id. La ligne dont l'id vaut group_id est la version
// française, ou la seule version disponible : c'est elle qu'on affiche.
function toAnnouncements(rows: PublicationRow[]): Announcement[] {
  const versions = new Map<string, PublicationRow[]>();
  for (const row of rows) {
    versions.set(row.group_id, [...(versions.get(row.group_id) ?? []), row]);
  }

  return rows
    .filter((row) => row.id === row.group_id)
    .map((row) => ({
      id: row.id,
      publishedAt: row.published_at,
      day: parisDay(row.published_at),
      company: row.company,
      ticker: row.ticker,
      isin: row.isin,
      isCac40: isCac40(row.isin),
      isInsideInformation: row.subtype === "Informations privilégiées",
      title: row.title ?? "Sans titre",
      type: infoTypeOf(row.type_code),
      documents: [row, ...versions.get(row.id)!.filter((v) => v !== row)]
        .filter((version) => version.pdf_url)
        .map((version) => ({
          lang: version.lang ?? "?",
          url: version.pdf_url!,
        })),
      evaluation: evaluatePublication(row),
      figureCount: row.publication_texts?.figure_count ?? 0,
      textError: row.publication_texts?.error ?? null,
      brief: row.briefs,
    }));
}

export async function getAnnouncements(): Promise<Announcement[]> {
  "use cache";
  cacheLife("minutes");

  // Lecture seule : la clé publique suffit, le RLS n'autorise que le select.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );

  return toAnnouncements(await fetchPublications(supabase));
}
