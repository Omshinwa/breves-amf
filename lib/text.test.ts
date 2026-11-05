import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentTitle } from "./text";

describe("documentTitle", () => {
  it("saute la pagination, la mention du genre et la date", () => {
    assert.equal(
      documentTitle(
        [
          "1 / 2",
          "COMMUNIQUE DE PRESSE",
          "Revenus locatifs du 3ème trimestre 2026 stables à 8,7 M€",
          "Paris, le 3 novembre 2026 – 18h00 (CET) :",
        ].join("\n"),
      ),
      "Revenus locatifs du 3ème trimestre 2026 stables à 8,7 M€",
    );
  });

  it("saute l'adresse et les mentions légales", () => {
    assert.equal(
      documentTitle(
        [
          "Société anonyme au capital de 93 886 501 euros",
          "Siège social : 16-18, rue du Quatre-Septembre",
          "75002 Paris",
          "424 064 707 R.C.S. Paris",
          "Informations relatives au nombre total de droits de vote",
          "et d’actions composant le capital social",
          "(Article 223-16 du règlement général)",
        ].join("\n"),
      ),
      "Informations relatives au nombre total de droits de vote et d’actions composant le capital social",
    );
  });

  it("rattache les lignes d'un titre coupé", () => {
    assert.equal(
      documentTitle(
        [
          "ABIONYX Pharma signe un partenariat avec le CHU",
          "de Lille – Centre de Traitement des Brûlés et service de",
          "Médecine Intensive",
          "• Les grands brûlés et les patients de médecine intensive",
        ].join("\n"),
      ),
      "ABIONYX Pharma signe un partenariat avec le CHU de Lille – Centre de Traitement des Brûlés et service de Médecine Intensive",
    );
  });

  it("recolle un mot coupé par un tiret", () => {
    assert.equal(
      documentTitle("Premier hôpital de la région du Moyen-\nOrient et d'Afrique"),
      "Premier hôpital de la région du Moyen-Orient et d'Afrique",
    );
  });

  it("rattache les lignes d'un titre en capitales", () => {
    assert.equal(
      documentTitle(
        "SUCCES DE L'OFFRE DE RACHAT\nSUR LES OBLIGATIONS DE PERNOD RICARD\nPernod Ricard annonce aujourd'hui le succès",
      ),
      "SUCCES DE L'OFFRE DE RACHAT SUR LES OBLIGATIONS DE PERNOD RICARD",
    );
  });

  it("ne rattache pas le sous-titre", () => {
    assert.equal(
      documentTitle(
        "Résultats du troisième trimestre 2026\nTotalEnergies tire une nouvelle fois parti de son modèle intégré",
      ),
      "Résultats du troisième trimestre 2026",
    );
  });

  it("ne prend pas une liste à puces ou un paragraphe pour un titre", () => {
    assert.equal(
      documentTitle("● Chiffre d’affaires du T3 2026 à 68,7 M€, en croissance"),
      null,
    );
    assert.equal(
      documentTitle(
        "FDJ UNITED is a leading betting and gaming operator in Europe, with a vast portfolio of iconic brands and a reputation for technological excellence.",
      ),
      null,
    );
  });

  it("renvoie null sans texte", () => {
    assert.equal(documentTitle(null), null);
  });
});
