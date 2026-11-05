# Brèves AMF

Application web qui récupère les publications réglementées des sociétés cotées sur [info-financiere.gouv.fr](https://www.info-financiere.gouv.fr), sélectionne celles qui méritent un article et en tire des brèves sourcées.

- **Application :** <https://breves-amf.vercel.app>
- **Code :** <https://github.com/omshinwa/breves-amf>

## Choix techniques

| Choix | Raison |
|---|---|
| **Next.js 16, React 19, Tailwind, Vercel** | Stack appréciée par le sujet. Les composants serveur lisent la base et les filtres vivent dans l'URL : une vue filtrée se partage par lien. |
| **Supabase (Postgres)** | Trois tables : `publications`, `publication_texts`, `briefs`. Le RLS autorise la lecture publique ; seuls les scripts écrivent, avec la clé secrète. |
| **Une ligne d'API = une ligne en base** | Colonnes typées pour ce qui sert, ligne complète dans `raw`. Le nettoyage a lieu une seule fois, à l'import. L'upsert sur `id` permet de relancer sans doublon. |
| **Trois scripts lancés à la main** | Le site ne fait que lire : sans route API ni server action, `import`, `extract` et `briefs` sont impossibles à appeler depuis le site. |
| **`unpdf` pour lire les PDF** | Extraction locale, sans LLM. Les PDF ne sont pas conservés, leur texte l'est. |
| **Score à règles plutôt que classement par LLM** | Reproductible, testable, explicable ligne par ligne et peu coûteux. |
| **Titre du PDF extrait** | Un titre générique est remplacé par celui du document : « Informations privilégiées / Autres communiqués » n'apporte rien à un lecteur. Une colonne dédiée deviendra préférable si le volume grandit. |
| **Claude Haiku 5.5** | Modèle léger, car la tâche est simple : résumer un document. J'avais déjà utilisé DeepSeek et je sais qu'il a parfois du mal avec le français. |

## Structure des données

Chaque dépôt de publication ajoute une ligne au jeu de données `flux-amf-new-prod`. Celui-ci contient les métadonnées : qui, quand, quel type. L'un des champs donne le lien vers le PDF.

J'ai brièvement lu la description du jeu de données via l'API Catalog, puis j'ai demandé à l'IA de m'en faire un résumé.

Le type est choisi par la société. `informationdeposee_inf_stp_pri` est un code à 6 chiffres, que le filtre regroupe en 13 familles lisibles (`lib/info-types.ts`). La société applique elle-même l'étiquette « Informations privilégiées », qui couvre 328 publications sur 696 : ce libellé ne suffit pas à trier. Le titre peut aussi contredire le code.

Il y a parfois des doublons et des versions FR et EN d'une même annonce. J'ai essayé de les rassembler sous le même `group_id` (même société, même type, moins de 3 h d'écart).

`uin_dat_mar`, qui indique quand l'information est diffusée sur les marchés, peut valoir 8888, 9999 ou une mauvaise année.

L'ISIN `999999999999` et le ticker `99999999` signifient « absent » : ils sont convertis en `null`.

Le champ `cac40` marque encore Alstom et Vivendi, mais pas Hermès ni Société Générale. La composition réelle est établie par ISIN (`lib/cac40.ts`).

## Critère de sélection

Une annonce mérite un article si c'est un **événement**, si elle **compte pour un lecteur** et si son **document est exploitable**. La logique est dans `lib/selection.ts`, testée par `npm test`.

1. **Exclure la routine :** par code (droits de vote, rachats, rapports, franchissements de seuil…), par titre car le `type_code` peut se tromper, et par date si l'annonce est déposée plus de 7 jours après sa diffusion (pas de brève sur une vieille nouvelle).
2. **Lire le début du PDF** quand le titre est générique.
3. **Noter sur 100 :** événement + audience + signaux du titre.
   - Événement : `crise` 50, `offre_ma` 45, `capital` 35, `resultats` et `clinique` 30, `alerte` 25, `gouvernance` et `contrat` 20, `dette` 15, `autre` 5.
   - Audience : CAC 40 25, valeur moyenne 10, petite valeur 0.
   - Signaux : objectifs modifiés 15 ou ton marqué 5, montant de 100 M€ ou plus 10.
4. **Écarter les documents illisibles :** leurs chiffres ne seraient pas vérifiables.
5. **Varier :** à partir de 45 points, une annonce mérite un article. `npm run briefs` traite les 5 meilleures, avec 1 annonce par société et 2 par famille au maximum.

**Limites :** les mots-clés peuvent se tromper de famille (l'achat de 376 bitcoins par Capital B passe pour une acquisition), les annonces en anglais seul sont mal classées, et sans consensus ni cours de bourse la surprise reste invisible.

## Contrôle des chiffres

**Faute de temps, le contrôle n'est ni automatisé ni intégré à l'application.**

### Comment je l'aurais fait

Le texte du PDF est enregistré dans `publication_texts.text` si le score de l'annonce atteint le seuil.

Un parsing automatique comparerait les chiffres de la brève générée par le LLM à ceux du document. Le contrôle tiendrait dans `lib/verify.ts`.

1. **Extraire** par expressions régulières les chiffres du titre, du corps et des chiffres clés : valeur, unité et signe.
2. **Normaliser** la brève et le document de la même façon : espaces, virgule ou point décimal, unités. « 1,2 milliard » et « 1.2 billion » deviennent la même valeur.
3. **Chercher** chaque valeur dans `publication_texts.text`.
4. **Donner un statut** à chaque chiffre : `retrouvé`, `non retrouvé`, ou `non vérifiable` si le texte manque.
5. **Corriger :** un chiffre `non retrouvé` serait renvoyé au modèle, comme l'écart de longueur aujourd'hui. S'il persistait, la brève resterait publiée avec un avertissement ?

### Ce que ce contrôle ne prouve pas

Le parsing montre qu'un nombre existe dans le document, pas qu'il est bien utilisé : un « 5 % » peut venir d'un autre tableau.

## Prompts clés

Ces trois prompts ont été donnés à Claude Code pendant le développement.

**Comprendre les données avant de coder.**

> crée moi un fichier flux-amf-new-prod.md
> qui me décrie les différents fields que ça a et leur signification

Ce document est devenu ma référence pour comprendre la structure des données importées et décider de ce qu'on gardait ou non du jeu de données d'origine.

**Demander des options plutôt qu'une solution.**

> think of a way we could select/rank publications. write me a heuristic.md giving me propositions for your choices.

Quatre approches ont été comparées, du simple filtre au classement par LLM, et le score a été essayé sur trois semaines réelles. J'ai lu l'avis de l'IA, écarté le classement par LLM, puis fait implémenter le plan retenu.

**Poser ses contraintes avant de choisir un modèle.**

> Implemente le "Pour 3 à 5 publications retenues, générer avec un LLM une brève de 100 à 150 mots : titre, faits clés, chiffres, lien vers le document source."
>
> Quel LLM modèle tu penses je devrais utiliser? sachant que la plupart des pdfs sont en francais. J'ai une clé d'API pour deepseek mais je sais que il n'est pas très doué avec le français.

L'IA a d'abord proposé Claude Opus 5.5, en signalant qu'elle était juge et partie et qu'elle n'avait trouvé aucun benchmark pour confirmer mon impression sur DeepSeek. J'ai ensuite retenu Claude Haiku 5.5 .


## Erreurs de l'IA détectée

### Scoring qui filtrait trop agressivement

Dans le scoring des publications, l'IA ignorait celles qui n'étaient pas diffusées au marché. Je lui ai demandé de justifier cette règle :
> Par date : non diffusée au marché (année 8888 ou 9999), ou déposée plus de 7 jours après sa diffusion.
L'IA a reconnu que le filtre n'avait « pas de vraie justification » : ces documents restent publics, et « non diffusée » ne veut pas dire « sans intérêt ». Elle a proposé de retirer la règle.

### Soucis de l'UI

L'IA affichait sur le site la formule de calcul du score d'une publication, et le bandeau « À la une » était trop large. J'ai aussi ajouté un fond de couleur pour mieux repérer les publications qui méritent un article.

> Cache la formule. Ne l'affiche pas sur le site, un utilisateur ne veut pas savoir ça.
>
> Rajoute un fond de couleur sur les publications qui mérite un article.
>
> Je n'aime pas le look du bandeau "A la une". Là j'en vois 5 réparti sur 2 lignes. À la place, n'affiche en qu'un seul mais qui défile sur une autre news? Qu'est-ce que t'en penses?

## Améliorations

**En priorité :**

- Intégrer le contrôle des chiffres décrit plus haut.
- Automatiser l'import, l'extraction et les brèves avec une tâche planifiée. Aujourd'hui, la date de début est écrite dans `scripts/import.ts` et tout se lance à la main.
- Filtrer et paginer en SQL. Le site charge toutes les annonces et la page pèse 3,4 Mo.
- Évaluer et améliorer l'heuristique à partir des publications choisies. Par exemple, réserver une place aux petites valeurs ? La sauvegarde d'Advicenne n'entre pas dans le top 5.
- Ajouter le consensus et le cours de bourse pour mesurer la surprise, et rapporter les montants à la taille de la société ?
- Comparer le contenu des fichiers pour confirmer les doublons et les fausses versions anglaises ?

## Temps passé

**Entre 4 et 5 heures.** Cette mesure vient des horodatages de mes sessions Claude Code, sans les pauses de plus de 30 minutes. Elle ne compte ni la rédaction finale de ce README ni le travail hors de ces sessions.

Le début de ce temps a surtout servi à comprendre le sujet et la structure du jeu de données, et à lire certains PDF.
