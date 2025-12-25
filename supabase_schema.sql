-- Copy and paste this ENTIRE block into the Supabase SQL Editor

-- 1. Create the table
create table secrets (
  id uuid default gen_random_uuid() primary key,
  encrypted_content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Auto-delete is handled by "Delete on Read" logic in the app, 
  -- but this expiration serves as a backup cleanup rule.
  expires_at timestamp with time zone default (now() + interval '24 hours')
);

-- 2. Enable Security
alter table secrets enable row level security;

-- 3. Create Access Policies
-- Allow anyone to create a secret (Anon Insert)
create policy "Enable insert for everyone" on secrets for insert with check (true);

-- Allow anyone to read a secret (we control deletion in the API)
create policy "Enable select for everyone" on secrets for select using (true);

-- Allow anyone to delete (needed for the "Burn" action)
create policy "Enable delete for everyone" on secrets for delete using (true);
