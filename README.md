# Nix

**Nix** is a secure, ephemeral, and zero-knowledge sharing tool for text and files. Share sensitive information like passwords, API keys, or private documents with confidence, knowing they are encrypted in your browser and permanently deleted after being viewed.

## Features

- **Zero-Knowledge Encryption**: All data is encrypted client-side using **AES-256-GCM** before it ever leaves your device. The server never sees the plaintext or the decryption keys.
- **Burn-on-Read**: Links can be configured to self-destruct immediately after being viewed once.
- **Auto-Expiration**: Set expiration timers (e.g., 5 minutes, 1 hour, 24 hours). Data is automatically wiped from the server when the timer expires.
- **Secure File Sharing**: Share files (up to 10MB) with the same level of security as text. Multiple files are automatically zipped.
- **Passphrase Protection**: Add an extra layer of security by requiring a passphrase to decrypt the content, in addition to the unique link.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Cryptography**: [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nix.git
   cd nix
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   > You can find these keys in your Supabase Project Settings > API.

### Database Setup

Run the following SQL in your Supabase SQL Editor to create the necessary table and policies:

```sql
create table secrets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  encrypted_content text not null,
  expires_at timestamp with time zone not null,
  view_count integer default 0
);

-- Enable Row Level Security
alter table secrets enable row level security;

-- Allow anyone to create a secret (Insert)
create policy "Anyone can create a secret"
  on secrets for insert
  with check (true);

-- Allow anyone to read a secret if they have the ID (Select)
-- The application logic handles one-time view enforcement via an Edge Function or Database Function (recommended)
-- For simple setup:
create policy "Anyone can read a secret"
  on secrets for select
  using (true);
```

### Running the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Security Architecture

Nix relies on the **Web Crypto API** for all cryptographic operations.

1. **Key Generation**: A random 256-bit key is generated in the browser.
2. **Encryption**: The content (text or file) is encrypted using AES-256-GCM.
3. **URL Construction**: The decryption key is appended to the URL as a hash fragment (e.g., `#key...` or implicitly handled via passphrase). The hash fragment is **never sent to the server**.
4. **Storage**: Only the encrypted ciphertext is sent to Supabase.
5. **Decryption**: When the link is opened, the browser extracts the key from the URL (or prompts for the passphrase) and decrypts the content locally.

## License

MIT
