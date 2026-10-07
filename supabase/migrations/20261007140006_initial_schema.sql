-- Risoform's browser uses a publishable key. RLS is the tenant boundary.
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  theme jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  thank_you text not null default 'Thanks for sharing your thoughts!',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null,
  workspace_id uuid not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  field_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(field_snapshot) = 'array'),
  submitted_at timestamptz not null default now(),
  foreign key (form_id, workspace_id) references public.forms(id, workspace_id) on delete cascade
);

create index forms_workspace_updated_idx on public.forms (workspace_id, updated_at desc);
create index responses_form_submitted_idx on public.responses (form_id, submitted_at desc);

alter table public.workspaces enable row level security;
alter table public.forms enable row level security;
alter table public.responses enable row level security;

revoke all on public.workspaces, public.forms, public.responses from anon, authenticated;
grant select, insert, update, delete on public.workspaces, public.forms to authenticated;
grant select on public.forms to anon;
grant select on public.responses to authenticated;

create policy "owners read workspaces" on public.workspaces for select to authenticated
  using (created_by = (select auth.uid()));
create policy "owners create workspaces" on public.workspaces for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "owners update workspaces" on public.workspaces for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "owners delete workspaces" on public.workspaces for delete to authenticated
  using (created_by = (select auth.uid()));

create policy "published forms are public" on public.forms for select to anon
  using (status = 'published');
create policy "owners read forms" on public.forms for select to authenticated
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = (select auth.uid())));
create policy "owners create forms" on public.forms for insert to authenticated
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = (select auth.uid())));
create policy "owners update forms" on public.forms for update to authenticated
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = (select auth.uid())))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = (select auth.uid())));
create policy "owners delete forms" on public.forms for delete to authenticated
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = (select auth.uid())));

-- Responses are created only by the validated server endpoint.
create policy "owners read responses" on public.responses for select to authenticated
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = (select auth.uid())));

insert into storage.buckets (id, name, public, file_size_limit)
values ('response-files', 'response-files', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

-- Object paths start with the workspace id. Public download and listing are denied.
create policy "owners can read response files" on storage.objects for select to authenticated
  using (
    bucket_id = 'response-files'
    and exists (
      select 1 from public.workspaces w
      where w.id::text = (storage.foldername(storage.objects.name))[1]
      and w.created_by = (select auth.uid())
    )
  );
