// Ces titres décrivent une catégorie, pas le document : ils ne disent rien du contenu.
const GENERIC_TITLE =
  /^(informations privilegiees|inside information|information financiere trimestrielle|quarterly financial|total du nombre|total number|acquisition ou cession|acquisition or disposal|rapports financiers et d'audit|half yearly|modalites de mise a disposition|terms of availability|franchissement|declaration d'intention)/;

const MONTHS =
  "janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre";

// Date seule, ou lieu et date : « Paris, le 3 novembre 2026 ».
const DATELINE = new RegExp(
  `^(?:\\D{0,40}[,–] )?(?:le )?\\d{1,2}(?:er)? (?:${MONTHS}) \\d{4}|^\\d{2}\\.\\d{2}\\.\\d{4}`,
);

// Ce qui précède le titre d'un communiqué : pagination, mention du genre,
// adresse et mentions légales.
const LAYOUT_LINE =
  /^\d+ ?\/ ?\d+|^\*|p a g e|page \d|communique|press release|information (?:privilegiee|reglementee)|societe anonyme|siege social|\br ?\.? ?c ?\.? ?s\b|exercice social|cap\. soc|p\.iva|\bisin\b|\btel\b|www\.|\.com|@|\b\d{5}\b|\d{6}/;

const MID_PHRASE_END =
  /(?:-|\b(?:de|du|des|d'|et|le|la|les|l'|en|a|au|aux|pour|sur|par|avec|dans))$/;

const HEADER_LINES = 40;
const MIN_TITLE_WORDS = 4;
const MAX_TITLE_LINE_LENGTH = 120; // Au-delà, c'est un paragraphe

// Sans accents ni majuscules, et une seule forme d'apostrophe : « l’acquisition »
// doit se lire comme « l'acquisition ».
export function normalize(text: string | null): string {
  return (text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

export function isGenericTitle(title: string | null): boolean {
  return GENERIC_TITLE.test(normalize(title));
}

function isHeaderLine(line: string): boolean {
  const text = normalize(line);
  return (
    line.split(" ").length < MIN_TITLE_WORDS ||
    LAYOUT_LINE.test(text) ||
    DATELINE.test(text)
  );
}

function isTitleLine(line: string): boolean {
  return /^[\p{L}\d]/u.test(line) && line.length <= MAX_TITLE_LINE_LENGTH;
}

// Une ligne qui repart sur une majuscule est le plus souvent un sous-titre : on
// ne la rattache que si la phrase est restée en suspens ou si tout est en capitales.
function continuesTitle(title: string, line: string): boolean {
  if (!isTitleLine(line)) return false;
  if (LAYOUT_LINE.test(normalize(line)) || DATELINE.test(normalize(line))) {
    return false;
  }
  return (
    /^[\p{Ll}\d]/u.test(line) ||
    MID_PHRASE_END.test(normalize(title)) ||
    (title === title.toUpperCase() && line === line.toUpperCase())
  );
}

// Le PDF ne balise pas son titre : c'est la première ligne qui n'est ni de la mise
// en page ni une liste à puces, suivie de ses lignes de retour à la ligne.
export function documentTitle(text: string | null): string | null {
  const lines = (text ?? "").split("\n").map((line) => line.trim());
  const start = lines
    .slice(0, HEADER_LINES)
    .findIndex((line) => !isHeaderLine(line));
  if (start === -1 || !isTitleLine(lines[start])) return null;

  let title = lines[start];
  for (const line of lines.slice(start + 1)) {
    if (!continuesTitle(title, line)) break;
    title += title.endsWith("-") ? line : ` ${line}`;
  }
  return title;
}
