This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Difficultés du jeu de données

Flux AMF de info-financiere.gouv.fr, importé dans `scripts/import.ts`.

- **Dates de marché fausses :** `uin_dat_mar` peut valoir 8888, 9999 ou une mauvaise année, on revient alors à `uin_dat_amf`.
- **Décalage horaire :** les dates du 26 au 30/10/2026 sont 1 h trop tôt et ne sont pas corrigées.
- **Valeurs factices :** l'ISIN `999999999999` et le ticker `99999999` signifient « absent ».
- **Format variable :** `informationdeposee_inf_stp_inf` contient une chaîne simple pour un code et une chaîne JSON pour plusieurs.
- **CAC 40 périmé :** le champ `cac40` marque encore Alstom et Vivendi, sortis en 2024, et pas Hermès ou Société Générale. L'application utilise la composition réelle par ISIN (`lib/cac40.ts`).
- **LEI manquant :** sur certaines lignes, la société est identifiée par l'ISIN, puis par son nom.
- **Aucun lien FR/EN :** `group_id` est reconstruit à partir de la société, du `type_code` et de l'écart de temps.
- **Écart FR/EN variable :** les deux versions sont souvent simultanées, mais l'écart dépasse parfois 2 h, d'où la fenêtre de 3 h.
- **Fausse paire possible :** sur 6 mois, la fenêtre de 3 h ajoute 21 paires, dont une fausse (Segro).
- **Titres génériques :** « Informations privilégiées / Autres communiqués » ne décrit pas le contenu, il faut ouvrir le PDF.
- **`type_code` imprécis :** une déclaration de droits de vote peut être classée en communiqué général (`001006`, Advicenne).
- **Publications simultanées :** deux documents sans rapport peuvent avoir la même société, le même type et la même heure (Advicenne), le tri par `id` les départage alors sans garantie.
- **Dépôts en double :** un même document peut exister sous deux `id` (Kaufman & Broad, Streamwide), ils partagent donc le même `group_id` si leurs titres et leurs heures sont proches, sans contrôle du contenu.
- **Langue déclarée peu fiable :** une « version EN » peut être le même fichier que la version FR (Crossject, ZCCM).
- **Fichiers non PDF :** `url_de_recuperation` peut pointer vers un `.docx` (Arkéa).

## Sélection des publications

Une annonce mérite un article si c'est un événement, si elle compte pour un lecteur et si son document est exploitable. La logique est dans `lib/selection.ts`, testée par `npm test`.

1. **Exclure la routine :** par code (droits de vote, rachats, rapports, franchissements de seuil…), par titre car le `type_code` se trompe, et par date si l'annonce est déposée plus de 7 jours après sa diffusion.
2. **Lire le début du PDF** quand le titre est générique : TotalEnergies y cache son T3, Advicenne sa sauvegarde.
3. **Noter sur 100 :** événement (`crise` 50, `offre_ma` 45, `capital` 35, `resultats` et `clinique` 30, `alerte` 25, `gouvernance` et `contrat` 20, `dette` 15, `autre` 5) + audience (CAC 40 25, valeur moyenne 10, petite valeur 0) + signaux du titre (objectifs modifiés 15 ou ton marqué 5, montant de 100 M€ ou plus 10).
4. **Écarter les documents illisibles :** les chiffres d'une brève doivent pouvoir être vérifiés.
5. **Varier :** à partir de 45 points, une annonce mérite un article. « À la une » garde les 5 meilleures, une par société et deux par famille.

La note et ses raisons sont affichées dans la liste. Le critère est déterministe : le même flux donne la même sélection, et chaque place s'explique ligne par ligne.

Limites : les mots-clés peuvent se tromper de famille, les annonces en anglais seul sont mal classées, et sans consensus ni cours de bourse la surprise reste invisible.

## Mettre à jour les données

Après avoir appliqué `supabase/schema.sql` :

```bash
npm run import   # publications de l'API info-financière
npm run extract  # texte des PDF utiles à la sélection
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
