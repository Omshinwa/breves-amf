create table publications (
  id            text primary key,              -- uin_idt_uin
  published_at  timestamptz not null,          -- uin_dat_mar si valide, sinon uin_dat_amf (UTC)
  company       text not null,                 -- identificationsociete_iso_nom_soc
  isin          text,                          -- null si 999999999999
  lei           text,
  ticker        text,                          -- null si 99999999
  is_cac40      boolean,                       -- null = inconnu, pas « non »
  title         text,
  type_code     text,                          -- informationdeposee_inf_stp_pri, ex. 001007
  type_codes    text[] not null default '{}',  -- informationdeposee_inf_stp_inf normalisé
  type          text,                          -- type_d_information (peut être vide)
  subtype       text,                          -- sous_type_d_information (peut être vide)
  lang          text,                          -- 'fr' / 'en'
  status        text,                          -- informationdeposee_inf_upg_inf_inf_upg_sts
  pdf_url       text unique,                   -- url_de_recuperation
  group_id      text,                          -- regroupement FR / EN et dépôts en double, calculé à l'import
  raw           jsonb not null,                -- la ligne API complète
  ingested_at   timestamptz not null default now()
);

create index on publications (published_at desc);
create index on publications (company);
create index on publications (type_code);
create index on publications (group_id);

alter table publications enable row level security;
create policy "lecture publique" on publications
  for select to anon using (true);

-- Texte des documents utiles à la sélection : titres génériques et annonces les
-- mieux notées. text reste vide si le document n'a pas pu être lu.
create table publication_texts (
  publication_id  text primary key references publications (id) on delete cascade,
  text            text,
  head            text,                          -- début du document, remplace un titre générique
  figure_count    integer not null default 0,    -- départage les notes égales
  error           text,                          -- motif si le texte est inexploitable
  extracted_at    timestamptz not null default now()
);

alter table publication_texts enable row level security;
create policy "lecture publique" on publication_texts
  for select to anon using (true);

-- Brèves générées par scripts/generate-briefs.ts. Le lien vers le document vient
-- de publications.pdf_url, pas du LLM.
create table briefs (
  publication_id  text primary key references publications (id) on delete cascade,
  title           text not null,
  body            text not null,
  figures         jsonb not null default '[]',   -- [{ label, value }], repris de body
  model           text not null,                 -- le modèle qui a répondu, repli compris
  generated_at    timestamptz not null default now()
);

alter table briefs enable row level security;
create policy "lecture publique" on briefs
  for select to anon using (true);
