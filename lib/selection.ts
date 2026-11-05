import { isCac40 } from "./cac40";
import { isGenericTitle, normalize } from "./text";

// Sélection des publications qui méritent une brève. La note additionne
// l'événement, l'audience et les signaux du titre : voir le README.
export const WORTH_ARTICLE_SCORE = 45;
const SELECTION_SIZE = 5;
const MAX_PER_FAMILY = 2;
const MAX_FILING_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
const LARGE_AMOUNT_MILLIONS = 100;
const HEAD_LENGTH = 260;
const MIN_TEXT_LENGTH = 400;
const MIN_LETTER_RATIO = 0.4;

const CAC40_POINTS = 25;
const MID_CAP_POINTS = 10;
const GUIDANCE_POINTS = 15;
const TONE_POINTS = 5;
const AMOUNT_POINTS = 10;

// Droits de vote, rachats, documents mis à disposition, franchissements de seuil…
// Les rapports sont exclus car le communiqué de résultats a déjà porté la nouvelle.
const ROUTINE_CODE = /^(002|003|004|006|013|014|023|300)/;

// Le type_code ne suffit pas : 001006 contient aussi des droits de vote (L'Oréal)
// et des rachats d'actions (Orange). « Nom de l'émetteur » signale un tableau de rachats.
const ROUTINE_TEXT =
  /droits? de vote|voting rights|actions? propres|actions rachetees|share buyback|contrat de liquidite|liquidity contract|calendrier|agenda financier|financial calendar|mise a disposition|modalites de mise|\bparticipera\b|annonce sa participation|conferences? investisseurs|lettre aux actionnaires|visioconference|compte rendu|\bconvocation\b|transactions sur actions|nom de l.emetteur/;

const SMALL_CAP_TICKER = /^(AL|ML)[A-Z0-9]{2,}$/; // Euronext Growth et Access
const NOT_SMALL_CAP_TICKERS = new Set(["ALTA", "ALUN"]); // Altarea et Amundi

function words(pattern: string): RegExp {
  return new RegExp(`\\b(?:${pattern})`);
}

// La première famille reconnue l'emporte. La dette passe avant les acquisitions :
// un emprunt qui finance un rachat reste un emprunt (Schneider).
const FAMILIES = [
  {
    id: "crise",
    label: "crise",
    points: 50,
    pattern: words(
      "sauvegarde|redressement judiciaire|liquidation judiciaire|procedure collective|conciliation|cessation des paiements|restructuration de (?:la )?dette|ralentissement|avertissement|profit warning|depreciation",
    ),
  },
  {
    id: "dette",
    label: "dette",
    points: 15,
    pattern: words(
      "emission obligataire|offre de rachat|obligations hybrides|emission d.obligations|srep\\b|exigences prudentielles",
    ),
  },
  {
    id: "offre_ma",
    label: "acquisition ou cession",
    points: 45,
    pattern: words(
      "offre publique|opa\\b|opr\\b|fusion|acquisition|acquiert|cession|rachete|prise de participation|radiation|retrait de la cote|offre volontaire|reprise de l.activite|offres de reprise",
    ),
  },
  {
    id: "capital",
    label: "capital",
    points: 35,
    pattern: words("augmentation de capital|levee de fonds"),
  },
  {
    id: "alerte",
    label: "report de publication",
    points: 25,
    pattern: words("report de (?:la )?publication|decalage publication"),
  },
  {
    id: "resultats",
    label: "résultats",
    points: 30,
    pattern: words(
      "resultats?|chiffre d.affaires|t[1-4]\\b|trimestre|semestre|neuf premiers mois|9 ?m\\b|9 mois|results|revenue|bnpa|ebitda|activite du",
    ),
  },
  {
    id: "clinique",
    label: "clinique",
    points: 30,
    pattern: words(
      "phase [123i]|fda\\b|ema\\b|amm\\b|essai clinique|autorisation de commercialis",
    ),
  },
  {
    id: "gouvernance",
    label: "gouvernance",
    points: 20,
    pattern: words(
      "nomination|nomme|succede|va succeder|directeur general|directrice generale|demission|quitte\\b|conseil d.administration|gouvernance",
    ),
  },
  {
    id: "contrat",
    label: "contrat",
    points: 20,
    pattern: words("commande|contrat|remporte|partenariat|selectionne|accord"),
  },
  { id: "autre", label: "autre", points: 5, pattern: /./ },
] as const;

const GUIDANCE = words(
  "releve|revision a la hausse|revoit|revise|abaisse|objectifs? (?:\\d|revise|releve)|avertissement|perspectives? (?:relevee|abaissee)|amelioration des objectifs",
);
const TONE = words(
  "record|chute|recul|perte|forte|accelere|acceleration|multiplie|1er benefice|premier benefice",
);
const AMOUNT =
  /(\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?) ?(milliards?|md ?(?:€|eur|\$)|millions?|m ?(?:€|eur|\$))/g;
