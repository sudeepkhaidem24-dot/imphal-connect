create extension if not exists pgcrypto;

create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text,phone text,role text not null default 'customer' check(role in('customer','business','admin')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.businesses(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,name text not null,slug text unique not null,category text not null default 'Services',description text,phone text,whatsapp text,address text,city text not null default 'Imphal',latitude double precision,longitude double precision,logo_url text,cover_url text,is_verified boolean not null default false,is_published boolean not null default false,plan text not null default 'free' check(plan in('free','pro','elite')),subscription_status text not null default 'inactive',subscription_id text unique,subscription_current_end timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
-- Extended business profile fields for production owner editing.
alter table public.businesses add column if not exists opening_hours jsonb not null default '{}'::jsonb;
alter table public.businesses add column if not exists website text;
alter table public.businesses add column if not exists instagram_url text;
alter table public.businesses add column if not exists gallery_urls jsonb not null default '[]'::jsonb;
create table if not exists public.business_reviews(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,rating integer not null check(rating between 1 and 5),body text not null check(char_length(body) between 2 and 2000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(business_id,user_id));
create index if not exists business_reviews_business_idx on public.business_reviews(business_id,created_at desc);
alter table public.business_reviews enable row level security;
drop policy if exists "reviews public read published" on public.business_reviews;create policy "reviews public read published" on public.business_reviews for select to anon,authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.is_published=true));
drop policy if exists "reviews own insert" on public.business_reviews;create policy "reviews own insert" on public.business_reviews for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.businesses b where b.id=business_id and b.is_published=true));
drop policy if exists "reviews own update" on public.business_reviews;create policy "reviews own update" on public.business_reviews for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "reviews own delete" on public.business_reviews;create policy "reviews own delete" on public.business_reviews for delete to authenticated using(auth.uid()=user_id);
grant select on public.business_reviews to anon,authenticated;grant insert,update,delete on public.business_reviews to authenticated;

create table if not exists public.business_items(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,name text not null,price numeric(12,2),description text,image_url text,is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.business_stories(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,title text,image_url text,expires_at timestamptz not null default(now()+interval '24 hours'),created_at timestamptz not null default now());
create table if not exists public.business_offers(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,title text not null,description text,discount_text text,expires_at timestamptz,is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.business_analytics(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,event_type text not null,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create table if not exists public.funding_applications(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,owner_id uuid not null references public.profiles(id) on delete cascade,amount numeric(14,2) not null,purpose text not null,tenure text,status text not null default 'submitted' check(status in('submitted','under_review','approved','rejected','disbursed','closed')),reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.business_leads(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,customer_id uuid references public.profiles(id) on delete set null,customer_name text not null,customer_phone text,customer_email text,message text not null,source text not null default 'business_profile',status text not null default 'new' check(status in('new','contacted','qualified','closed','spam')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.payment_events(id uuid primary key default gen_random_uuid(),event_name text not null,provider_ref text,payload jsonb not null,created_at timestamptz not null default now());
create unique index if not exists businesses_owner_unique_idx on public.businesses(owner_id);create index if not exists businesses_owner_idx on public.businesses(owner_id);create index if not exists items_business_idx on public.business_items(business_id);create index if not exists stories_business_idx on public.business_stories(business_id);create index if not exists stories_expiry_idx on public.business_stories(expires_at);create index if not exists offers_business_idx on public.business_offers(business_id);create index if not exists analytics_business_idx on public.business_analytics(business_id,event_type,created_at);create index if not exists funding_owner_idx on public.funding_applications(owner_id,status);create index if not exists leads_business_idx on public.business_leads(business_id,status,created_at);

alter table public.profiles enable row level security;alter table public.businesses enable row level security;alter table public.business_items enable row level security;alter table public.business_stories enable row level security;alter table public.business_offers enable row level security;alter table public.business_analytics enable row level security;alter table public.funding_applications enable row level security;alter table public.payment_events enable row level security;alter table public.business_leads enable row level security;

drop policy if exists "profiles own read" on public.profiles;create policy "profiles own read" on public.profiles for select using(auth.uid()=id);
drop policy if exists "profiles own update" on public.profiles;create policy "profiles own update" on public.profiles for update using(auth.uid()=id);
drop policy if exists "businesses public read published" on public.businesses;create policy "businesses public read published" on public.businesses for select using(is_published=true);
drop policy if exists "businesses owner read" on public.businesses;create policy "businesses owner read" on public.businesses for select using(auth.uid()=owner_id);
drop policy if exists "businesses owner insert" on public.businesses;create policy "businesses owner insert" on public.businesses for insert with check(auth.uid()=owner_id);
drop policy if exists "businesses owner update" on public.businesses;create policy "businesses owner update" on public.businesses for update using(auth.uid()=owner_id);
drop policy if exists "items public read active" on public.business_items;create policy "items public read active" on public.business_items for select using(is_active=true);
drop policy if exists "items owner write" on public.business_items;create policy "items owner write" on public.business_items for all using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())) with check(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));
drop policy if exists "stories public read active" on public.business_stories;create policy "stories public read active" on public.business_stories for select using(expires_at>now());
drop policy if exists "stories owner write" on public.business_stories;create policy "stories owner write" on public.business_stories for all using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())) with check(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));
drop policy if exists "offers public read active" on public.business_offers;create policy "offers public read active" on public.business_offers for select using(is_active=true and (expires_at is null or expires_at>now()));
drop policy if exists "offers owner write" on public.business_offers;create policy "offers owner write" on public.business_offers for all using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())) with check(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));
drop policy if exists "analytics owner read" on public.business_analytics;create policy "analytics owner read" on public.business_analytics for select using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));
drop policy if exists "funding owner read" on public.funding_applications;create policy "funding owner read" on public.funding_applications for select using(auth.uid()=owner_id);
drop policy if exists "funding owner insert" on public.funding_applications;create policy "funding owner insert" on public.funding_applications for insert with check(auth.uid()=owner_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email));return new;end;$$;
drop trigger if exists on_auth_user_created on auth.users;create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
insert into storage.buckets(id,name,public) values('business-media','business-media',true) on conflict(id) do update set public=true;
drop policy if exists "business media upload own folder" on storage.objects;create policy "business media upload own folder" on storage.objects for insert to authenticated with check(bucket_id='business-media' and(storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "business media read public" on storage.objects;create policy "business media read public" on storage.objects for select to public using(bucket_id='business-media');
drop policy if exists "business media delete own folder" on storage.objects;create policy "business media delete own folder" on storage.objects for delete to authenticated using(bucket_id='business-media' and(storage.foldername(name))[1]=auth.uid()::text);


drop policy if exists "leads owner read" on public.business_leads;create policy "leads owner read" on public.business_leads for select using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));
drop policy if exists "leads owner update" on public.business_leads;create policy "leads owner update" on public.business_leads for update using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())) with check(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));

-- Payment provider migration: keep existing events while moving from Razorpay to Cashfree.
alter table public.payment_events add column if not exists provider_ref text;

create table if not exists public.payment_intents(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 plan text not null check(plan in('pro','elite')),
 amount numeric(12,2) not null,
 status text not null default 'pending' check(status in('pending','paid','expired','cancelled')),
 provider_ref text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 paid_at timestamptz
);
create unique index if not exists payment_intents_provider_ref_unique_idx on public.payment_intents(provider_ref) where provider_ref is not null;
create index if not exists payment_intents_user_status_idx on public.payment_intents(user_id,status,created_at);
alter table public.payment_intents enable row level security;
