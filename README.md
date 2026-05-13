# FuelMate — Deploy Guide

This folder is a complete Next.js project ready to deploy. Follow the steps
below in order. Total time: about 60–90 minutes of clicking, spread over a
few days as API approvals come in.

---

## What you'll end up with

- A live FuelMate website at a `fuelmate-something.vercel.app` URL (free)
- NSW fuel prices live from day one (your existing API key, rotated)
- WA fuel prices live from day one (no key needed)
- VIC, QLD, SA, NT showing mock data until each API is approved (typically 1–4 weeks)
- Ability to swap in real data for each state by pasting one env var, no code changes

---

## STEP 0 — Rotate your NSW API key (urgent, do this first)

Your previous NSW key appeared in a screenshot, so treat it as compromised.

1. Go to https://api.nsw.gov.au and sign in
2. Open **My Apps** → click your FuelMate app
3. Look for a **Regenerate** or **Rotate** button next to the API Key/Secret
4. Save the new Key and Secret somewhere private (a password manager is ideal)
5. **Don't** paste them into chat, email, or screenshots from now on

---

## STEP 1 — Sign up for GitHub (5 minutes)

GitHub is where your code lives. Vercel pulls from GitHub to deploy.

1. Go to https://github.com/signup
2. Use your normal email and a strong password
3. Verify your email when GitHub sends the link
4. Skip the "tell us about yourself" questions if you want

---

## STEP 2 — Sign up for Vercel (5 minutes)

1. Go to https://vercel.com/signup
2. Click **Continue with GitHub** (this links the two accounts)
3. Authorize Vercel to access your GitHub
4. Pick the **Hobby** (free) plan when prompted

---

## STEP 3 — Put this code on GitHub (10 minutes)

You're going to upload this folder to a new GitHub repo using the web interface.
No terminal required.

1. On GitHub, click the **+** icon top-right → **New repository**
2. **Repository name**: `fuelmate` (lowercase)
3. **Description**: "FuelMate — Australian fuel price comparison"
4. Select **Private** (you can make it public later if you want)
5. **Don't** tick "Add a README" or any other init options
6. Click **Create repository**

You'll see a page that says "Quick setup". On that page:

7. Click the link **uploading an existing file** (in the middle of the page)
8. On the upload page, drag this **entire `fuelmate-app` folder's contents**
   into the upload area. Important: open the folder first and select the
   files inside — don't drag the folder itself.
9. Scroll down — at the bottom, "Commit changes" — leave default message
10. Click **Commit changes**

GitHub will upload all the files and show your repo with `app/`, `lib/`,
`package.json` etc.

---

## STEP 4 — Deploy to Vercel (5 minutes)

1. Go to https://vercel.com/new
2. You should see your `fuelmate` repo listed under "Import Git Repository"
3. Click **Import** next to it
4. On the configure screen:
   - **Project Name**: `fuelmate` (or anything you like)
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: leave as `./`
   - Don't click Deploy yet — go to the **Environment Variables** section
5. Add your NSW credentials (the rotated ones from Step 0):
   - Click **Add**
   - Name: `NSW_FUELCHECK_API_KEY` — Value: your new key
   - Click **Add** again
   - Name: `NSW_FUELCHECK_API_SECRET` — Value: your new secret
6. Click **Deploy**

Vercel will build the site (takes 60–90 seconds). When it's done you'll see
a "Congratulations" screen with a preview thumbnail. Click **Continue to
Dashboard**, then **Visit** to see your live site.

**Your site is now live.** NSW prices are real. WA prices are real. The other
states show mock data until you apply for their APIs.

---

## STEP 5 — Apply for the other state APIs

Each one is a separate application. Do them in any order. Most are free.

### Victoria (VIC) — Servo Saver

- Apply at: https://service.vic.gov.au/find-services/transport-and-driving/servo-saver/help-centre/servo-saver-public-api
- Free. Approval typically 1–2 weeks.
- When approved you'll get an **API Consumer ID**.
- When you have it: in Vercel → your project → Settings → Environment Variables
  → add `VIC_SERVOSAVER_API_KEY` with the value, then click the **Redeploy**
  button at the top right.

### Queensland (QLD) — Fuel Prices

