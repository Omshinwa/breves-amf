// Ces titres décrivent une catégorie, pas le document : ils ne disent rien du contenu.
const GENERIC_TITLE =
  /^(informations privilegiees|inside information|information financiere trimestrielle|quarterly financial|total du nombre|total number|acquisition ou cession|acquisition or disposal|rapports financiers et d'audit|half yearly|modalites de mise a disposition|terms of availability|franchissement|declaration d'intention)/;

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
