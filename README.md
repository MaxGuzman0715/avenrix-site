# Avenrix website

Static site for **avenrixservices.com**. No framework and no dependencies: `node build.mjs` turns the templates and settings into a `dist/` folder you upload to any static host.

```
site.config.json        Your settings: domain, email, form endpoint, address
content/jobs.json       Job postings (draft / open / closed)
src/home.html           Homepage content
src/styles.css          All styles
src/main.js             All interactivity
assets/img, assets/brand  Photos, logo, favicon, share image
integrations/google-sheets/Code.gs   Form receiver (Google Apps Script)
build.mjs               Builds dist/
serve.mjs               Local preview server
```

## Commands

| Command | What it does |
|---|---|
| `npm start` | Build and preview at http://localhost:8080 |
| `npm run preview` | Same, but also shows **draft** jobs so you can check them before publishing |
| `npm run build` | Production build into `dist/`, the folder you upload |

The build prints warnings (`!`) for anything missing before launch. Deal with every warning before you upload.

---

## Launch checklist

### 1. Fill in site.config.json

- `businessAddress`: your registered business address. It appears in the Privacy Policy and Terms.
- `governingLaw`: the state whose law governs the Terms, for example `"the State of Texas"`.
- `formEndpoint`: comes from step 2.

### 2. Connect the form to a Google Sheet (5 minutes)

Every signup becomes a row in a Google Sheet, and you get an email for each one.

1. Create a new Google Sheet (for example, "Avenrix signups"), signed in to the Google account that should own the data.
2. Open **Extensions → Apps Script**. Delete what's there and paste in all of `integrations/google-sheets/Code.gs`. Save.
3. In the function menu at the top, choose `setup` and click **Run**. Approve the permissions. This creates the **Signups** tab.
4. Click **Deploy → New deployment**. Choose type **Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Paste that URL into `formEndpoint` in `site.config.json`, then run `npm run build`.
6. Test: open the URL in a browser. You should see `{"ok":true,"service":"avenrix-form"}`.

Notes:
- Spam protection is built in: a hidden trap field, a minimum fill time, and consent is required.
- Free Gmail accounts can send about 100 alert emails a day. When signups get busy, set `SEND_EMAIL_ALERTS = false` in the script and check the sheet instead.
- The sheet has **Status** and **Notes** columns for tracking each person (New → Contacted → Placed).
- If you edit the script later, use **Deploy → Manage deployments → Edit → New version**. That keeps the same URL.

### 3. Put the site online with Cloudflare Pages (free)

Cloudflare Pages is free, fast, includes HTTPS, and reads the `_headers` security file the build creates.

1. Create a free account at https://dash.cloudflare.com.
2. **Add your domain** (Websites → Add a site → `avenrixservices.com`, Free plan). Cloudflare scans your existing DNS records. **Before you switch nameservers, read step 4.** It protects your nexa@ mailbox. Then Cloudflare shows two nameservers. At the registrar where you bought the domain, replace its nameservers with those two. This usually takes effect within an hour.
3. Push this project to a GitHub repository (it can be private). `dist/` is not committed; Cloudflare builds it.
4. Go to **Workers & Pages → Create → Pages → Connect to Git**. Pick the repository and use these settings:

   | Setting | Value |
   |---|---|
   | Framework preset | None |
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

   The Node version comes from the `.node-version` file. Click **Save and Deploy**. You get a test address like `avenrix.pages.dev`; check the site there first.
5. In the project, open **Custom domains → Set up a domain**. Add `avenrixservices.com`, then add `www.avenrixservices.com` as well. Cloudflare creates the DNS records and certificates.
6. To send `www` to the main domain: **Rules → Redirect Rules → Create rule → "Redirect from WWW to root"** template.

**Updating the site:** commit and push to `main`. Cloudflare rebuilds and publishes in about a minute. Each pull request or other branch also gets its own preview address.

**Job expiry:** a job disappears after its `validThrough` date only when the site is rebuilt. If you go a while without pushing, trigger a rebuild in Cloudflare (**Deployments → Retry deployment**), or set up a Deploy Hook (**Settings → Builds → Deploy hooks**) to run on a schedule.

