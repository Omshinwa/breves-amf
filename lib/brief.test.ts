import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { briefPrompt, countWords, lengthFeedback, type Brief } from "./brief";

function brief(words: number): Brief {
  return { title: "Titre", body: "mot ".repeat(words), figures: [] };
}

describe("countWords", () => {
  it("compte une élision comme un seul mot", () => {
    assert.equal(countWords("l'acquisition d’Acme"), 2);
  });

  it("ignore la ponctuation isolée", () => {
    assert.equal(countWords("Résultats – « record » : 12 %"), 3);
  });

  it("gère les espaces insécables et les retours à la ligne", () => {
    assert.equal(countWords("12 M€\n\nde chiffre"), 4);
  });

  it("renvoie zéro pour un texte vide", () => {
    assert.equal(countWords(""), 0);
  });
});

describe("lengthFeedback", () => {
  it("accepte les bornes", () => {
    assert.equal(lengthFeedback(brief(100)), null);
    assert.equal(lengthFeedback(brief(150)), null);
  });

  it("donne le nombre de mots mesuré hors des bornes", () => {
    assert.match(lengthFeedback(brief(99))!, /99 mots/);
    assert.match(lengthFeedback(brief(151))!, /151 mots/);
  });
});

describe("briefPrompt", () => {
  it("isole le document et remplace un titre absent", () => {
    const prompt = briefPrompt({
      company: "Acme",
      title: null,
      day: "2026-11-03",
      text: "Texte du PDF",
    });
    assert.match(prompt, /Titre du dépôt : sans titre/);
    assert.match(prompt, /<document>\nTexte du PDF\n<\/document>/);
  });
});
