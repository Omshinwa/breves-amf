import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";
import { parisDay } from "./dates";
import { infoTypeOf, type InfoTypeId } from "./info-types";

const PAGE_SIZE = 1000; // Limite par défaut d'une réponse Supabase
const COLUMNS =
  "id, published_at, company, isin, ticker, is_cac40, title, type_code, subtype, lang, pdf_url, group_id";

type PublicationRow = {
  id: string;
  published_at: string;
  company: string;
  isin: string | null;
  ticker: string | null;
  is_cac40: boolean | null;
  title: string | null;
  type_code: string | null;
  subtype: string | null;
  lang: string | null;
  pdf_url: string | null;
  group_id: string;
};

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
      isCac40: row.is_cac40 === true,
      isInsideInformation: row.subtype === "Informations privilégiées",
      title: row.title ?? "Sans titre",
      type: infoTypeOf(row.type_code),
      documents: [row, ...versions.get(row.id)!.filter((v) => v !== row)]
        .filter((version) => version.pdf_url)
        .map((version) => ({
          lang: version.lang ?? "?",
          url: version.pdf_url!,
        })),
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

  const rows: PublicationRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("publications")
      .select(COLUMNS)
      .order("published_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1)
      .overrideTypes<PublicationRow[], { merge: false }>();
    if (error) {
      throw new Error(`Supabase : ${error.message}`);
    }
    rows.push(...data);
    if (data.length < PAGE_SIZE) return toAnnouncements(rows);
  }
}
