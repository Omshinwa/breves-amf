This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Difficultés du jeu de données

Flux AMF de info-financiere.gouv.fr, importé dans `scripts/import.ts`.

- **Dates de marché fausses :** `uin_dat_mar` peut valoir 8888, 9999 ou une mauvaise année, on revient alors à `uin_dat_amf`.
- **Décalage horaire :** les dates du 26 au 30/10/2026 sont 1 h trop tôt et ne sont pas corrigées.
- **Valeurs factices :** l'ISIN `999999999999` et le ticker `99999999` signifient « absent ».
- **Format variable :** `informationdeposee_inf_stp_inf` contient une chaîne simple pour un code et une chaîne JSON pour plusieurs.
- **CAC 40 incomplet :** `cac40` vide signifie « inconnu », pas « hors CAC 40 ».
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
