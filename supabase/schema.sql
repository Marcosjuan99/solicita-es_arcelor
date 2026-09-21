create table if not exists public.users (
  id text primary key,
  name text not null,
  username text not null unique,
  email text not null unique,
  password text not null default '',
  role text not null check (role in ('analista', 'vendedor')),
  is_pending boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id text primary key,
  unidade text not null,
  vendedor text not null,
  codigo text not null,
  cotacao text,
  descricao text not null,
  volume numeric not null,
  unidade_medida text not null,
  status text not null,
  data timestamptz not null default now(),
  previsao text not null default '-',
  rit text not null default '-',
  observacao text not null default '',
  created_by text references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamptz not null default now(),
  user_id text references public.users(id) on delete set null,
  user_name text not null,
  role text not null check (role in ('analista', 'vendedor')),
  action text not null,
  details text not null,
  request_data jsonb,
  request_owner text,
  request_id text,
  request_code text
);

create table if not exists public.invites (
  token text primary key,
  user_id text not null references public.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  used boolean not null default false
);

create index if not exists requests_status_idx on public.requests(status);
create index if not exists requests_data_idx on public.requests(data desc);
create index if not exists audit_logs_timestamp_idx on public.audit_logs(timestamp desc);

insert into public.users (id, name, username, email, password, role)
values
  ('u-master', 'Master', 'Master', 'master@arcelormittal.com', 'Master001', 'analista')
on conflict (id) do nothing;

delete from public.users
where id in ('u-analista', 'u-vendedor-1', 'u-vendedor-2', '4939c2b9-ff61-4fb2-b75f-1eb41a4b93fb');

insert into public.requests (id, unidade, vendedor, codigo, descricao, volume, unidade_medida, status, data, previsao, rit, observacao)
values
  ('1', '9666', 'Pedro Viana', '214597', 'TB RD G1 21,30X1,55G6000-135-MET', 21, 'KG', 'Nova solicitação', '2026-09-02', '02.09.2026', 'RITM1175999', 'Solicitação aberta pela unidade.'),
  ('2', '9666', 'Pedro Viana', '107225', 'TELA SOLDADA S053 2,45M X 6,00M', 300, 'PC', 'Implantado', '2026-03-08', '28.09.2026', 'RITM1177202', 'Pedido já aprovado e em execução.'),
  ('3', '9666', 'Pedro Lucas', '214497', 'TB RD BQ 50,80X2,00X6000-30', 2000, 'KG', 'Nova solicitação', '2026-09-02', '05.10.2026', 'RITM1176012', 'Demanda nova aguardando análise.'),
  ('4', '9666', 'Miriam', '313828', 'PF I W 200 19,3 A 572 GR50 12M 41', 7, 'PC', 'Solicitação', '2026-09-02', '15.09.2026', 'RITM1177013', 'Aguardando aprovação da matriz.'),
  ('5', '9666', 'Fernanda', '249928', 'TB QD G15X15,0X95G6000-135-MET', 100, 'KG', 'Chegou', '2026-09-04', '15.09.2026', 'RITM1177720', 'Material chegou ao destino.'),
  ('6', '9666', 'Pedro Lucas', '214522', 'TB RD BQ 63,50X2,00X6000-30', 350, 'KG', 'Negado', '2026-09-04', '-', 'RITM1177749', 'Pedido negado por divergência de especificação.')
on conflict (id) do nothing;