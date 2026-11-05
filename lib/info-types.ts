// Le référentiel AMF donne le même libellé à des codes très différents
// (« Informations privilégiées » couvre les résultats comme les fusions) : on les
// regroupe en familles lisibles. Le premier préfixe qui correspond l'emporte.
// 015000 reste dans les communiqués : son libellé parle de rumeurs, mais les
// sociétés l'utilisent aussi pour leur activité trimestrielle (bioMérieux, Entech).
export const INFO_TYPES = [
  { id: "resultats", label: "Résultats", prefixes: ["001001", "001007"] },
  { id: "chiffre-affaires", label: "Chiffre d'affaires", prefixes: ["001008"] },
  { id: "trimestriel", label: "Information trimestrielle", prefixes: ["005"] },
  { id: "operations", label: "Acquisitions et cessions", prefixes: ["001002"] },
  { id: "offres", label: "Offres publiques", prefixes: ["009"] },
  {
    id: "communiques",
    label: "Autres communiqués",
    prefixes: ["000", "001", "015"],
  },
  {
    id: "rapports",
    label: "Rapports financiers",
    prefixes: ["002002", "002003", "003", "004"],
  },
  {
    id: "documents",
    label: "Mise à disposition de documents",
    prefixes: ["002", "300"],
  },
  {
    id: "droits-de-vote",
    label: "Droits de vote et capital",
    prefixes: ["006", "024"],
  },
  { id: "rachats", label: "Rachats d'actions", prefixes: ["013", "016"] },
  { id: "seuils", label: "Franchissements de seuil", prefixes: ["023"] },
  { id: "gouvernance", label: "Gouvernance", prefixes: ["008"] },
  { id: "autres", label: "Autres", prefixes: [""] },
] as const;

export type InfoTypeId = (typeof INFO_TYPES)[number]["id"];

export function infoTypeOf(code: string | null): InfoTypeId {
  const match = INFO_TYPES.find(({ prefixes }) =>
    prefixes.some((prefix) => code?.startsWith(prefix)),
  );
  return match?.id ?? "autres";
}

export function infoTypeLabel(id: InfoTypeId): string {
  return INFO_TYPES.find((type) => type.id === id)!.label;
}
