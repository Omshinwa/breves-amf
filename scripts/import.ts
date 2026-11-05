// importer les publications de info financiere

import { createClient } from "@supabase/supabase-js";
import { isGenericTitle, normalize } from "@/lib/text";

const API_URL =
  "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/exports/json";
const SINCE = "2026-10-28";
const BATCH_SIZE = 500;

const NO_ISIN = "999999999999";
const NO_TICKER = "99999999";
const MAX_MARKET_GAP_MS = 300 * 24 * 60 * 60 * 1000;
const MAX_GROUP_GAP_MS = 3 * 60 * 60 * 1000; // Relie chaque version EN à la version FR la plus proche : même société, même type_code, moins de 3 heures d'écart
const MAX_DUPLICATE_GAP_MS = 5 * 60 * 1000;
const MIN_DUPLICATE_SIMILARITY = 0.7;
const LANGS: Record<string, string> = { Français: "fr", Anglais: "en" };

const MONTH =
  /^(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|january|february|march|april|may|june|july|august|september|october|november|december)$/;

type ApiRow = {
  uin_idt_uin: string;
  uin_dat_amf: string;
  uin_dat_mar: string;
  identificationsociete_iso_nom_soc: string;
  identificationsociete_iso_cd_isi: string | null;
  identificationsociete_iso_cd_lei: string | null;
  identificationsociete_iso_code_tkr_iso_cd_tkr: string | null;
  cac40: string | null;
  informationdeposee_inf_tit_inf: string | null;
  informationdeposee_inf_stp_pri: string | null;
  informationdeposee_inf_stp_inf: string | null;
  type_d_information: string | null;
  sous_type_d_information: string | null;
  informationdeposee_inf_lng_inf: string;
  informationdeposee_inf_upg_inf_inf_upg_sts: string | null;
  url_de_recuperation: string | null;
};

type Publication = {
  id: string;
  published_at: string;
  company: string;
  isin: string | null;
  lei: string | null;
  ticker: string | null;
  is_cac40: boolean | null;
  title: string | null;
  type_code: string | null;
  type_codes: string[];
  type: string | null;
  subtype: string | null;
  lang: string;
  status: string | null;
  pdf_url: string | null;
  group_id: string;
  raw: ApiRow;
};

