// Composition du CAC 40 depuis le 22/12/2025, inchangée à la révision de septembre
// 2026. Prochaine révision le 10/12/2026.
// Le champ cac40 du flux n'est pas utilisable : il marque encore Alstom et Vivendi,
// sortis en 2024, et pas Hermès, Thales ou Société Générale.
const CAC40_ISINS = new Set([
  "FR0000120404", // Accor
  "FR0000120073", // Air Liquide
  "NL0000235190", // Airbus
  "LU1598757687", // ArcelorMittal
  "FR0000120628", // AXA
  "FR0000131104", // BNP Paribas
  "FR0000120503", // Bouygues
  "FR0006174348", // Bureau Veritas
  "FR0000125338", // Capgemini
  "FR0000120172", // Carrefour
  "FR0000045072", // Crédit Agricole
  "FR0000120644", // Danone
  "FR0014003TT8", // Dassault Systèmes
  "FR0000130452", // Eiffage
  "FR0010208488", // Engie
  "FR0000121667", // EssilorLuxottica
  "FR0014000MR3", // Eurofins Scientific
  "NL0006294274", // Euronext
  "FR0000052292", // Hermès International
  "FR0000121485", // Kering
  "FR0010307819", // Legrand
  "FR0000120321", // L'Oréal
  "FR0000121014", // LVMH
  "FR001400AJ45", // Michelin
  "FR0000133308", // Orange
  "FR0000120693", // Pernod Ricard
  "FR0000130577", // Publicis Groupe
  "FR0000131906", // Renault
  "FR0000073272", // Safran
  "FR0000125007", // Saint-Gobain
  "FR0000120578", // Sanofi
  "FR0000121972", // Schneider Electric
  "FR0000130809", // Société Générale
  "NL00150001Q9", // Stellantis
  "NL0000226223", // STMicroelectronics
  "FR0000121329", // Thales
  "FR0000120271", // TotalEnergies
  "FR0013326246", // Unibail-Rodamco-Westfield
  "FR0000124141", // Veolia Environnement
  "FR0000125486", // Vinci
]);

export function isCac40(isin: string | null): boolean {
  return isin !== null && CAC40_ISINS.has(isin);
}
