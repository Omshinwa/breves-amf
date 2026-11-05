import type { SupabaseClient } from "@supabase/supabase-js";
import type { Brief } from "./brief";
import { evaluate, type Evaluation } from "./selection";

const PAGE_SIZE = 1000; // Limite par défaut d'une réponse Supabase
const COLUMNS =
  "id, published_at, company, isin, ticker, title, type_code, subtype, lang, pdf_url, group_id, filed_at:raw->>uin_dat_amf, publication_texts(head, figure_count, error), briefs(title, body, figures)";

export type PublicationText = {
  head: string | null;
  figure_count: number;
  error: string | null;
};

export type PublicationRow = {
  id: string;
  published_at: string;
  company: string;
  isin: string | null;
  ticker: string | null;
  title: string | null;
  type_code: string | null;
  subtype: string | null;
  lang: string | null;
  pdf_url: string | null;
  group_id: string;
  filed_at: string;
  publication_texts: PublicationText | null;
  briefs: Brief | null;
};

export async function fetchPublications(
  supabase: SupabaseClient,
): Promise<PublicationRow[]> {
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
    if (data.length < PAGE_SIZE) return rows;
  }
}

export function evaluatePublication(row: PublicationRow): Evaluation {
  return evaluate({
    title: row.title,
    head: row.publication_texts?.head ?? null,
    typeCode: row.type_code,
    ticker: row.ticker,
    isin: row.isin,
    publishedAt: row.published_at,
    filedAt: row.filed_at,
  });
}
