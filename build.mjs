// Builds the static site into dist/. No dependencies: `node build.mjs`.
// Inputs: site.config.json, content/jobs.json, src/*, assets/*.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const r = (...p) => path.join(root, ...p);
const out = r("dist");

const cfg = JSON.parse(fs.readFileSync(r("site.config.json"), "utf8"));
const site = cfg.siteUrl.replace(/\/$/, "");
const warnings = [];

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const write = (rel, content) => {
  const f = path.join(out, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
const jsonld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const today = new Date().toISOString().slice(0, 10);

// ---------- jobs ----------
const FIELD_SHORT = {
  "Tech & Data": "Tech", "Retail & Sales": "Retail", "Customer Support": "Support",
  "Operations & Admin": "Operations", "Creative & Content": "Creative",
  "Logistics & Field": "Logistics", "Specialists": "Specialist", "Other": "Other",
};
const UNIT = { HOUR: "hr", DAY: "day", WEEK: "wk", MONTH: "mo", YEAR: "yr" };
const TYPE_LABEL = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACTOR: "Contract", TEMPORARY: "Temporary", INTERN: "Internship", PER_DIEM: "Per diem", OTHER: "Other" };

const allJobs = JSON.parse(fs.readFileSync(r("content", "jobs.json"), "utf8"));
const REQUIRED = ["slug", "title", "field", "employmentType", "hoursPerWeek", "location", "pay", "summary", "responsibilities", "requirements", "datePosted", "validThrough", "status"];
const seen = new Set();
for (const j of allJobs) {
  const missing = REQUIRED.filter((k) => j[k] === undefined || j[k] === "");
  if (missing.length) throw new Error(`jobs.json: "${j.slug || j.title}" is missing ${missing.join(", ")}`);
  if (!/^[a-z0-9-]+$/.test(j.slug)) throw new Error(`jobs.json: slug "${j.slug}" must be lowercase letters, digits and dashes`);
  if (seen.has(j.slug)) throw new Error(`jobs.json: duplicate slug "${j.slug}"`);
  if (!FIELD_SHORT[j.field]) throw new Error(`jobs.json: "${j.slug}" has unknown field "${j.field}". Use one of: ${Object.keys(FIELD_SHORT).join(", ")}`);
  seen.add(j.slug);
}
const previewDrafts = process.argv.includes("--preview-drafts");
const isLive = (j) => j.status === "open" && j.validThrough >= today;
const openJobs = allJobs.filter((j) => isLive(j) || (previewDrafts && j.status === "draft"));
for (const j of allJobs.filter((j) => j.status === "open" && j.validThrough < today)) warnings.push(`Job "${j.slug}" is past validThrough (${j.validThrough}) and was not published.`);

const where = (j) => j.location.remote ? "Remote" : [j.location.city, j.location.region].filter(Boolean).join(", ");
const payText = (j) => {
  const u = UNIT[j.pay.unit] || j.pay.unit.toLowerCase();
  const sym = j.pay.currency === "USD" ? "$" : j.pay.currency + " ";
  return j.pay.max && j.pay.max !== j.pay.min ? `${sym}${j.pay.min}–${j.pay.max}/${u}` : `${sym}${j.pay.min}/${u}`;
};
const types = (j) => j.employmentType.map((t) => TYPE_LABEL[t] || t).join(" · ");
const jobUrl = (j) => `/jobs/${j.slug}/`;

// ---------- assets ----------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(r("assets", "img"), path.join(out, "assets", "img"), { recursive: true });
fs.cpSync(r("assets", "brand"), path.join(out, "assets", "brand"), { recursive: true });
fs.copyFileSync(r("assets", "brand", "favicon.ico"), path.join(out, "favicon.ico"));
const css = fs.readFileSync(r("src", "styles.css"), "utf8");
const js = fs.readFileSync(r("src", "main.js"), "utf8");
write("assets/site.css", css);
write("assets/main.js", js);
const cssUrl = `/assets/site.css?v=${hash(css)}`;
const jsUrl = `/assets/main.js?v=${hash(js)}`;

// ---------- layout ----------
const LOGO = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M37 6H58L30 94H3Z" fill="currentColor"/><path d="M63 6H42L70 94H97Z" fill="currentColor"/><path d="M44.45 58H55.55L61.9 78H38.1Z" fill="#F4A62A"/></svg>`;
const LOGO_FOOT = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M37 6H58L30 94H3Z" fill="currentColor"/><path d="M63 6H42L70 94H97Z" fill="currentColor"/><path d="M44.45 58H55.55L61.9 78H38.1Z" fill="#F4A62A"/></svg>`;

function layout({ title, description, pathname, body, extraHead = "", noindex = false, ogType = "website" }) {
  const url = site + pathname;
  const fullTitle = title ? `${title} · ${cfg.brand}` : `${cfg.brand}: Turn unused capacity into opportunity`;
  const analytics = cfg.cloudflareAnalyticsToken
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: cfg.cloudflareAnalyticsToken })}'></script>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<meta name="theme-color" content="#0B1F1D">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(cfg.brand)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${site}/assets/brand/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800..900&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;600&display=swap">
<link rel="stylesheet" href="${cssUrl}">
${extraHead}
</head>
<body>
<a class="skip" href="#top">Skip to content</a>
<div class="progress" id="progress"></div>
<header class="nav" id="nav">
  <div class="wrap">
    <a class="logo" href="/" aria-label="${esc(cfg.brand)} home">${LOGO}AVENRIX</a>
    <nav aria-label="Main">
      <ul>
        <li><a href="/#work">Work types</a></li>
        <li><a href="/#how">How it works</a></li>
        <li><a href="/jobs/">Open work</a></li>
        <li><a href="/#trust">Trust</a></li>
        <li><a href="/#faq">FAQ</a></li>
      </ul>
    </nav>
    <a class="btn" href="/#join"><span class="long">Join the network</span><span class="short">Join</span> <span class="arr">→</span></a>
  </div>
