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
