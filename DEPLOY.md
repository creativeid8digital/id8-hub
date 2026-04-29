# ID8 Hub — Deploy Guide
# Read this top to bottom. Every command is copy-paste.
# Takes about 30-45 minutes total.

---

## STEP 1 — Install the project on your computer

Open Terminal (Mac) or Command Prompt (Windows) and run these one by one:

```
cd Desktop
```
```
npx create-next-app@14.2.3 id8-hub --typescript --no-tailwind --no-eslint --no-src-dir --no-app --import-alias "@/*"
```
> When it asks questions, just press Enter for all of them.

Now REPLACE the files inside the `id8-hub` folder with the ones I've given you.
(Drag and drop the entire contents of the project into the folder — replace everything.)

Then run:
```
cd id8-hub
npm install
```

---

## STEP 2 — Set up Supabase (your database) — FREE

1. Go to → https://supabase.com
2. Click "Start your project" → sign up with GitHub
3. Click "New project"
   - Name: `id8-hub`
   - Database password: make something strong, save it
   - Region: pick Singapore (closest to New Delhi)
4. Wait ~2 minutes for it to create

5. Go to → SQL Editor (left sidebar) → New Query
6. PASTE the entire contents of `supabase-schema.sql` into the editor
7. Click "Run" — you'll see "Success" messages

8. Go to → Settings → API (left sidebar)
9. Copy these two values — you'll need them in Step 4:
   - `Project URL`
   - `anon public` key

---

## STEP 3 — Set up Google OAuth — FREE

1. Go to → https://console.cloud.google.com
2. Create a new project → name it "ID8 Hub"
3. Go to → APIs & Services → OAuth consent screen
   - User type: Internal (only your team can log in)
   - App name: ID8 Hub
   - Support email: your email
   - Click Save
4. Go to → Credentials → Create Credentials → OAuth client ID
   - Type: Web application
   - Name: ID8 Hub
   - Authorised JavaScript origins:
     ```
     http://localhost:3000
     https://hub.id8.digital
     ```
   - Authorised redirect URIs:
     ```
     http://localhost:3000/api/auth/callback/google
     https://hub.id8.digital/api/auth/callback/google
     ```
5. Click Create → copy the Client ID and Client Secret

---

## STEP 4 — Add your secret keys

In the `id8-hub` folder, create a file called `.env.local` (no extension).
Paste this inside and fill in YOUR values:

```
NEXT_PUBLIC_SUPABASE_URL=paste_your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_supabase_anon_key_here

NEXTAUTH_SECRET=any_random_long_string_like_this_abc123xyz789
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=paste_your_google_client_id_here
GOOGLE_CLIENT_SECRET=paste_your_google_client_secret_here
```

---

## STEP 5 — Run it locally to test

```
npm run dev
```

Open your browser → http://localhost:3000

You should see the ID8 Hub login page.
Click "Continue with Google" and log in with your id8.digital email.
The app loads → all 6 views work → you can add campaigns!

If everything looks good → proceed to deploy.

---

## STEP 6 — Push to GitHub

1. Go to → https://github.com → New repository
   - Name: `id8-hub`
   - Private (important!)
   - Click Create

2. In terminal (inside the id8-hub folder):
```
git init
git add .
git commit -m "Initial ID8 Hub"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/id8-hub.git
git push -u origin main
```
Replace YOUR_GITHUB_USERNAME with your actual GitHub username.

---

## STEP 7 — Deploy to Vercel — FREE

1. Go to → https://vercel.com → Sign up with GitHub
2. Click "Add New Project"
3. Import your `id8-hub` repository
4. Click "Environment Variables" and add ALL the variables from your `.env.local` file
   - Change NEXTAUTH_URL to: `https://hub.id8.digital`
5. Click "Deploy" → wait ~2 minutes

---

## STEP 8 — Connect hub.id8.digital

1. In Vercel → your project → Settings → Domains
2. Add domain: `hub.id8.digital`
3. Vercel gives you a CNAME record
4. Go to your domain registrar (GoDaddy, Namecheap etc)
   - Add CNAME: `hub` → points to Vercel's value
5. Wait 5-30 mins for DNS to propagate

Visit https://hub.id8.digital — your app is live! 🎉

---

## STEP 9 — Add your team

1. Share the hub.id8.digital link with your team
2. Anyone with an @id8.digital Google account can log in
3. To set someone's team (Creative, Performance etc):
   - Go to Supabase → Table Editor → users table
   - Find their row after they first log in
   - Set the `team` column to: creative / performance / content / social / account_managers / tech

---

## TROUBLESHOOTING

**"Module not found" error:**
```
npm install
```

**Login not working:**
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
- Make sure the redirect URI in Google Console matches exactly

**Database not loading:**
- Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

**Need help?** Share the error message with Claude and paste the exact error.
