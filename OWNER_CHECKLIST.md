# Owner checklist

The website works locally. These inputs complete the editorial content and account-side publishing setup.

## Content

- [ ] Add real descriptions/responsibilities and contribution information for Organisation, Awareness, Communication and Community. Add/remove/hide/reorder Areas in Pages CMS as needed.
- [ ] Publish the Google membership form and supply its **responder URL** (not its editor URL), plus confirmed eligibility, fee, duration and approval process. Set the URL and action text in Join Us through CMS. The public-event invitation and email fallback work until then.
- [ ] Choose/configure the external event registration service. For every registration event, supply its URL, opening if needed and closing deadline, and test that the **form service** enforces the closing instant. Close the form too when cancelling/manually closing an event.
- [ ] Confirm the founding year/“first organisation” claim, 2026 Pride flag milestone and Collettivo's role, and year/details of first joint Pride participation. Keep each pending record unpublished until confirmed; publication requires both the published flag and confirmed verification.
- [ ] Add approved full-guide content/destinations to the Emergency/Crisis Resources (verified emergency and crisis numbers only), Trans* Etiquette, Collettivo Etiquette, You are not alone, Sexual Health & STI Guide, and Alias career resource previews, then publish through CMS. The listing shows linked names and short summaries; detail pages contain metadata, approved links and a coming-soon message. Publishing exposes the full body at the same URL; unfinished bodies stay hidden.
- [ ] Supply actual events and articles. Event covers become calendar stickers; an optional calendar image can override the cover. No sample events or advice are published.
- [ ] Choose an approved opening Home photo under **Home → Full-width opening photo**, provide descriptive alternative text and set its crop focus. The local demo image is a generated preview; an uploaded CMS photo takes priority. Use the enable switch to hide the opening image.
- [ ] Supply supporter names, image click destinations, uploaded images and meaningful alternative text. Visible supporters with an image appear in Home's linked image-only strip; relationship notes are not displayed. The supplied site logo's light/dark versions are installed and can be replaced in Site settings.
- [ ] Confirm the intended Telegram destination. The supplied short link currently resolves to the Collettivo's Linktree page.

## Accounts and launch

- [ ] Supply/create the association-owned GitHub repository and grant the appropriate repository/editor access. Push the complete reviewed project to `main`.
- [ ] Authorise hosted Pages CMS for that repository. Test saving a page field and uploading an image, then inspect the resulting GitHub commit.
- [ ] Connect GitHub to Cloudflare Pages with `npm run build`, output `dist`, production branch `main`, and Node `24.21.0`. Verify a Pages deployment/preview before touching the domain.
- [ ] Coordinate Cloudflare, registrar and DNS access. Export/reproduce the entire existing DNS zone, especially mail/DNSSEC/CAA records. Current public nameservers are Aruba/Technorail and MX points to `smtp.google.com`.
- [ ] Complete the apex custom-domain setup through Pages; configure www → HTTPS apex and HTTP → HTTPS; verify certificates and preserved nested paths/query strings for both hostnames, plus email continuity.
- [ ] Enable Pages Web Analytics in dashboard mode and redeploy, or explicitly configure manual mode with its public site token and dashboard injection disabled. Confirm the apex hostname/EU visitor settings, one beacon and real visits/page views/performance data from Italy. Tracking is not connected yet.
- [ ] After deployment, verify the domain in Google Search Console/Bing Webmaster Tools, submit the sitemap, inspect real indexing/canonicals and structured data, and check hosting rules permit search crawlers including OAI-SearchBot. `robots.txt` permits crawling and explicitly allows OAI-SearchBot.

## GitHub Pages demo publication

- [ ] In the GitHub repository **Settings → Pages**, set **Source** to **GitHub Actions**.
- [ ] Ensure **Settings → Actions → General → Workflow permissions** allows read and write permissions for workflows.
- [ ] Push the commit to `main` to trigger the automated deployment workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
- [ ] Verify the live demo site at **https://soemre.github.io/catweb-demo/**, including all 148 demo records, images, theme toggle, calendar agenda, and milestone timeline.

Form responses and membership records belong in the chosen form service, outside this public-content repository. Detailed commands and connection/cutover steps are in [README.md](README.md).
