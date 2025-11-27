-- Enable useful extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Enumerations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_status') THEN
        CREATE TYPE public.video_status AS ENUM ('draft', 'scheduled', 'pending', 'processing', 'posted', 'failed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_status') THEN
        CREATE TYPE public.post_status AS ENUM ('pending', 'uploading', 'posted', 'failed');
    END IF;
END $$;

-- Tables
create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email citext not null unique,
    avatar_url text,
    created_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.videos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    description text,
    url_drive text not null,
    scheduled_date timestamp with time zone,
    status public.video_status not null default 'draft',
    created_at timestamp with time zone not null default timezone('utc', now()),
    updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.platforms (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    name text not null,
    api_token text,
    created_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.posts (
    id uuid primary key default gen_random_uuid(),
    video_id uuid not null references public.videos(id) on delete cascade,
    platform_id uuid not null references public.platforms(id) on delete cascade,
    status public.post_status not null default 'pending',
    posted_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone not null default timezone('utc', now())
);

-- Indexes
create index if not exists idx_videos_user_id on public.videos(user_id);
create index if not exists idx_videos_status on public.videos(status);
create index if not exists idx_posts_video_id on public.posts(video_id);
create index if not exists idx_posts_platform_id on public.posts(platform_id);
create index if not exists idx_posts_status on public.posts(status);

-- Views (optional examples)
create or replace view public.video_post_status as
select v.id as video_id,
       v.title,
       v.status as video_status,
       json_agg(
           json_build_object(
               'postId', p.id,
               'platformId', p.platform_id,
               'status', p.status,
               'postedAt', p.posted_at,
               'errorMessage', p.error_message
           )
           order by p.created_at
       ) filter (where p.id is not null) as posts
from public.videos v
left join public.posts p on p.video_id = v.id
group by v.id;