const FIGURE =
  /\d[\d\s.,]*\s?(?:%|M€|Md€|M\s?EUR|Md\s?EUR|millions?|milliards?|€|EUR)/gi;

export type FamilyId = (typeof FAMILIES)[number]["id"];
export type ExclusionReason = "code" | "texte" | "date";
export type Reason = { points: number; label: string };

export type Evaluation = {
  score: number;
  family: FamilyId | null;
  reasons: Reason[];
  excludedBy: ExclusionReason | null;
};

export type EvaluationInput = {
  title: string | null;
  head: string | null;
  typeCode: string | null;
  ticker: string | null;
  isin: string | null;
  publishedAt: string;
  filedAt: string;
};

export function isRoutineCode(code: string | null): boolean {
  return ROUTINE_CODE.test(code ?? "");
}

function excluded(excludedBy: ExclusionReason): Evaluation {
  return { score: 0, family: null, reasons: [], excludedBy };
}

function audience(isin: string | null, ticker: string | null): Reason {
  if (isCac40(isin)) return { points: CAC40_POINTS, label: "CAC 40" };
  const isSmallCap =
    ticker && SMALL_CAP_TICKER.test(ticker) && !NOT_SMALL_CAP_TICKERS.has(ticker);
  return isSmallCap
    ? { points: 0, label: "petite valeur" }
    : { points: MID_CAP_POINTS, label: "valeur moyenne" };
}

function largestAmount(text: string): number {
  const amounts = [...text.matchAll(AMOUNT)].map(([, value, unit]) => {
    const number = Number(value.replace(/[ .](?=\d{3})/g, "").replace(",", "."));
    return /^(?:md|milliard)/.test(unit) ? number * 1000 : number;
  });
  return Math.max(0, ...amounts);
}

function signals(text: string, family: FamilyId): Reason[] {
  const reasons: Reason[] = [];
  if (GUIDANCE.test(text) && !text.includes("confirm")) {
    reasons.push({ points: GUIDANCE_POINTS, label: "objectifs modifiés" });
  } else if (TONE.test(text)) {
    reasons.push({ points: TONE_POINTS, label: "ton marqué" });
  }
  if (family !== "dette" && largestAmount(text) >= LARGE_AMOUNT_MILLIONS) {
    reasons.push({ points: AMOUNT_POINTS, label: "montant élevé" });
  }
  return reasons;
}

export function evaluate(input: EvaluationInput): Evaluation {
  if (isRoutineCode(input.typeCode)) return excluded("code");

  // Un titre générique ne dit rien : on lit alors le début du document.
  const useHead = isGenericTitle(input.title) && input.head;
  const text = normalize(useHead ? input.head : input.title);
  if (ROUTINE_TEXT.test(text)) return excluded("texte");

  const delay = Date.parse(input.filedAt) - Date.parse(input.publishedAt);
  if (delay > MAX_FILING_DELAY_MS) return excluded("date");

  const family = FAMILIES.find(({ pattern }) => pattern.test(text))!;
  const reasons = [
    { points: family.points, label: family.label },
    audience(input.isin, input.ticker),
    ...signals(text, family.id),
  ].filter(({ points }) => points > 0);

  return {
    score: reasons.reduce((total, { points }) => total + points, 0),
    family: family.id,
    reasons,
    excludedBy: null,
  };
}

// Le texte doit être exploitable, sinon les chiffres d'une brève ne sont pas
// vérifiables. Certains PDF donnent un texte vide ou fait de caractères isolés.
export function assessDocument(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  const letters = compact.match(/\p{L}/gu)?.length ?? 0;
  const readable =
    compact.length >= MIN_TEXT_LENGTH &&
    letters / compact.length >= MIN_LETTER_RATIO;

  return {
    head: compact.slice(0, HEAD_LENGTH),
    figureCount: compact.match(FIGURE)?.length ?? 0,
    error: readable ? null : "texte illisible",
  };
}

type Candidate = {
  company: string;
  evaluation: Evaluation;
  figureCount: number;
  textError: string | null;
};

// À note égale, le document le plus chiffré passe en premier : la brève en
// tire plus de faits et la vérification plus de matière.
export function selectTop<T extends Candidate>(announcements: T[]): T[] {
  const ranked = announcements
    .filter(
      ({ evaluation, textError }) =>
        evaluation.score >= WORTH_ARTICLE_SCORE && !textError,
    )
    .sort(
      (a, b) =>
        b.evaluation.score - a.evaluation.score ||
        b.figureCount - a.figureCount,
    );

  const companies = new Set<string>();
  const families = new Map<FamilyId | null, number>();
  const selected: T[] = [];
  for (const announcement of ranked) {
    const { family } = announcement.evaluation;
    const familyCount = families.get(family) ?? 0;
    if (companies.has(announcement.company) || familyCount >= MAX_PER_FAMILY) {
      continue;
    }

    companies.add(announcement.company);
    families.set(family, familyCount + 1);
    selected.push(announcement);
    if (selected.length === SELECTION_SIZE) break;
  }
  return selected;
}
