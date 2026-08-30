alter table public.bxn_members
  add column if not exists sms_referral_optin boolean not null default false;

alter table public.bxn_members
  alter column sms_referral_optin set default false;

update public.bxn_members
set sms_referral_optin = false
where sms_referral_optin is null;

alter table public.bxn_members
  alter column sms_referral_optin set not null;
