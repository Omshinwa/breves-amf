// importer les publications de info financiere

import { createClient } from "@supabase/supabase-js";

const API_URL =
  "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/exports/json";
const SINCE = "2026-10-28";
const BATCH_SIZE = 500;

const NO_ISIN = "999999999999";
const NO_TICKER = "99999999";
const MAX_MARKET_GAP_MS = 300 * 24 * 60 * 60 * 1000;
const MAX_GROUP_GAP_MS = 3 * 60 * 60 * 1000; // Relie chaque version EN à la version FR la plus proche : même société, même type_code, moins de 3 heures d'écart
const LANGS: Record<string, string> = { Français: "fr", Anglais: "en" };

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

// Relie chaque version EN à la version FR la plus proche : même société, même
// type_code, moins de 3 heures d'écart. Les paires les plus proches passent
// en premier, une ligne ne peut donc appartenir qu'à une seule paire.
function groupTranslations(publications: Publication[]): void {
  const bySource = new Map<string, Publication[]>();
  for (const publication of publications) {
    const company = publication.lei ?? publication.isin ?? publication.company;
    const key = `${company}|${publication.type_code}`;
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