Without GitHub: run `npm run build` and drag the `dist` folder into **Workers & Pages → Create → Pages → Upload assets**. Netlify works the same way (https://app.netlify.com/drop).

### 4. Keep nexa@avenrixservices.com working when you move DNS

The site shows **nexa@avenrixservices.com** (set in `site.config.json` → `email`), and signup alerts go there too (`NOTIFY_EMAIL` in `Code.gs`).

That mailbox already works, so its DNS records must come across to Cloudflare exactly. When Cloudflare shows the records it found, check that all of your email records are listed, compared against your current DNS at the registrar (or your email provider's admin page):

- **MX** records: where mail is delivered. Without these, you stop receiving email.
- **TXT** records containing `v=spf1`, plus any `_dmarc` record: without these, your emails land in spam.
- **CNAME** records such as `autodiscover`, `selector1._domainkey` and `selector2._domainkey` (Microsoft 365/Outlook), or `google._domainkey` (Google): these handle sign-in and DKIM.

Add any that are missing. Set every email-related record to **DNS only** (grey cloud), not Proxied. Only switch nameservers after that. Afterwards, send yourself a test email in each direction.

Don't turn on Cloudflare **Email Routing**. It replaces your MX records and would take over nexa@ delivery.

### 5. Get found on Google

1. Go to https://search.google.com/search-console and add the property `avenrixservices.com` (the Domain option). Cloudflare can add the verification record for you.
2. Under **Sitemaps**, submit `https://avenrixservices.com/sitemap.xml`.
3. Optional analytics: in Cloudflare, **Analytics & Logs → Web Analytics**. It needs no cookie banner. With Pages you can switch it on with one click. Otherwise, put the token in `cloudflareAnalyticsToken` and rebuild.

---

## Posting a job

1. Open `content/jobs.json`. Copy an existing entry and edit it.
   - `slug`: the URL. Lowercase letters and dashes only, e.g. `weekend-store-associate-austin` → `/jobs/weekend-store-associate-austin/`
   - `field`: one of `Tech & Data`, `Retail & Sales`, `Customer Support`, `Operations & Admin`, `Creative & Content`, `Logistics & Field`, `Specialists`, `Other`
   - `employmentType`: any of `PART_TIME`, `FULL_TIME`, `CONTRACTOR`, `TEMPORARY`
   - `location`: `{ "remote": true, "country": "US" }` or `{ "remote": false, "city": "Austin", "region": "TX", "country": "US" }`
   - `pay`: `{ "min": 17, "max": 20, "unit": "HOUR", "currency": "USD" }`. Real pay ranges get more applicants, and Google for Jobs favors them.
   - `validThrough`: the last day to apply. After this date the build stops publishing the job.
2. Set `"status": "draft"` and run `npm run preview` to check the page.
3. When it's right, set `"status": "open"`, run `npm run build` and upload `dist`.
4. Share the job page link on LinkedIn, Indeed, Facebook groups and so on. Every job page includes Google for Jobs data, so it can appear in Google's job search on its own.
5. When the role is filled, set `"status": "closed"` and rebuild. The page is removed and Google drops it.

Applicants click **Apply for this role**. The form opens with the role attached, and the role slug appears in the **Role applied for** column of your sheet.

Only publish real roles. Google and the job boards remove postings, and can block a site, when roles don't exist.

---

## Before you launch: check what the site promises

The homepage makes promises. Keep them true, or edit the wording in `src/home.html`:

- "Free to join" (hero and FAQ)
- "Verified clients", "Verified people", "Secure payment: payments run through Avenrix", "Reviews both ways" (Trust section)
- "Someone from Avenrix will reply within two business days" (business form confirmation, in `src/main.js`)

The Privacy Policy and Terms are sensible starting templates, not legal advice. Have a lawyer review them, especially if you place workers in several states or countries.

## Credits

Photos from Pexels (free for commercial use; https://www.pexels.com/license/). Fonts from Google Fonts: Archivo (logo wordmark), Bricolage Grotesque, Figtree, Instrument Serif and JetBrains Mono.
