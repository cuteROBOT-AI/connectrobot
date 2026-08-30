create table if not exists public.networking_referral_notifications (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.networking_export_snapshots(id) on delete cascade,
  recipient_type text not null,
  member_id uuid references public.bxn_members(id) on delete set null,
  contact_id uuid references public.networking_session_contacts(id) on delete set null,
  recipient_key text not null,
  destination_phone text not null,
  notification_type text not null,
  status text not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint networking_referral_notifications_recipient_type_check
    check (recipient_type in ('user', 'member')),
  constraint networking_referral_notifications_status_check
    check (status in ('pending', 'sent', 'failed')),
  constraint networking_referral_notifications_recipient_target_check
    check (
      (recipient_type = 'user' and contact_id is not null and member_id is null)
      or
      (recipient_type = 'member' and member_id is not null and contact_id is null)
    ),
  constraint networking_referral_notifications_snapshot_recipient_unique
    unique (snapshot_id, notification_type, recipient_key)
);

create index if not exists networking_referral_notifications_snapshot_idx
  on public.networking_referral_notifications (snapshot_id, created_at desc);

create index if not exists networking_referral_notifications_member_idx
  on public.networking_referral_notifications (member_id)
  where member_id is not null;

create index if not exists networking_referral_notifications_contact_idx
  on public.networking_referral_notifications (contact_id)
  where contact_id is not null;

alter table public.networking_referral_notifications enable row level security;

revoke all on table public.networking_referral_notifications from anon, authenticated;
grant select, insert, update on table public.networking_referral_notifications to service_role;
