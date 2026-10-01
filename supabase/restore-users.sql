begin;

insert into public.users (id, name, username, email, password, role, is_pending)
values
  (gen_random_uuid()::text, 'Master', 'Master', 'master@arcelormittal.com', '', 'analista', true),
  (gen_random_uuid()::text, 'qa-invite-1789969993', 'qa-invite-1789969993', 'qa-invite-1789969993@example.com', '', 'vendedor', true),
  (gen_random_uuid()::text, 'juan', 'juan', '97627770@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Allan Delon', 'Allan Delon', '97619570@amdistribuicao.com.br', '', 'analista', true),
  (gen_random_uuid()::text, 'Pedro Viana', 'Pedro Viana', 'pedro.filho@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Vinicius', 'Vinicius', 'vinicius.santos@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Pedro Lucas', 'Pedro Lucas', 'pedro.ribeiro@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Lucas', 'Lucas', 'lucas.ramalho@amdistribuicao.com.br', '', 'analista', true),
  (gen_random_uuid()::text, 'Eduardo Mavromati', 'Eduardo Mavromati', 'eduardo.mk.filho@amdistribuicao.com.br', '', 'analista', true),
  (gen_random_uuid()::text, 'Geovanna', 'Geovanna', 'geovana.sousa@amdistribuicao.com.br', '', 'analista', true),
  (gen_random_uuid()::text, 'Pablo', 'Pablo', 'pablo.soares@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Fernanda Andrade', 'Fernanda Andrade', 'fernanda.a.nascimento@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Maria Aparecida', 'Maria Aparecida', 'maria.bruno@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Mirian', 'Mirian', 'mirian.caracas@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Rodrigo', 'Rodrigo', 'rodrigo.c.almeida@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Allana', 'Allana', 'allana.nunes@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Bruna Camila', 'Bruna Camila', 'bruna.cr.lima@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Danilo', 'Danilo', 'deiver.guimaraes@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Fernanda Rodrigues', 'Fernanda Rodrigues', 'fernanda.r.santos@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Davi Reinke', 'Davi Reinke', 'davi.oliveira@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Jeferson', 'Jeferson', 'jeferson.ribeiro@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Maria Eduarda', 'Maria Eduarda', 'maria.silva@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Nilmar', 'Nilmar', 'nilmar.souza@amdistribuicao.com.br', '', 'vendedor', true),
  (gen_random_uuid()::text, 'Tulio', 'Tulio', 'tulio.oliveira@amdistribuicao.com.br', '', 'vendedor', true)
on conflict (email) do update set
  name = excluded.name,
  username = excluded.username,
  password = '',
  role = excluded.role,
  is_pending = true;

commit;