async function fetchRows(): Promise<ApiRow[]> {
  const params = new URLSearchParams({
    where: `uin_dat_amf>=date'${SINCE}'`,
  });
  const res = await fetch(`${API_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`API info-financière : HTTP ${res.status}`);
  }
  return res.json();
}

// uin_dat_mar peut valoir 8888, 9999 ou une année fausse : au-delà de 300 jours
// d'écart, on revient à uin_dat_amf. Les dates ne sont pas corrigées, celles du
// 26 au 30/10/2026 restent donc 1 h trop tôt.
function publishedAt(row: ApiRow): string {
  const gap = Math.abs(Date.parse(row.uin_dat_mar) - Date.parse(row.uin_dat_amf));
  return gap < MAX_MARKET_GAP_MS ? row.uin_dat_mar : row.uin_dat_amf;
}

// Une chaîne simple pour un seul code, une chaîne JSON pour plusieurs.
function parseTypeCodes(codes: string | null): string[] {
  if (!codes) return [];
  return codes.startsWith("[") ? JSON.parse(codes) : [codes];
}

function parseCac40(cac40: string | null): boolean | null {
  if (cac40 === "1") return true;
  if (cac40 === "0") return false;
  return null;
}

function clean(row: ApiRow): Publication {
  const isin = row.identificationsociete_iso_cd_isi;
  const ticker = row.identificationsociete_iso_code_tkr_iso_cd_tkr;
  const lang = row.informationdeposee_inf_lng_inf;

  return {
    id: row.uin_idt_uin,
    published_at: publishedAt(row),
    company: row.identificationsociete_iso_nom_soc,
    isin: isin === NO_ISIN ? null : isin || null,
    lei: row.identificationsociete_iso_cd_lei || null,
    ticker: ticker === NO_TICKER ? null : ticker || null,
    is_cac40: parseCac40(row.cac40),
    title: row.informationdeposee_inf_tit_inf,
    type_code: row.informationdeposee_inf_stp_pri,
    type_codes: parseTypeCodes(row.informationdeposee_inf_stp_inf),
    type: row.type_d_information || null,
    subtype: row.sous_type_d_information || null,
    lang: LANGS[lang] ?? lang,
    status: row.informationdeposee_inf_upg_inf_inf_upg_sts,
    pdf_url: row.url_de_recuperation,
    group_id: row.uin_idt_uin,
    raw: row,
  };
}

function companyKey(publication: Publication): string {
  return publication.lei ?? publication.isin ?? publication.company;
}

// Relie chaque version EN à la version FR la plus proche : même société, même
// type_code, moins de 3 heures d'écart. Les paires les plus proches passent
// en premier, une ligne ne peut donc appartenir qu'à une seule paire.
function groupTranslations(publications: Publication[]): void {
  const bySource = new Map<string, Publication[]>();
  for (const publication of publications) {
    const key = `${companyKey(publication)}|${publication.type_code}`;
    bySource.set(key, [...(bySource.get(key) ?? []), publication]);
  }

  const pairs: { fr: Publication; en: Publication; gap: number }[] = [];
  for (const candidates of bySource.values()) {
    for (const fr of candidates.filter((p) => p.lang === "fr")) {
      for (const en of candidates.filter((p) => p.lang === "en")) {
        const gap = Math.abs(
          Date.parse(fr.published_at) - Date.parse(en.published_at),
        );
        if (gap < MAX_GROUP_GAP_MS) pairs.push({ fr, en, gap });
      }
    }
  }

  // Le tri sur les id rend le résultat stable d'un import à l'autre.
  pairs.sort(
    (a, b) =>
      a.gap - b.gap ||
      a.fr.id.localeCompare(b.fr.id) ||
      a.en.id.localeCompare(b.en.id),
  );

  const paired = new Set<string>();
  for (const { fr, en } of pairs) {
    if (paired.has(fr.id) || paired.has(en.id)) continue;
    paired.add(fr.id).add(en.id);
    en.group_id = fr.id;
  }
}

// Sans le nom de la société : certains dépôts le mettent en tête du titre, d'autres non.
function titleWords(publication: Publication): string[] {
  let title = normalize(publication.title);
  for (const word of normalize(publication.company).split(/\W+/)) {
    if (word.length > 3) title = title.replaceAll(word, " ");
  }
  return title.match(/[a-z0-9]+/g) ?? [];
}

function titleSimilarity(a: string[], b: string[]): number {
  const wordsA = new Set(a);
  const wordsB = new Set(b);
  const shared = [...wordsA].filter((word) => wordsB.has(word)).length;
  return shared / Math.max(1, wordsA.size + wordsB.size - shared);
}

// Un ISIN ou un mois suffit à distinguer deux documents aux titres presque identiques.
function titleMarkers(words: string[]): string {
  return words
    .filter((word) => /\d/.test(word) || MONTH.test(word))
    .sort()
    .join(" ");
}

function isDuplicate(a: Publication, b: Publication): boolean {
  const gap = Math.abs(Date.parse(a.published_at) - Date.parse(b.published_at));
  if (
    gap > MAX_DUPLICATE_GAP_MS ||
    isGenericTitle(a.title) ||
    isGenericTitle(b.title)
  ) {
    return false;
  }

  const wordsA = titleWords(a);
  const wordsB = titleWords(b);
  return (
    titleSimilarity(wordsA, wordsB) >= MIN_DUPLICATE_SIMILARITY &&
    titleMarkers(wordsA) === titleMarkers(wordsB)
  );
}

// Un même document peut être déposé deux fois sous deux id : même société, même
// langue, même type_code, moins de 5 minutes d'écart et titres proches. Les deux
// lignes rejoignent le même groupe, rien n'est perdu si la règle se trompe.
function groupDuplicates(publications: Publication[]): void {
  const byId = new Map(publications.map((p) => [p.id, p]));
  const bySource = new Map<string, Publication[]>();
  for (const publication of publications) {
    const key = `${companyKey(publication)}|${publication.lang}|${publication.type_code}`;
    bySource.set(key, [...(bySource.get(key) ?? []), publication]);
  }

  for (const candidates of bySource.values()) {
    for (const [i, a] of candidates.entries()) {
      for (const b of candidates.slice(i + 1)) {
        if (a.group_id === b.group_id || !isDuplicate(a, b)) continue;

        // L'application affiche la ligne dont l'id vaut group_id : on garde la
        // version française s'il y en a une, et le tri sur les id reste stable.
        const [kept, replaced] = [
          byId.get(a.group_id)!,
          byId.get(b.group_id)!,
        ].sort(
          (x, y) =>
            Number(y.lang === "fr") - Number(x.lang === "fr") ||
            x.id.localeCompare(y.id),
        );
        for (const publication of publications) {
          if (publication.group_id === replaced.id) {
            publication.group_id = kept.id;
          }
        }
      }
    }
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY sont requis",
    );
  }
  const supabase = createClient(url, secretKey);

  const rows = await fetchRows();
  const publications = rows.map(clean);
  groupTranslations(publications);
  groupDuplicates(publications);

  for (let i = 0; i < publications.length; i += BATCH_SIZE) {
    const { error } = await supabase
      .from("publications")
      .upsert(publications.slice(i, i + BATCH_SIZE), { onConflict: "id" });
    if (error) {
      throw new Error(`Supabase : ${error.message}`);
    }
  }

  const groups = new Set(publications.map((p) => p.group_id)).size;
  console.log(`${publications.length} publications importées, ${groups} annonces`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
