
-- =========================================
-- YAMA TOKEN DATABASE v1.0
-- PostgreSQL / Supabase
-- =========================================

create extension if not exists pgcrypto;

-- 1. USER PROFILES
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    locale text default 'en',
    created_at timestamptz default now()
);

-- 2. USER WALLETS
create table if not exists public.wallets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    balance bigint not null default 0 check (balance >= 0),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. CREDIT LEDGER
create table if not exists public.credit_ledger (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    transaction_type text not null
      check (transaction_type in
      ('signup_bonus','purchase','usage','refund','admin_adjustment')),
    amount bigint not null check (amount <> 0),
    balance_after bigint not null check (balance_after >= 0),
    reference_id text,
    description text,
    created_at timestamptz default now()
);

create index if not exists ledger_user_date_idx
on public.credit_ledger(user_id, created_at desc);

-- 4. AI SERVICES
create table if not exists public.ai_services (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    name text not null,
    credit_cost bigint not null check (credit_cost > 0),
    active boolean default true,
    created_at timestamptz default now()
);

insert into public.ai_services (slug, name, credit_cost)
values
 ('chat', 'AI Chat', 10),
 ('translate', 'AI Translate', 5),
 ('writing', 'AI Writing', 8),
 ('code', 'AI Code', 20),
 ('image', 'AI Image', 100)
on conflict (slug) do nothing;

-- 5. AI USAGE
create table if not exists public.ai_usage (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    service_id uuid references public.ai_services(id),
    credits_charged bigint not null check (credits_charged > 0),
    provider_cost numeric(14,6) default 0,
    status text default 'completed',
    request_id text not null,
    created_at timestamptz default now(),
    unique(user_id, request_id)
);

-- 6. CREDIT PACKAGES
create table if not exists public.credit_packages (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    credits bigint not null check (credits > 0),
    price_amount numeric(12,2) not null check (price_amount >= 0),
    currency text default 'USD',
    active boolean default false,
    created_at timestamptz default now()
);

-- 7. PAYMENT ORDERS
create table if not exists public.payment_orders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    package_id uuid references public.credit_packages(id),
    amount numeric(12,2) not null,
    currency text not null default 'USD',
    status text not null default 'pending'
      check (status in ('pending','paid','failed','refunded')),
    provider_reference text unique,
    created_at timestamptz default now()
);

-- 8. ADMIN ROLES
create table if not exists public.admin_roles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null default 'admin'
      check (role in ('admin','super_admin')),
    created_at timestamptz default now()
);

-- =========================================
-- 9. SIGNUP BONUS: 1,000 CREDITS
-- =========================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'name', '')
    )
    on conflict (id) do nothing;

    insert into public.wallets (user_id, balance)
    values (new.id, 1000)
    on conflict (user_id) do nothing;

    if found then
      insert into public.credit_ledger (
        user_id,
        transaction_type,
        amount,
        balance_after,
        description
      )
      values (
        new.id,
        'signup_bonus',
        1000,
        1000,
        'YAMA welcome credits'
      );
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================
-- 10. SECURE CREDIT SPENDING
-- =========================================

create or replace function public.spend_credits(
    p_service_slug text,
    p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid;
    v_wallet public.wallets%rowtype;
    v_service public.ai_services%rowtype;
    v_usage public.ai_usage%rowtype;
    v_new_balance bigint;
begin
    v_user := auth.uid();

    if v_user is null then
      raise exception 'Authentication required';
    end if;

    if p_request_id is null or length(p_request_id) < 8
       or length(p_request_id) > 100 then
      raise exception 'Invalid request ID';
    end if;

    select * into v_service
    from public.ai_services
    where slug = p_service_slug and active = true;

    if not found then
      raise exception 'Service unavailable';
    end if;

    select * into v_wallet
    from public.wallets
    where user_id = v_user
    for update;

    if not found then
      raise exception 'Wallet not found';
    end if;

    select * into v_usage
    from public.ai_usage
    where user_id = v_user
      and request_id = p_request_id;

    if found then
      return jsonb_build_object(
        'success', true,
        'duplicate', true,
        'balance', v_wallet.balance
      );
    end if;

    if v_wallet.balance < v_service.credit_cost then
      raise exception 'Insufficient credits';
    end if;

    v_new_balance := v_wallet.balance - v_service.credit_cost;

    update public.wallets
    set balance = v_new_balance,
        updated_at = now()
    where user_id = v_user;

    insert into public.ai_usage (
      user_id, service_id, credits_charged,
      status, request_id
    )
    values (
      v_user, v_service.id, v_service.credit_cost,
      'completed', p_request_id
    );

    insert into public.credit_ledger (
      user_id, transaction_type, amount,
      balance_after, reference_id, description
    )
    values (
      v_user, 'usage', -v_service.credit_cost,
      v_new_balance, p_request_id, v_service.name
    );

    return jsonb_build_object(
      'success', true,
      'duplicate', false,
      'charged', v_service.credit_cost,
      'balance', v_new_balance
    );
end;
$$;

-- =========================================
-- 11. ROW LEVEL SECURITY
-- =========================================

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.ai_services enable row level security;
alter table public.ai_usage enable row level security;
alter table public.credit_packages enable row level security;
alter table public.payment_orders enable row level security;
alter table public.admin_roles enable row level security;

-- Profiles
create policy "Read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Wallets: read only
create policy "Read own wallet"
on public.wallets for select
to authenticated
using ((select auth.uid()) = user_id);

-- Ledger: read only
create policy "Read own ledger"
on public.credit_ledger for select
to authenticated
using ((select auth.uid()) = user_id);

-- AI Services: public catalog
create policy "Read active services"
on public.ai_services for select
to authenticated
using (active = true);

-- Usage
create policy "Read own usage"
on public.ai_usage for select
to authenticated
using ((select auth.uid()) = user_id);

-- Packages
create policy "Read active packages"
on public.credit_packages for select
to authenticated
using (active = true);

-- Orders
create policy "Read own orders"
on public.payment_orders for select
to authenticated
using ((select auth.uid()) = user_id);

-- Admin roles: own record only
create policy "Read own admin role"
on public.admin_roles for select
to authenticated
using ((select auth.uid()) = user_id);

-- =========================================
-- 12. PERMISSIONS
-- =========================================

revoke all on public.wallets from anon, authenticated;
grant select on public.wallets to authenticated;

revoke all on public.credit_ledger from anon, authenticated;
grant select on public.credit_ledger to authenticated;

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

revoke all on public.payment_orders from anon, authenticated;
grant select on public.payment_orders to authenticated;

revoke all on public.admin_roles from anon, authenticated;
grant select on public.admin_roles to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, locale)
on public.profiles to authenticated;

grant select on public.ai_services to authenticated;
grant select on public.credit_packages to authenticated;

revoke all on function public.spend_credits(text, text)
from public, anon;

grant execute on function public.spend_credits(text, text)
to authenticated;

-- =========================================
-- END YAMA TOKEN DATABASE v1.0
-- =========================================
