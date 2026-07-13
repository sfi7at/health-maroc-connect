
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.push_dispatch_config (
  id boolean primary key default true check (id),
  base_url text not null,
  secret text not null,
  updated_at timestamptz not null default now()
);
revoke all on private.push_dispatch_config from public, anon, authenticated;

insert into private.push_dispatch_config (id, base_url, secret)
values (
  true,
  'https://health-maroc-connect.lovable.app',
  'ffcb8a2391424b9270c670d1575d9d764706024c612b1791e43150d84b214449'
)
on conflict (id) do update
  set base_url = excluded.base_url,
      secret = excluded.secret,
      updated_at = now();

create or replace function public.dispatch_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  cfg record;
begin
  begin
    select base_url, secret into cfg from private.push_dispatch_config where id = true;
  exception when others then
    return new;
  end;

  if cfg.base_url is null or cfg.secret is null then
    return new;
  end if;

  -- Never block the notification insert.
  begin
    perform net.http_post(
      url := cfg.base_url || '/api/public/notify-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', cfg.secret
      ),
      body := jsonb_build_object('notification_id', new.id),
      timeout_milliseconds := 5000
    );
  exception when others then
    -- swallow
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_dispatch_notification_push on public.notifications;
create trigger trg_dispatch_notification_push
after insert on public.notifications
for each row execute function public.dispatch_notification_push();

revoke execute on function public.dispatch_notification_push() from public, anon, authenticated;
