create extension if not exists pgcrypto;

create table if not exists public.networking_session_contacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.networking_sessions(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint networking_session_contacts_channel_check
    check (email is not null or phone is not null)
);

create unique index if not exists networking_session_contacts_session_email_idx
  on public.networking_session_contacts (session_id, lower(email))
  where email is not null;

create unique index if not exists networking_session_contacts_session_phone_idx
  on public.networking_session_contacts (session_id, phone)
  where phone is not null;

alter table public.networking_session_contacts enable row level security;

revoke all on table public.networking_session_contacts from anon, authenticated;
grant select, insert, update on table public.networking_session_contacts to service_role;

create table if not exists public.networking_export_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.networking_sessions(id) on delete cascade,
  created_by_contact_id uuid references public.networking_session_contacts(id) on delete set null,
  public_token text not null unique,
  board_fingerprint text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint networking_export_snapshots_public_token_length_check
    check (length(public_token) >= 24),
  constraint networking_export_snapshots_session_fingerprint_unique
    unique (session_id, board_fingerprint)
);

create index if not exists networking_export_snapshots_session_created_idx
  on public.networking_export_snapshots (session_id, created_at desc);

create index if not exists networking_export_snapshots_public_token_idx
  on public.networking_export_snapshots (public_token);

alter table public.networking_export_snapshots enable row level security;

revoke all on table public.networking_export_snapshots from anon, authenticated;
grant select, insert on table public.networking_export_snapshots to service_role;

create or replace function public.prevent_networking_export_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'networking_export_snapshots are immutable';
end;
$$;

revoke all on function public.prevent_networking_export_snapshot_mutation() from public;

drop trigger if exists prevent_networking_export_snapshot_update
  on public.networking_export_snapshots;
create trigger prevent_networking_export_snapshot_update
  before update on public.networking_export_snapshots
  for each row execute function public.prevent_networking_export_snapshot_mutation();

drop trigger if exists prevent_networking_export_snapshot_delete
  on public.networking_export_snapshots;
create trigger prevent_networking_export_snapshot_delete
  before delete on public.networking_export_snapshots
  for each row execute function public.prevent_networking_export_snapshot_mutation();
