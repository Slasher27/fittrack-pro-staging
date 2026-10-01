-- Body: weight and measurements, progress photos and the private `photos` bucket (ARCHITECTURE §3, §4).

create table public.body_metrics (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade deferrable initially deferred,
  date date not null,
  weight_kg numeric(6,2) check (weight_kg > 0),
  waist_cm numeric(5,1) check (waist_cm > 0),
  chest_cm numeric(5,1) check (chest_cm > 0),
  arm_cm numeric(5,1) check (arm_cm > 0),
  thigh_cm numeric(5,1) check (thigh_cm > 0),
  steps int check (steps >= 0),
  notes text,
  up bigint not null default (extract(epoch from now()) * 1000)::bigint,
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index on public.body_metrics (user_id, synced_at);
create index on public.body_metrics (user_id, date);

create table public.photos (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade deferrable initially deferred,
  taken_on date not null,
  storage_path text not null,     -- '{user_id}/{id}.jpg' in the photos bucket
  pose text,
  note text,
  remote boolean not null default false,   -- the blob is in Storage
  checkin_id uuid,                -- plain uuid until Phase 4 adds the FK to checkins
  up bigint not null default (extract(epoch from now()) * 1000)::bigint,
  synced_at timestamptz not null default now(),
  deleted boolean not null default false,
  check (storage_path like user_id::text || '/%')
);
create index on public.photos (user_id, synced_at);

select private.owner_only('public.body_metrics');
select private.owner_only('public.photos');
select private.enable_sync('public.body_metrics');
select private.enable_sync('public.photos');

-- Private bucket: {user_id}/{photo_id}.jpg. Owner only (trainer access arrives with Phase 4 consent).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']);

create policy photos_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