- Register at: https://www.data.qld.gov.au/
- Search for "Fuel price reporting"
- The data is open — some endpoints free, some require commercial agreement
- When approved: add `QLD_FUEL_API_KEY` and `QLD_FUEL_API_URL` env vars

### South Australia (SA) — Fuel Pricing Information Scheme

- Apply via Consumer and Business Services: https://www.cbs.sa.gov.au/sections/CBAdvice/fuel-pricing-apps-and-websites
- Aggregator is Informed Sources, phone 08 8356 1020
- This is the most involved — may require a data licence agreement
- Existing publishers: PetrolSpy, MotorMouth, RAA. You'll be in good company.
- When approved: add `SA_INFORMED_SOURCES_API_KEY` and `SA_INFORMED_SOURCES_API_URL`

### Northern Territory (NT) — MyFuel NT

- Contact NT government via https://nt.gov.au/
- Smaller market, less common integration — may take some digging
- When approved: add `NT_MYFUELNT_API_KEY`

---

## STEP 6 — Activate each state as approvals land

When each API is approved and you've added the env var, you also need to flip
its status from `mock` to `live` in the code. This is a one-line change.

1. In your GitHub repo, open `app/components/FuelMate.jsx`
2. Click the pencil (Edit) icon
3. Use Ctrl+F to find `DATA_SOURCES`
4. In the line for the state you're activating, change `status: 'mock'` to
   `status: 'live'`
5. Scroll to the bottom, click **Commit changes**
6. Vercel will auto-deploy the change in about 90 seconds

That's it. Your site is now serving real data for that state.

---

## Domain (optional, $10–20/year)

To use `fuelmate.com.au` instead of the `vercel.app` URL:

1. Buy the domain at https://www.crazydomains.com.au or https://www.namecheap.com
2. In Vercel → your project → Settings → Domains → Add
3. Type your domain, click Add, follow the DNS instructions Vercel shows you
4. Update DNS at your registrar (Vercel shows exactly which records to add)
5. Wait 5 minutes to a few hours for DNS to propagate

Vercel auto-provisions an SSL certificate.

---

## Costs

- Vercel Hobby plan: free (good for up to ~100K monthly visitors)
- GitHub Private repos: free
- Domain: ~$15/year if you buy one
- All state government APIs: free
- Google favicons (for station logos): free

Once you exceed Vercel's Hobby limits you'd move to Pro at USD $20/month, but
that's well past the point where AdSense revenue covers it.

---

## What if something breaks?

- **Build fails in Vercel**: click the failed build, expand the log, screenshot
  the red error lines and ask me to read them.
- **Site loads but no prices show**: check Vercel → Settings → Environment Variables.
  The NSW key must be there. If it is, check Vercel → Deployments → latest → Functions
  tab → click `/api/fuel/nsw` → look at the logs.
- **Page is blank / "Application error"**: open browser DevTools (F12), look at
  the Console tab for red errors. Screenshot and ask.

---

## Files in this project (for reference)

```
fuelmate-app/
├── app/
│   ├── components/FuelMate.jsx       Your full frontend
│   ├── api/fuel/[state]/route.ts     Single API endpoint, dispatches by state
│   ├── layout.tsx                    HTML wrapper, fonts
│   ├── page.tsx                      Home page (renders FuelMate)
│   └── globals.css                   Tailwind + minimal resets
├── lib/
│   ├── types.ts                      Canonical Station / FetchOptions types
│   ├── cache.ts                      In-memory cache with TTL
│   ├── normalizers.ts                Brand aliases, fuel codes, distance
│   └── sources/
│       ├── nsw-fuelcheck.ts          ✅ Real (NSW + TAS + ACT)
│       ├── wa-fuelwatch.ts           ✅ Real (RSS, no key)
│       ├── vic-servosaver.ts         ⏳ Stub
│       ├── qld-fuelprices.ts         ⏳ Stub
│       ├── sa-informedsources.ts     ⏳ Stub
│       └── nt-myfuelnt.ts            ⏳ Stub
├── .env.example                      Template for environment variables
├── .gitignore                        Keeps secrets out of GitHub
├── next.config.mjs                   Next.js config
├── package.json                      Dependencies
├── postcss.config.js                 Required by Tailwind
├── tailwind.config.ts                Tailwind config
└── tsconfig.json                     TypeScript config
```
