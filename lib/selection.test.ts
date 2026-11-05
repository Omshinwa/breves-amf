import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessDocument,
  evaluate,
  selectTop,
  type Evaluation,
  type EvaluationInput,
  type FamilyId,
} from "./selection";

const SANOFI = "FR0000120578";
const GENERIC_TITLE = "Informations privilégiées / Autres communiqués";

function input(overrides: Partial<EvaluationInput>): EvaluationInput {
  return {
    title: "Communiqué",
    head: null,
    typeCode: "001006",
    ticker: "ABC",
    isin: "FR0000000000",
    publishedAt: "2026-11-03T17:00:00+00:00",
    filedAt: "2026-11-03T17:00:00+00:00",
    ...overrides,
  };
}

function candidate(
  company: string,
  score: number,
  family: FamilyId,
  overrides: { figureCount?: number; textError?: string } = {},
) {
  const evaluation: Evaluation = { score, family, reasons: [], excludedBy: null };
  return { company, evaluation, figureCount: 0, textError: null, ...overrides };
}

describe("evaluate", () => {
  it("garde un résultat classé en communiqué général", () => {
    const { family, score } = evaluate(
      input({
        title:
          "Communiqué de presse : T3 2026 : croissance à deux chiffres du chiffre d’affaires et du BNPA ; révision à la hausse des perspectives 2026",
        isin: SANOFI,
      }),
    );
    assert.equal(family, "resultats");
    assert.equal(score, 30 + 25 + 15);
  });

  it("exclut des droits de vote classés en communiqué général", () => {
    const { excludedBy, score } = evaluate(
      input({
        title:
          "Déclaration du nombre total de droits de vote et du nombre d’actions composant le capital au 31 octobre 2026",
      }),
    );
    assert.equal(excludedBy, "texte");
    assert.equal(score, 0);
  });

  it("exclut la routine par son code", () => {
    assert.equal(
      evaluate(input({ title: "Franchissement de seuil", typeCode: "023000" }))
        .excludedBy,
      "code",
    );
  });

  it("reconnaît un mot derrière une apostrophe typographique", () => {
    const { family } = evaluate(
      input({ title: "Publicis Groupe finalise l’acquisition de LiveRamp" }),
    );
    assert.equal(family, "offre_ma");
  });

  it("classe en dette un emprunt qui finance une acquisition", () => {
    const { family, reasons } = evaluate(
      input({
        title:
          "Succès de l’émission obligataire de 6,0 milliards d’euros dans le cadre du financement de l’acquisition de PTC",
      }),
    );
    assert.equal(family, "dette");
    assert.ok(!reasons.some(({ label }) => label === "montant élevé"));
  });

  it("lit le début du document derrière un titre générique", () => {
    const { family } = evaluate(
      input({
        title: GENERIC_TITLE,
        head: "Advicenne : information relative à la procédure de sauvegarde",
      }),
    );
    assert.equal(family, "crise");
  });

  it("ne lit pas le début du document si le titre suffit", () => {
    const { family } = evaluate(
      input({
        title: "VINCI remporte la construction d'une salle symphonique",
        head: "procédure de sauvegarde",
      }),
    );
    assert.equal(family, "contrat");
  });

  it("exclut un tableau de rachats derrière un titre générique", () => {
    const { excludedBy } = evaluate(
      input({
        title: GENERIC_TITLE,
        head: "La Défense, le 8 septembre 2026 Nom de l'émetteur Code identifiant de l'émetteur",
      }),
    );
    assert.equal(excludedBy, "texte");
  });

  it("exclut une annonce déposée plus de 7 jours après sa diffusion", () => {
    const { excludedBy } = evaluate(
      input({
        title: "Résultats annuels",
        publishedAt: "2026-04-23T16:00:00+00:00",
        filedAt: "2026-05-06T16:00:00+00:00",
      }),
    );
    assert.equal(excludedBy, "date");
  });

  it("ne se fie pas au ticker pour Amundi et Altarea", () => {
    const small = evaluate(input({ title: "Résultats", ticker: "ALDVI" }));
    const amundi = evaluate(input({ title: "Résultats", ticker: "ALUN" }));
    assert.equal(small.score, 30);
    assert.equal(amundi.score, 30 + 10);
  });

  it("ne compte pas un objectif simplement confirmé", () => {
    const { reasons } = evaluate(
      input({ title: "Confirmation des objectifs 2026/27 révisés" }),
    );
    assert.ok(!reasons.some(({ label }) => label === "objectifs modifiés"));
  });

  it("accorde le bonus de montant à partir de 100 M€", () => {
    const has = (title: string) =>
      evaluate(input({ title })).reasons.some(
        ({ label }) => label === "montant élevé",
      );
    assert.ok(has("Contrats d'une valeur de 1,2 milliard d'euros"));
    assert.ok(has("Chiffre d'affaires du T3 2026 : 1 420,1 M€"));
    assert.ok(!has("Commande majeure de 6,5 M€"));
    assert.ok(!has("Offre sur 2026 titres"));
  });
});

describe("assessDocument", () => {
  it("garde le début du texte et compte les chiffres", () => {
    const text = `Résultats\n\ndu trimestre : 12,5 M€, soit +3 %. ${"Texte courant. ".repeat(40)}`;
    const { head, figureCount, error } = assessDocument(text);
    assert.equal(error, null);
    assert.ok(head.startsWith("Résultats du trimestre"));
    assert.equal(figureCount, 2);
  });

  it("rejette un texte trop court ou sans lettres", () => {
    assert.equal(assessDocument("o o o o 1 4").error, "texte illisible");
    assert.equal(assessDocument("1 2 3 ".repeat(200)).error, "texte illisible");
  });
});

describe("selectTop", () => {
  it("garde une annonce par société et deux par famille", () => {
    const selected = selectTop([
      candidate("A", 70, "resultats"),
      candidate("A", 65, "contrat"),
      candidate("B", 60, "resultats"),
      candidate("C", 55, "resultats"),
      candidate("D", 50, "crise"),
    ]);
    assert.deepEqual(
      selected.map(({ company }) => company),
      ["A", "B", "D"],
    );
  });

  it("s'arrête à 5 annonces, toutes au-dessus du seuil", () => {
    const families: FamilyId[] = [
      "crise",
      "offre_ma",
      "resultats",
      "contrat",
      "capital",
      "dette",
    ];
    const selected = selectTop([
      ...families.map((family, i) => candidate(`S${i}`, 60, family)),
      candidate("Sous le seuil", 44, "autre"),
    ]);
    assert.equal(selected.length, 5);
    assert.ok(!selected.some(({ company }) => company === "Sous le seuil"));
  });

  it("écarte un document illisible", () => {
    const selected = selectTop([
      candidate("A", 70, "crise", { textError: "texte illisible" }),
      candidate("B", 50, "crise"),
    ]);
    assert.deepEqual(
      selected.map(({ company }) => company),
      ["B"],
    );
  });

  it("départage les notes égales par le nombre de chiffres", () => {
    const [first] = selectTop([
      candidate("A", 60, "resultats", { figureCount: 2 }),
      candidate("B", 60, "resultats", { figureCount: 40 }),
    ]);
    assert.equal(first.company, "B");
  });
});