</header>
${body}
<footer>
  <div class="wrap">
    <div class="foot-top">
      <div>
        <a class="logo" href="/" style="color:var(--on-deep)">${LOGO_FOOT}AVENRIX</a>
        <p>Turn unused capacity into opportunity.</p>
        <button class="copyable" type="button" id="copyMail" data-email="${esc(cfg.email)}" title="Copy email address"><span class="addr">${esc(cfg.email)}</span> <span id="copyState">Copy</span></button>
      </div>
      <div><h4>Work</h4><ul><li><a href="/#work">Work types</a></li><li><a href="/jobs/">Open roles</a></li><li><a href="/#join">Join the network</a></li></ul></div>
      <div><h4>Company</h4><ul><li><a href="/#idea">The idea</a></li><li><a href="/#trust">Trust</a></li><li><a href="/#business">For businesses</a></li></ul></div>
      <div><h4>Help</h4><ul><li><a href="/#how">How it works</a></li><li><a href="/#faq">FAQ</a></li><li><a href="/privacy/">Privacy Policy</a></li><li><a href="/terms/">Terms</a></li></ul></div>
    </div>
    <div class="wordmark" id="wordmark" aria-hidden="true">AVENRIX</div>
    <div class="legal"><span>© <span id="yr">${today.slice(0, 4)}</span> ${esc(cfg.companyName)} · ${esc(site.replace(/^https?:\/\//, ""))}</span><span><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · Photography: Pexels</span></div>
  </div>
</footer>
<script src="${jsUrl}" defer></script>
${analytics}
</body>
</html>
`;
}

// ---------- home ----------
const orgLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: cfg.companyName,
  alternateName: cfg.brand,
  url: site + "/",
  logo: site + "/assets/brand/logo-512.png",
  email: cfg.email,
  slogan: "Turn unused capacity into opportunity.",
};
const siteLd = { "@context": "https://schema.org", "@type": "WebSite", name: cfg.brand, url: site + "/" };

const boardJobs = openJobs.map((j) => ({
  slug: j.slug, title: j.title, field: j.field, fieldShort: FIELD_SHORT[j.field],
  hours: `${j.hoursPerWeek} h/wk`, where: where(j), url: jobUrl(j),
}));
let home = fs.readFileSync(r("src", "home.html"), "utf8");
const fills = {
  "{{JOBS_JSON}}": JSON.stringify(boardJobs).replace(/</g, "\\u003c"),
  "{{BOARD_LABEL}}": openJobs.length ? "Open roles" : "Example roles",
  "{{BOARD_NOTE}}": openJobs.length
    ? `Now hiring · ${openJobs.length} open role${openJobs.length === 1 ? "" : "s"}`
    : "Examples shown · Live openings appear here as clients post them",
  "{{BOARD_CTA}}": openJobs.length
    ? `<a class="btn light" href="/jobs/">See all open roles <span class="arr">→</span></a>`
    : `<a class="btn light" href="#join">Get matched to roles <span class="arr">→</span></a>`,
  "{{EMAIL}}": esc(cfg.email),
  "{{FORM_ENDPOINT}}": esc(cfg.formEndpoint),
};
for (const [k, v] of Object.entries(fills)) home = home.split(k).join(v);
const leftover = home.match(/\{\{[A-Z_]+\}\}/g);
if (leftover) throw new Error("Unfilled placeholders in home.html: " + leftover.join(", "));

write("index.html", layout({
  title: "",
  description: "Avenrix turns unused capacity into opportunity. Put your skills and spare hours to work in retail, customer support, tech, operations, creative and field roles.",
  pathname: "/",
  body: home,
  extraHead: jsonld(orgLd) + "\n" + jsonld(siteLd),
}));

// ---------- jobs index ----------
const fieldsOpen = [...new Set(openJobs.map((j) => j.field))];
const cards = openJobs.map((j) => `
      <a class="job-card rv" href="${jobUrl(j)}" data-field="${esc(j.field)}">
        <span class="fld">${esc(j.field)}</span>
        <h2>${esc(j.title)}</h2>
        <p>${esc(j.summary)}</p>
        <div class="meta"><span class="tagp pay">${esc(payText(j))}</span><span class="tagp">${esc(j.hoursPerWeek)} h/wk</span><span class="tagp">${esc(where(j))}</span><span class="tagp">${esc(types(j))}</span></div>
      </a>`).join("");
const emptyState = `
      <div class="empty">
        <div><h2>No open roles right this minute.</h2><p>New work is posted as clients need it. Join the network and we'll contact you when something matches your skills and hours.</p></div>
        <a class="btn amber" href="/#join">Join the network <span class="arr">→</span></a>
      </div>`;
write("jobs/index.html", layout({
  title: "Open roles",
  description: "Part-time, project-based and seasonal roles from Avenrix clients: retail, customer support, tech, operations, creative, logistics and specialist work.",
  pathname: "/jobs/",
  body: `<main id="top">
  <section class="page-hero"><div class="wrap">
    <div class="crumbs"><a href="/">Home</a><span>/</span><span>Open roles</span></div>
    <h1>Open roles</h1>
    <p class="lede">Part-time, project-based and seasonal work. Every role lists the hours and pay before you apply.</p>
  </div></section>
  <section><div class="wrap">
    ${openJobs.length > 1 && fieldsOpen.length > 1 ? `<div class="filters" id="jobFilters" role="group" aria-label="Filter by field"><button type="button" data-filter="all" aria-pressed="true">All</button>${fieldsOpen.map((f) => `<button type="button" data-filter="${esc(f)}" aria-pressed="false">${esc(f)}</button>`).join("")}</div>` : ""}
    <div class="job-list">${openJobs.length ? cards : emptyState}
    </div>
  </div></section>
</main>`,
}));

// ---------- job pages ----------
for (const j of openJobs) {
  const list = (arr) => arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const descHtml = `<p>${esc(j.summary)}</p><h3>What you'll do</h3>${list(j.responsibilities)}<h3>What we're looking for</h3>${list(j.requirements)}${j.niceToHave?.length ? `<h3>Nice to have</h3>${list(j.niceToHave)}` : ""}${j.schedule ? `<p>Schedule: ${esc(j.schedule)}</p>` : ""}`;
  const ld = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: j.title,
    description: descHtml,
    identifier: { "@type": "PropertyValue", name: cfg.companyName, value: j.slug },
    datePosted: j.datePosted,
    validThrough: `${j.validThrough}T23:59:59`,
    employmentType: j.employmentType,
    hiringOrganization: { "@type": "Organization", name: cfg.companyName, sameAs: site + "/", logo: site + "/assets/brand/logo-512.png" },
    directApply: true,
    baseSalary: {
      "@type": "MonetaryAmount", currency: j.pay.currency,
      value: { "@type": "QuantitativeValue", minValue: j.pay.min, maxValue: j.pay.max ?? j.pay.min, unitText: j.pay.unit },
    },
  };
  if (j.location.remote) {
    ld.jobLocationType = "TELECOMMUTE";
    ld.applicantLocationRequirements = { "@type": "Country", name: j.location.country || "US" };
  } else {
    ld.jobLocation = { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: j.location.city, addressRegion: j.location.region, addressCountry: j.location.country || "US" } };
  }
  const apply = `/?role=${encodeURIComponent(j.slug)}#join`;
  write(`jobs/${j.slug}/index.html`, layout({
    title: `${j.title} · ${where(j)}`,
    description: `${j.title} (${where(j)}, ${j.hoursPerWeek} hrs/week, ${payText(j)}). ${j.summary}`,
    pathname: jobUrl(j),
    noindex: !isLive(j),
    extraHead: isLive(j) ? jsonld(ld) : "",
    body: `<main id="top">
  <section class="page-hero"><div class="wrap">
    <div class="crumbs"><a href="/">Home</a><span>/</span><a href="/jobs/">Open roles</a><span>/</span><span>${esc(j.title)}</span></div>
    <span class="eyebrow" style="margin-top:22px">${esc(j.field)}</span>
    <h1>${esc(j.title)}</h1>
    <p class="lede">${esc(j.summary)}</p>
  </div></section>
  <section><div class="wrap job">
    <div class="prose">
      <h2>What you'll do</h2>${list(j.responsibilities)}
      <h2>What we're looking for</h2>${list(j.requirements)}
      ${j.niceToHave?.length ? `<h2>Nice to have</h2>${list(j.niceToHave)}` : ""}
      <h2>How it works</h2>
      <p>Apply with a short profile. If you're a match, we'll contact you to confirm the schedule, rate and start date in writing before any work begins.</p>
    </div>
    <aside class="apply-card">
      <dl>
        <dt>Pay</dt><dd>${esc(payText(j))}</dd>
        <dt>Hours</dt><dd>${esc(j.hoursPerWeek)} per week</dd>
        ${j.schedule ? `<dt>Schedule</dt><dd>${esc(j.schedule)}</dd>` : ""}
        <dt>Where</dt><dd>${esc(where(j))}</dd>
        <dt>Type</dt><dd>${esc(types(j))}</dd>
        <dt>Apply by</dt><dd>${esc(new Date(j.validThrough + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }))}</dd>
      </dl>
      <a class="btn amber" href="${apply}">Apply for this role <span class="arr">→</span></a>
      <small>Takes about two minutes. No résumé needed.</small>
    </aside>
  </div></section>
</main>`,
  }));
}

// ---------- legal ----------
const address = cfg.businessAddress || "[add your business address]";
const law = cfg.governingLaw || "[add your state]";
if (!cfg.businessAddress) warnings.push("businessAddress is empty in site.config.json. The Privacy Policy and Terms show a placeholder.");
if (!cfg.governingLaw) warnings.push("governingLaw is empty in site.config.json. The Terms show a placeholder.");
const updated = new Date(today + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const legalPage = (slug, heading, desc, html) => write(`${slug}/index.html`, layout({
  title: heading, description: desc, pathname: `/${slug}/`,
  body: `<main id="top">
  <section class="page-hero"><div class="wrap">
    <div class="crumbs"><a href="/">Home</a><span>/</span><span>${heading}</span></div>
    <h1>${heading}</h1>
  </div></section>
  <section><div class="wrap"><div class="prose">
    <p class="updated">Last updated ${updated}</p>
    ${html}
  </div></div></section>
</main>`,
}));

legalPage("privacy", "Privacy Policy", `How ${cfg.companyName} collects, uses and protects your information.`, `
    <p>${esc(cfg.companyName)} ("Avenrix", "we", "us") runs ${esc(site.replace(/^https?:\/\//, ""))}. This policy explains what information we collect when you use the site, why we collect it, and the choices you have.</p>
    <h2>What we collect</h2>
    <p>When you fill in our form, we collect what you give us:</p>
    <ul>
      <li>Your name and email address</li>
      <li>Your location, main field of work, hours and days you're available</li>
      <li>What you tell us about your skills and experience, or about the work you need done</li>
      <li>For businesses, your company name</li>
      <li>The role you applied for, if you came from a job page</li>
    </ul>
    <p>We also receive basic technical information that any website receives, such as the page you submitted from and the time of submission. We don't use advertising trackers, and we don't sell your information.</p>
    <h2>How we use it</h2>
    <ul>
      <li>To match you with work, or to find people for work you need done</li>
      <li>To contact you about roles, requests and your profile</li>
      <li>To keep the site secure and prevent spam and fraud</li>
      <li>To meet legal obligations</li>
    </ul>
    <h2>Who we share it with</h2>
    <p>We share a person's profile with a client only in connection with a specific role or match. We use a small number of service providers to run the site and store form submissions (for example, our website host and Google Workspace). They process data on our behalf and may not use it for their own purposes. We may disclose information if the law requires it.</p>
    <h2>How long we keep it</h2>
    <p>We keep your information while your profile is active. If we haven't been in touch for 24 months, we delete it. You can ask us to delete it sooner at any time.</p>
    <h2>Your choices and rights</h2>
    <p>You can ask to see, correct or delete your information, or ask us to stop contacting you, by emailing <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>. Depending on where you live, you may have additional rights under local law, such as the California Consumer Privacy Act or the GDPR. We'll respond within 30 days.</p>
    <h2>Security</h2>
    <p>The site uses HTTPS, and access to submitted information is limited to the Avenrix team. No method of storage or transmission is completely secure, but we work to protect your information.</p>
    <h2>Children</h2>
    <p>Avenrix is for people aged 18 and over. We don't knowingly collect information from anyone younger.</p>
    <h2>Changes</h2>
    <p>If we change this policy, we'll update the date at the top of this page.</p>
    <h2>Contact</h2>
    <p>${esc(cfg.companyName)}<br>${esc(address)}<br><a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></p>
`);

legalPage("terms", "Terms of Use", `The terms for using the ${cfg.brand} website.`, `
    <p>These terms apply to your use of ${esc(site.replace(/^https?:\/\//, ""))}, operated by ${esc(cfg.companyName)} ("Avenrix", "we", "us"). By using the site, you agree to them.</p>
    <h2>What the site does</h2>
    <p>The site lets people share their skills and availability, and lets businesses tell us about work they need done. Submitting a profile or request doesn't guarantee a match, a role or any amount of work.</p>
    <h2>Engagements are agreed separately</h2>
    <p>Any work arranged through Avenrix is covered by a separate written agreement that sets out the scope, hours, rate, payment terms and the relationship between the parties. If that agreement conflicts with these terms, the agreement applies.</p>
    <h2>Your information</h2>
    <p>You agree that what you submit is accurate and yours to share. Don't submit anyone else's personal information without their permission. Our <a href="/privacy/">Privacy Policy</a> explains how we handle what you submit.</p>
    <h2>Acceptable use</h2>
    <ul>
      <li>Don't use the site for anything unlawful, misleading or harmful</li>
      <li>Don't post fake roles, impersonate others, or submit spam</li>
      <li>Don't try to disrupt the site or access data you're not authorized to access</li>
    </ul>
    <h2>Content and trademarks</h2>
    <p>The Avenrix name, logo and site content belong to ${esc(cfg.companyName)} or its licensors. Photographs are used under the Pexels license.</p>
    <h2>Disclaimers</h2>
    <p>The site is provided "as is". To the extent the law allows, we disclaim warranties of any kind and aren't liable for indirect or consequential losses arising from your use of the site.</p>
    <h2>Governing law</h2>
    <p>These terms are governed by the laws of ${esc(law)}, without regard to conflict-of-law rules.</p>
    <h2>Changes</h2>
    <p>We may update these terms. The date at the top of this page shows when they last changed.</p>
    <h2>Contact</h2>
    <p>${esc(cfg.companyName)}<br>${esc(address)}<br><a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></p>
`);

// ---------- 404 ----------
write("404.html", layout({
  title: "Page not found", description: "This page doesn't exist.", pathname: "/404.html", noindex: true,
  body: `<main id="top"><section><div class="wrap nf">
    <div class="big">4<em>0</em>4</div>
    <h1 style="font-size:clamp(32px,4vw,52px)">This page is unused capacity.</h1>
    <p class="lede">The link may be old, or the role may have closed. Here are some places that do work:</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="/">Go home <span class="arr">→</span></a><a class="btn ghost" href="/jobs/">See open roles</a></div>
  </div></section></main>`,
}));

// ---------- SEO + hosting files ----------
const urls = ["/", "/jobs/", ...openJobs.filter(isLive).map(jobUrl), "/privacy/", "/terms/"];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);

let connect = "'self'";
if (cfg.formEndpoint) {
  const o = new URL(cfg.formEndpoint).origin;
  connect += ` ${o}`;
  if (o === "https://script.google.com") connect += " https://script.googleusercontent.com";
}
if (cfg.cloudflareAnalyticsToken) connect += " https://cloudflareinsights.com";
const scriptSrc = "'self'" + (cfg.cloudflareAnalyticsToken ? " https://static.cloudflareinsights.com" : "");
const HEADERS = [
  ["/*", {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src ${connect}; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'`,
  }],
  ["/assets/*", { "Cache-Control": "public, max-age=31536000, immutable" }],
  ["/assets/img/*", { "Cache-Control": "public, max-age=2592000" }],
];

// Cloudflare Pages and Netlify read dist/_headers.
write("_headers", HEADERS.map(([p, h]) => `${p}\n${Object.entries(h).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`).join("\n\n") + "\n");

// Vercel reads vercel.json from the repository root before building, so it is written there and committed.
const vercel = {
  $schema: "https://openapi.vercel.sh/vercel.json",
  framework: null,
  buildCommand: "npm run build",
  outputDirectory: "dist",
  headers: HEADERS.map(([p, h]) => ({
    source: p === "/*" ? "/(.*)" : p.replace("/*", "/(.*)"),
    headers: Object.entries(h).map(([key, value]) => ({ key, value })),
  })),
};
const vercelJson = JSON.stringify(vercel, null, 2) + "\n";
const vercelPath = r("vercel.json");
if (!fs.existsSync(vercelPath) || fs.readFileSync(vercelPath, "utf8") !== vercelJson) {
  fs.writeFileSync(vercelPath, vercelJson);
  if (!process.env.VERCEL && !process.env.CF_PAGES) warnings.push("vercel.json was updated. Commit it so Vercel uses the new settings.");
}

// ---------- report ----------
if (!cfg.formEndpoint) warnings.unshift("formEndpoint is empty in site.config.json. The form runs in preview mode and SENDS NOTHING. See README step 2.");
const drafts = allJobs.filter((j) => !isLive(j)).length;
if (previewDrafts) warnings.unshift("PREVIEW BUILD: draft jobs are included. Do not upload this dist/ folder. Run node build.mjs without --preview-drafts before deploying.");
console.log(`Built dist/ · ${openJobs.length} open job page(s), ${drafts} draft/closed job(s) skipped.`);
for (const w of warnings) console.log("  ! " + w);
