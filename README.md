# Collettivo Alan Turing website

A static Astro website with English editorial content, hosted Pages CMS configuration, and a shared live event browser. Canonical production address: **https://collettivoalanturing.it/**.

## Status

The local implementation is runnable and verified. GitHub/Cloudflare connections, a hosted CMS save, a Pages preview deployment, production cutover and actual analytics collection await owner account access. No production deployment or DNS change has been made.

The public site contains the supplied copy, four editable Area names and two supplied non-historical achievement examples. The three historical milestones remain unpublished/pending verification. Resources are a flat collection with four visible title/summary previews and an Alias career preview with its verified official university link. Full guide bodies remain unpublished until approved. The former topic records are preserved in `content/archive/resource-topics/`. Events, news and supporters are intentionally empty. Testing fixtures never enter production content.

## Local development

Supported runtime: **Node 24.20.0 or newer within Node 24**. The version files, CI and Cloudflare instructions pin **24.21.0**. Astro is pinned to **7.3.8**; `package-lock.json` locks the complete dependency tree. Both Node 24.20.0 and the Nix shell's 24.21.0 were exercised locally.

With Nix:

```sh
nix develop
npm ci
npm run dev
```

Before the first Git commit, use `nix develop path:.` so Nix can see the untracked flake. `flake.lock` pins Nixpkgs. The Linux shell includes Chromium and sets `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; macOS provides Node/Git and needs a separate Playwright browser installation.

Without Nix, install the pinned Node version, then:

```sh
npm ci
npm run dev
```

The dev server prints its local URL, normally `http://localhost:4321/`.

To reach it using the machine hostname `nixos`, listen on the network and allow that hostname:

```sh
npm run dev -- --host 0.0.0.0 --allowed-hosts nixos --port 4321
```

The same flags work with `npm run preview` for the built site.

```sh
npm run check          # content/CMS validation and Astro/TypeScript diagnostics
npm test               # unit tests
npm run build          # validate, build dist/, check internal links/media/hosting limits
npm run preview        # serve the production build locally
npm run build:pages    # build for GitHub Pages with base /catweb-demo
npm run preview:pages  # preview GitHub Pages build locally
```

For browser tests, first run the production build, then:

```sh
# Outside the Linux Nix shell, install Playwright's browser first:
npx playwright install chromium
npm run test:e2e
```

On Ubuntu/Debian, `npx playwright install --with-deps chromium` also installs browser system dependencies. For an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path instead. Linux Nix users can run `npm run test:e2e` directly inside the shell.

The browser runner recreates `.test-site/` with deterministic test collections, builds an isolated fixture project, changes CMS page/Area/event/form values and rebuilds, then checks both that project and the real production build. It verifies one manual analytics loader in a test-only build and zero source loaders in dashboard mode, without contacting an analytics site. `.test-site/` is generated output: edit `tests/fixtures/`, not that directory. Screenshots are written under `test-results/`.

Astro currently emits warnings for genuinely empty collections. These are expected for the initial content; the build and empty public pages still work.

### Populate a local demo

```sh
npm run demo:seed
npm run dev
```

This creates **148 fictional demo records** alongside the real content: 38 events, 54 posts (12 News, 12 Articles, 10 Announcements, 16 Milestones and 4 drafts), 22 resources, 9 Areas, 12 achievements and 13 supporters. It also generates **39 local assets**: colourful SVG covers, eight illustrated gallery scenes, six transparent cutout stickers, twelve transparent sponsor images, and downloadable documents. News examples include switchable multi-photo headers, gallery-only entries, cover-only entries and entries without artwork.

Seeding also writes the Git-ignored `content/pages/demo-home-hero.demo.json` preview configuration, reusing one of the generated scenes for the Home opening photo. A real CMS-selected photo takes priority, and disabling the opening photo hides either source. Seed/reseed/clear never write or restore `content/pages/home.json`; clearing removes only the reserved hero sidecar and demo records/assets. Clean builds without this sidecar do not reference ignored demo media.

Events include three near-term countdown examples (20 minutes, four hours and thirty hours after seeding), a programme more than one hundred days away, ongoing/upcoming/past gatherings spread across months, open/scheduled/closed registration, cancellation, a multi-day programme, four events sharing one date, and recaps with galleries/materials. Resources cover published and preview guides, external links, and files. Hidden/draft/pending entries exercise the existing visibility rules. Every visible demo title or achievement is labelled **Demo**. Sponsor images have no canvas backing and use coloured artwork/text so their transparency can be previewed in both themes.

Generated records use `demo-*.demo.md` or `demo-*.demo.json`, for example `content/news/demo-milestone-1.demo.md`. Assets live in `public/media/demo-content/`. These generated files are ignored by Git; the reusable generator and npm commands can be versioned. You can edit the demo files directly to try other layouts. Re-seeding replaces that reserved demo file family and refreshes event dates relative to the current time. For a fixed reference date, use `npm run demo:seed -- --date 2026-10-12`.

To remove the demo:

```sh
npm run demo:clear
```

The clear command removes only the generator's `demo-*.demo.*` records/assets, preserving ordinary content, page settings, archived records and unrelated files. Run `npm run build` after seeding or clearing when using `npm run preview`; `npm run dev` loads the source records directly. The browser regression suite (`npm run build` then `npm run test:e2e`) uses isolated fixtures for populated/empty browsers and supports the local demo alongside the supplied production previews.

## Structure

| Path | Purpose |
| --- | --- |
| `content/site.json` | Shared identity/contact facts, navigation destinations, footer, interface wording, empty states, theme default |
| `content/pages/*.json` | Each ordinary page's copy, links, metadata and preview/browser settings |
| `content/areas/*.json` | Any number of Areas, optional rich descriptions/contributions, visibility/order |
| `content/achievements/*.json` | Rich achievement text, order, publication and verification state, editorial notes |
| `content/events/*.md` | One event post and its event/registration metadata |
| `content/news/*.md` | News, Article, Announcement and Milestone posts |
| `content/resources/*.md` | Standalone guides, external resources and linked files, ordered through CMS |
| `content/archive/resource-topics/*.json` | Preserved original topic records; not loaded or published |
| `content/supporters/*.json` | Names, links, optional logos/alt text, rich relationship descriptions, order/visibility |
| `public/media/` | CMS-uploaded images and files, publicly served at `/media/` |
| `public/fonts/` | Self-hosted Apfel Grotezk webfonts and their SIL Open Font License |
| `.env.example`, `src/lib/analytics.ts` | Explicit dashboard/manual/off analytics configuration |
| `.pages.yml` | Hosted Pages CMS editors, fields and media configuration |
| `src/content.config.ts`, `src/lib/schemas.ts` | Astro content loaders and typed validation |
| `src/lib/events.ts`, `src/lib/dates.ts`, `src/lib/event-agenda.ts` | Shared registration/time/calendar rules and chronological day grouping |
| `src/components/`, `src/layouts/`, `src/styles/global.css` | Shared presentation, separate from content |
| `src/scripts/` | Theme control, event browsing and deadline updates |
| `tests/`, `scripts/` | Verification and isolated fixture builds |

The public routes are `/`, `/join/`, `/events/`, `/milestones/`, `/news/`, `/resources/`, `/contact/`, and published `/events/[slug]/`, `/news/[slug]/` and internal `/resources/[slug]/` posts. Missing destinations use `404.html`.

The sticky topbar has six primary navigation links, with **Milestones** after **Events**, and an always-visible right-side **Join Us** call-to-action. On mobile the visible order is theme switch, Join Us, then the icon-only menu button at the far right, with a generous tap target and no border/background. The mobile disclosure menu supports keyboard opening and Escape/focus restoration; without JavaScript all navigation stays visible. One light/dark switch follows device preference initially, then persists manual choices. Contact shows plain email above a social icon row; the footer right-aligns its email and the social row below it on desktop, then aligns its logo, tagline, email and icons to one left edge when stacked on small screens. It has no contact heading. Association details remain on Contact. The footer tagline is “A safe space for every student who needs one.” The footer is the document's final edge, with bottom-edge overscroll disabled and dynamic viewport sizing for mobile browsers. Dark mode uses a pure-black base with neutral controls; content previews and empty states use spacing/separators rather than boxes. All live text uses locally served Apfel Grotezk.

Ordinary pages use their descriptive `headline` as the single H1 instead of repeating the navigation/page name. News and Events use accessible page headings with their introductory copy omitted; the Events heading is visually hidden so the page opens directly on the calendar/agenda. Browser tabs always use the CMS page `title` or individual post/resource title followed by the association name, for example “Events · Collettivo Alan Turing” or “Trans* Etiquette · Collettivo Alan Turing”. Optional metadata titles customise social sharing, not the browser tab name. Full event, news and guide posts use their individual post titles as the H1.

There is no separate About page. Area names are displayed without invented descriptions. Choosing an Area now or later remains equally welcome. No translation switch, translation automation or Charter of Values content is included.

## Connect Pages CMS and publish

1. Create the owner-supplied GitHub repository, preferably under the Collettivo's organisation. Review and push this project to its `main` branch, including `.pages.yml`, both lockfiles and media. Do not upload dependencies, generated builds, account credentials or form response records.
2. Open **https://app.pagescms.org/**, sign in with GitHub and authorise/install the Pages CMS GitHub app for that repository. An organisation administrator may need to grant the app repository access.
3. Select the repository and `main`. The editors defined in `.pages.yml` should appear. Give editors the appropriate repository/app access.
4. Connect the same GitHub repository to Cloudflare Pages using the settings below.
5. As the first account-side check, change an ordinary page field in Pages CMS, save it, confirm its GitHub commit, then confirm the successful Pages deployment and the published change. Also upload one image and confirm its deployed `/media/` URL. These hosted checks have not yet been performed.

**Saving is not instantaneous publication.** Pages CMS saves to GitHub. Cloudflare then queues, validates, builds and deploys the commit. Expect a build/deployment delay, usually measured in minutes; follow the actual deployment status rather than a fixed promise. A failed build leaves the last successful deployment live. Correct the entry and save again.

Public prose uses rich-text editors stored as Markdown. Use `##` and lower-level headings inside posts, since the template already supplies the page title. Links in prose are edited in the rich-text editor. Dedicated destinations use simple URL fields. Optional metadata fields customise the sharing title, search/sharing description and image; empty values use the page title, introductory copy and site defaults. The browser tab name comes from the page/post title.

### Entries and publication

- New event/news/resource entries default to `draft`. They may be incomplete and do not produce pages, previews, calendar links, sitemap entries or client event data.
- To publish a post, provide a title, stable slug, summary and full body; news also needs a publication date. External/file resources need their matching destination instead of an internal guide body.
- To add a milestone, create a post under **News, article & milestone posts**, choose **Milestone**, and supply both **Publication date** and **Milestone date (when it happened)**. Published milestones appear in News/Home by publication date and on `/milestones/` by milestone date, newest first. Their full stories keep `/news/{slug}/` URLs and link back to the timeline. The timeline shows titles/dates and optional stickers beside circles along a rounded winding path: three dots per row on desktop, two on narrow screens. Hover and keyboard focus draw an outer ring and show the floating tooltip; touch devices open stories directly without permanent hint labels. Page copy, tooltip, empty state and metadata are editable under **Milestones page & timeline**. The timeline works without JavaScript and respects reduced motion.
- Published registration events need coherent times, a real external registration URL, a closing deadline and button wording. Invalid content fails the deployment build with a field-specific error.
- News & Articles fits beneath the header with independently scrollable story/list panels on desktop. The selected story is on the left, and a compact title/date/category/sticker list is on the right. The newest post is initially selected. Selecting another story preserves the list position and updates its permalink, browser title and sharing metadata in place; Back/Forward restores both panel positions. The news return link appears only in the single-column layout, where mobile shows the list or one story. Every published story retains its static `/news/{slug}/` page and remains readable without JavaScript. Photo headers fade into the page, with previous/next and keyboard controls for additional photos; native horizontal photo scrolling works without JavaScript.
- Home shows up to three nearest future, non-cancelled published events in side-by-side boxes (stacked on small screens). Each has separate countdown digit boxes for days/hours/minutes/seconds, updated every second from real timestamps. At its exact start an event leaves Home and the next upcoming event fills the slot. Countdown ticks preserve links/focus and use a non-live accessible timer label. The latest five entries across all news categories use the same compact title/date/category/sticker list as News. Home counts are CMS-editable within 0–3 events and 0–5 news entries; zero hides the section, and fewer available records produce fewer items.
- **Home → Full-width opening photo** controls the optional opening image, meaningful alt text, enable switch and horizontal/vertical crop focus (0–100%). The image is a real, eagerly loaded content block beneath the header. The single Home H1 and safe-space sentence sit over its lower portion, while the introduction overlaps the lower edge. A theme-aware gradient connects the photo to the page, and its visual layer fades as the block scrolls out without changing document height. Reduced motion and no JavaScript retain ordinary scrolling and the static gradient. Disabling the photo, or leaving it empty without seeded demo artwork, restores the text opening with no hero spacer. The hero photo is also the fallback sharing image when no SEO image is supplied.
- Areas can be added, removed, hidden or reordered using `visible` and numeric `order`; no template assumes four Areas.
- An achievement appears only when **both** `published` is true and `verification` is `confirmed`. Confirm the historical claims before changing these fields. Editorial notes are omitted from the site, but remain in the repository.
- Resources are individual entries in one flat list, not categories containing more resources. Set `order` to arrange them. The listing shows only each linked name and short summary, separated by space rather than lines. All preview and published resources—including external links and files—get `/resources/{slug}/` detail pages, where their images, provider, last-checked date, approved body and external/download destinations appear. `Draft` is hidden; `Preview` withholds unfinished body text; `Published` exposes the full resource. Guide previews also show the CMS-editable “The full guide is coming soon” message. Publishing an approved guide exposes its full body at the same URL. The five supplied resources are previews; Alias career's detail page includes the official university link. Editorial notes do not appear on the site.
- Supporters appear in Home's full-page-width, image-only strip when both `visible` and an uploaded image are supplied, ordered by `order` then entry ID. Each image links directly to its CMS destination; organisation names provide accessible link labels and fallback image alt text. Relationship notes remain editable but are not displayed. The strip loops right to left, pauses on hover/focus without playback buttons, and becomes a static horizontally browsable row for reduced motion or without JavaScript. Loop copies retain pointer links without duplicate screen-reader/Tab entries. Empty strips are omitted; a single image remains a static link. The accessible strip heading and countdown labels are editable under Home. A published cover or gallery image needs alternative text.

### Uploads

The media library, rich-text editor and image/file fields all write into `public/media/` and save `/media/...` URLs. The directory is copied to `dist/media/` without an SSR image service. Uploads and their referencing content may create separate commits/deployments; save the content after the upload is available.

Events and all news categories have an optional **Sticker** upload separate from the cover and photos. Transparent PNG/WebP and SVG artwork is displayed as an uncropped, tilted cutout, with no square backing or colour inversion. The linked title labels decorative stickers, so they do not need separate alternative text. Event stickers appear in the events-only calendar; milestone stickers sit beside the existing timeline circles; news stickers appear in the compact list and reader. News **Additional photos** follow the cover in editorial order, with duplicate image paths shown only once. Each photo needs meaningful alternative text; captions are optional.

Use meaningful alternative text. Supporter images keep transparent backgrounds without a white backing and are not colour-inverted in dark mode. Compress large images before upload. Cloudflare's single-asset limit is **25 MiB**; validation rejects larger files. The build checks that all local rendered media destinations actually exist.

The supplied site logo was downloaded from `https://www.collettivoalanturing.it/img/logo.svg` and stored at `public/media/collettivo-alan-turing.svg`. Its empty canvas is trimmed. The separate `collettivo-alan-turing-dark.svg` uses a light foreground with the same rainbow fills. CSS selects the appropriate static image from the explicitly selected website theme in both header and footer; without JavaScript it follows the device preference. Neither image contains its own operating-system theme rules. Replace the light and optional dark versions in Site settings. A single uploaded logo gets a neutral white backing in dark mode; clearing the light version restores the text identity. `npm run prepare:logo` explicitly regenerates the supplied artwork's dark version; ordinary builds do not modify uploaded logos.

Apfel Grotezk's unmodified Regular, Mittel and Fett WOFF2 files come from the official Collletttivo repository and are served locally with `font-display: block`. They are mapped to normal (400), medium (500) and bold (700); the licence is at `public/fonts/Apfel-LICENSE.txt`. All three faces are preloaded and `/fonts/*` is cached as immutable (see `public/_headers`), so rename a font file when replacing it. All site text uses Apfel Grotezk with system fallbacks. The previous Kavoon trial font has been removed.

Interface and social icons use the free, MIT-licensed **Phosphor Icons Bold** family (`@phosphor-icons/core`, pinned to 2.1.1), chosen to match Apfel's heavier shapes. `src/components/Icon.astro` embeds only the selected SVG paths at build time; visitors load no external icon service, icon font or icon JavaScript. Icons inherit theme colours and remain decorative beside accessible link/control labels. The licence is included at `public/licenses/Phosphor-Icons-LICENSE.txt` and shipped with the static site.

### Stable URLs

The post `slug`, not the title or filename, supplies the URL. Changing the title leaves the URL intact. For a deliberate published slug change:

1. Add a 301 entry to `public/_redirects` for the old path, for example `/events/old-slug/ /events/new-slug/ 301` (replace both with the real paths).
2. Change the slug and update links that deliberately reference the old path in prose/settings.
3. Build and check the new destination, then deploy and verify the redirect on Pages, including a request with a query string.

The migration example is documentation, not an active redirect. Keep old post URLs readable through redirects rather than deleting their history.

## Search and AI-search discoverability

Home identifies the Collettivo naturally as an LGBTQ+ organisation and queer student community at **Politecnico di Torino (PoliTO)**. Every main page has a clear page-based browser title, a CMS-editable search description and an optional sharing title reflecting its purpose, with LGBT/LGBTQ+, queer, safe-space and campus wording where relevant. The approved safe-space sentence below the Home headline is retained.

`src/lib/seo.ts` produces JSON-LD from the same editable site/page facts. Home contains `Organization`, `WebSite` and `WebPage`; other indexable pages refer to the same site/organisation IDs through `WebPage`. It uses the configured name, description, URL, logo, email and direct social profiles. It does not invent founding dates, university department/member status, offers or event venues. The current shortened Telegram URL is not treated as a verified Telegram identity. 404 remains noindex and has no entity markup. Drafts/pending achievements remain excluded from public output and the sitemap.

The site supplies semantic, static HTML, real internal post links, HTTPS-apex canonicals, a sitemap and crawl-permitting `robots.txt`. Google's AI Overviews/AI Mode use normal SEO fundamentals and require no special AI markup/files. OpenAI identifies **OAI-SearchBot** as its search crawler; it is explicitly allowed. Other crawlers follow the general allow rule.

After deployment, the owner should:

1. Verify the domain in Google Search Console and Bing Webmaster Tools and submit `/sitemap-index.xml`.
2. Use URL Inspection and Google's Rich Results Test to inspect actual deployed HTML/JSON-LD, indexing eligibility and canonicals.
3. Check Cloudflare security/bot rules do not block Googlebot, Bingbot or OAI-SearchBot; inspect genuine crawler requests and published provider IP/verification guidance.
4. Monitor indexing, search queries and referrals once data arrives. Technical validation improves discoverability; rankings and inclusion/citation in AI answers are not guaranteed.

These account-side indexing/crawler checks have not been performed. Search Console/Bing ownership access and a deployed site are still required.

## Event timestamps, registration and browser behaviour

### Exact CMS date convention

Event datetime fields use `time: true`, an empty default, and the date-fns output format **`yyyy-MM-dd'T'HH:mm:ssXXX`**. The CMS picker uses **the editor's device timezone**, not a selectable Rome timezone. For Italy-local entry, set the editor device timezone to Europe/Rome before entering times. An editor elsewhere must enter the corresponding local instant. Verify the saved offset-bearing value.

Examples of the same 18:00 Rome wall time in different seasons:

```text
Winter: 2026-01-01T18:00:00+01:00
Summer: 2026-07-01T18:00:00+02:00
```

ISO values ending in `Z` are also accepted. Seconds and an explicit offset or `Z` are required; timezone-less event timestamps are rejected. News publication dates and resource last-checked dates are date-only `yyyy-MM-dd`, not event instants.

Display always uses `Intl.DateTimeFormat` with **Europe/Rome**, including its timezone abbreviation/offset. No build-server or visitor timezone is used to interpret stored event values. Astro's YAML reader may turn an unquoted timestamp into a `Date`; the schema normalises it back to ISO without changing the instant. Source validation happens before that conversion.

DST tests cover the spring jump (`2026-03-29T01:30:00+01:00` → `03:30:00+02:00`) and both autumn occurrences of 02:30 (`2026-10-25T02:30:00+02:00` and `02:30:00+01:00`, one hour apart). The nonexistent spring hour must not be used as Rome-local time. A local picker cannot explicitly choose both occurrences of the autumn repeated hour; if the second is intended, verify/correct the saved ISO offset in the source entry and run validation. CMS serializer round trips are tested with Rome, New York and Tokyo device timezones. The connected hosted editor's actual save still needs the account-side check above.

### Rules

- `start < end`; an opening, when supplied, is before closing; closing cannot be after event end. Drafts may have unfinished windows.
- Upcoming means `now < start`; happening now means `start <= now < end`; past means `now >= end`. Home countdown cards include only future, non-cancelled published events.
- The full agenda includes all published past and future events, grouped by occupied Rome dates in chronological order; rows within a date use actual start instants, then slug. Home countdown cards use future starts nearest first, then slug, and are replaced at the exact start. Cancelled posts remain discoverable in Events.
- Registration precedence is **cancelled → ended → manually closed → no registration needed → scheduled opening → deadline closed → open**. The exact opening is open; the exact closing is closed. No opening means no scheduled-opening restriction.
- Desktop Events shows an independently scrollable month calendar on the left and a compact all-events agenda on the right, fitted beneath the header. Selecting a calendar date highlights and scrolls to that agenda day without hiding other groups; an empty selected date gets a temporary dated message. Calendar month navigation does not restrict the agenda. Small screens stack the calendar above the agenda, with normal page scrolling and a “Back to calendar” shortcut. View/filter controls are removed. Multi-day events appear on each occupied Rome day through their exclusive end, so a midnight finish does not occupy the following day. Event links open the existing full post; browser Back and reload restore the month, selection and scroll positions.
- `?day=YYYY-MM-DD` selects a date and `?month=YYYY-MM` chooses the displayed month. Invitations use `?focus=upcoming` to jump to an ongoing/upcoming event date while keeping the full agenda. Old `?filter=upcoming|past` links are treated as jump destinations, never as filters. Browser wording and empty states are editable under **Events calendar & agenda**.
- Calendar artwork uses each event's `sticker`, then its existing `calendarImage`, then its cover. Transparent uploads keep their cutout shape, with hover/focus highlighting following the artwork's alpha silhouette. Up to three stickers overlap with alternating rotations/offsets; focus brings an individual sticker to the front. If a date has more events, its “Show more” button jumps to that day's complete agenda group. Date selection keeps focus in the desktop calendar and moves it to the date heading in the stacked mobile agenda; live status refreshes preserve focus and scroll. A text sticker is used when no image is supplied. Thumbnails are decorative because the linked title supplies their accessible purpose.
- Browser scripts recalculate immediately, schedule exact relevant boundaries, and recheck on focus, visibility return and back/forward restoration. Calendar/registration use a 30-second clock-change heartbeat; Home countdowns use a one-second heartbeat. Countdown values are recalculated from actual instants rather than decremented, including across DST or background suspension. Time passing requires no rebuild or scheduler.
- Joining links are created only after a browser-time check and removed when closed. A click rechecks the state. With JavaScript disabled, the statically rendered agenda, full posts, dates and deadlines remain readable, with no active registration link; Home links to the Events page instead of showing potentially stale previews. Static agenda rows show date/time information and cancellations; live past/upcoming labels are applied only in the browser.

### The external form must close too

The website's clock only controls its joining link. **It does not prevent submissions to an external form.** Choose/configure the registration service, set the same closing instant/timezone there, and verify it refuses submissions at and after the deadline, including via a previously opened or directly shared form URL. When manually closing/cancelling an event, close the external form too.

No registration-service account or real form URL was supplied. Configured external URLs will be integrated as links. Website-handled submissions would require server-side deadline validation in a later implementation.

Membership uses a **Google Form link**, as selected by the owner. In Google Forms, publish the form, set appropriate responder access and copy the **responder link**, not an `/edit` URL. Set it under Join Us → Membership → Published Google Form responder URL. A configured URL renders the editable “Fill in the membership form” action. Until supplied, the event invitation and shared email fallback work. The website does not create a Google Form or simulate submissions. Eligibility, fee, duration, process and general membership information remain optional editable fields. Responses and membership records stay in Google Forms/the chosen form service, outside this public-content repository.

## Cloudflare Pages deployment

Use **Pages Git integration**, with static Astro output. The installed project needs no SSR adapter, Functions, Wrangler bindings or paid scheduler.

1. In the owner's Cloudflare account, open **Workers & Pages → Create application → Pages → Import an existing Git repository**.
2. Authorise GitHub and select the association repository.
3. Set:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Root directory | Repository root |
| Build environment | Current v3 build image |
| `NODE_VERSION` (production and preview) | `24.21.0` |

The checked-in `.nvmrc` / `.node-version` also pin Node. Pages v3 does not infer Node from `package.json` engines. No secret build variables are needed for this static project.

4. Save and deploy. Inspect the build log and open the **actual** assigned Pages URL; no project name or URL has been invented here.
5. Exercise navigation, empty states, keyboard controls, both themes and media on the Pages URL. Test branch/PR preview deployments before production domain cutover. Preview metadata intentionally retains production canonical URLs; Cloudflare supplies preview indexing protection.

The GitHub workflow runs validation, type checks, unit tests, build and Chromium checks after pushes/PRs when the repository is connected. It is configured locally, not yet run on GitHub. CI and Pages builds are independent; a CI result is not itself a Pages deployment gate.

Current Pages Free limits include **500 builds/month**, **one build at a time**, **20,000 files/site**, **25 MiB/file** and a **20-minute build timeout**. The project checks the file count/asset size limits. CMS saves/uploads consume commits and can trigger additional builds. Keep to included GitHub Actions allowances for the chosen repository plan. Domain registration/renewal remains a separate existing registrar cost.

## GitHub Pages deployment (Demo publication)

The site is configured to deploy directly to GitHub Pages at **https://soemre.github.io/catweb-demo/**, intentionally including all 148 demo records and 39 local assets to serve as an interactive demo of the full site.

### One-time repository setup on GitHub

1. Open the repository on GitHub: **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions** (not "Deploy from a branch").
3. Ensure GitHub Actions workflow permissions allow Pages deployment: **Settings → Actions → General → Workflow permissions** set to **Read and write permissions** (or allow the workflow's explicit `pages: write` and `id-token: write` permissions).

### Automated deployment workflow

The repository includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which automatically:
- Triggers on every `push` to `main` (and can be triggered manually via `workflow_dispatch`).
- Checks out the repository, installs dependencies via `npm ci`, and validates content/types (`npm run check`).
- Builds the site using `GITHUB_PAGES=true npm run build`, which sets `site` to `https://soemre.github.io` and `base` to `/catweb-demo`.
- Uploads the `dist/` directory as a Pages artifact using `actions/upload-pages-artifact@v3`.
- Deploys the artifact to GitHub Pages via `actions/deploy-pages@v4`.

### Subpath handling and assets

- **Jekyll bypass**: [`public/.nojekyll`](public/.nojekyll) is copied to `dist/.nojekyll` during build. This instructs GitHub Pages not to run Jekyll processing, preventing the silently dropped `_astro/` asset directory and 404s on stylesheets and scripts.
- **Dynamic base URL**: [`src/lib/urls.ts`](src/lib/urls.ts) exposes `withBase` and `stripBase` helper functions that safely prepend `import.meta.env.BASE_URL` across internal links, images, preloads, and client routing without breaking external URLs, hash anchors, or mailto links.
- **Self-hosted fonts**: `@font-face` rules in [`src/styles/global.css`](src/styles/global.css) use relative font paths (`url('../fonts/ApfelGrotezk-*.woff2')`), allowing the browser to resolve font files correctly relative to the emitted CSS in `_astro/` across both root and subpath deployments.
- **Demo records**: The 148 demo events, news articles, resources, achievements, and supporters are committed in the repository so the published demo site is fully populated and interactive out of the box.

## Cloudflare Web Analytics

Use the Pages dashboard integration:

1. Open the Pages project → **Metrics → Enable** under Web Analytics.
2. Trigger a new deployment; Cloudflare inserts its beacon on that deployment.
3. In **Web Analytics → Manage site**, confirm the production hostname is `collettivoalanturing.it` and review its visitor rules. Do not select **Enable, excluding visitor data in the EU** for this Italy-facing site.
4. Check a deployed page for exactly one beacon, make a real visit from Italy/the EU, and confirm visits/page views and performance data arrive in the dashboard. Allow for processing delay and test with content blocking disabled.

The default `PUBLIC_ANALYTICS_MODE=dashboard` emits no source beacon, avoiding duplication with the dashboard. No Cloudflare account/project or token has been connected: analytics is **not active or verified** yet. Basic visits, page views and performance statistics are the agreed scope.

If dashboard injection is not used, an explicit manual fallback is available:

```text
PUBLIC_ANALYTICS_MODE=manual
PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=<public site token copied from Web Analytics>
```

Set these build variables in Pages (or a local ignored `.env` file). Do not enable dashboard injection at the same time. Configuration rejects a token in dashboard mode and rejects missing/invalid manual tokens. Manual mode adds one loader in production builds, which loads Cloudflare's module only on the configured canonical hostname; local/preview hostnames do not collect data through it. `PUBLIC_ANALYTICS_MODE=off` disables the source loader; also disable the dashboard integration if it was enabled. `.env.example` documents the options. The token is the public **site token**, not an account API credential. Actual beacon delivery, hostname/EU rules and dashboard data still need production verification.

## Existing-domain cutover (owner coordination)

Public DNS checked on **12 October 2026** returned Aruba/Technorail nameservers (`dns.technorail.com`, `dns2.technorail.com`, `dns3.arubadns.net`, `dns4.arubadns.cz`) and MX `1 smtp.google.com`. This is an observation, not a complete DNS-zone backup or proof of account ownership.

1. First finish and verify the Pages preview. Obtain the owner’s registrar, DNS and Cloudflare access, and inspect the actual accounts/zone.
2. Export the **complete** existing DNS zone before changing anything. Preserve MX, SPF, DKIM, DMARC, mail-related hosts, verification TXT records, other services and existing CAA settings. DNS imports/scans may miss records. Coordinate DNSSEC/registrar DS changes where applicable, so a nameserver move does not break validation.
3. Add the domain as a zone in the same Cloudflare account as Pages, reproduce the existing records, then coordinate the nameserver change with the current registrar. Domain registration can remain there. Apex Pages hosting requires Cloudflare nameservers; it is not just a CNAME change at the old DNS provider.
4. Once the zone is active, open the Pages project → **Custom domains → Set up a domain** and add `collettivoalanturing.it`. Use the project flow so Pages associates the domain and creates its hosting record. Check certificate activation and any CAA restrictions.
5. Follow Cloudflare's www redirect guide: create a Bulk Redirect from `www.collettivoalanturing.it` to `https://collettivoalanturing.it`, status 301, with **Preserve query string**, **Subpath matching** and **Preserve path suffix** enabled. Create its Bulk Redirect rule and a proxied `www` A record to `192.0.2.1` as documented (replace an existing www record, do not create conflicting A/CNAME records). Confirm the zone certificate covers www.
6. Enable/configure HTTP → HTTPS for the site hosts, keeping paths and query strings. Inspect existing rules for conflicts/loops.
7. Verify apex HTTPS, www HTTPS, apex HTTP and www HTTP, certificates, a real nested path with a query string, 404 behaviour, navigation and email/DNS continuity. Retain the zone export and a coordinated rollback plan.

For example, after the owner completes setup:

```sh
curl -I 'https://collettivoalanturing.it/events/?filter=upcoming'
curl -I 'https://www.collettivoalanturing.it/events/?filter=upcoming'
curl -I 'http://collettivoalanturing.it/events/?filter=upcoming'
curl -I 'http://www.collettivoalanturing.it/events/?filter=upcoming'
```

Check `Location` retains `/events/?filter=upcoming` and ends on the HTTPS apex, with no loops. These production checks have not been performed against a new deployment.

## Verification and remaining inputs

Local verification includes content/CMS/type checks (**82 files, zero errors/warnings/hints**), production builds and internal-link/media checks, **66 unit tests** and **107 automated Chromium browser tests**, using Node 24.20.0 and system Chromium. Home coverage includes opening-photo CMS edits, full-width/in-flow positioning, text overlap, scroll fade/return, crop controls, cleared/disabled cases, a single H1/skip navigation, digit/second/minute/day countdown rollovers, exact start-time replacement, three-card ordering and responsive layouts, five recent compact news rows, CMS count/photo/destination edits, supporter looping/pause/focus/copy links, and reduced-motion/no-JavaScript behavior. Browser coverage also includes independent news/event panel scrolling, day-grouped agendas, mobile calendar shortcuts, history/reload position restoration, responsive return links, multi-photo headers, milestone tooltips, and alpha-shaped calendar highlighting in both themes. Event grouping tests cover Rome dates, DST, multi-day occupancy, exclusive midnight endings and chronological row order. Demo-generator tests cover collection/category coverage, current sticker/gallery fields, transparent sponsor images, asset references, every registration state, refreshing dates, idempotent generation, and cleanup that preserves original files and real CMS opening-photo selections. The expanded populated demo build produces **119 pages**. Home, Events, News, Milestones, Resources and Join were also checked on the running populated preview at desktop/mobile sizes in both themes, with all sponsor images decoded and no browser errors or horizontal overflow. Generated demo records/assets use Git-ignored paths.

Browser coverage includes milestone occurrence-date ordering/ties, required dates, draft exclusion, shared News/Home previews, two-build milestone edits, empty/single/partial timeline rows, connecting-line endpoints and rounded turns, long titles, hover/focus rings, touch activation, reduced motion, no-JavaScript links and responsive focus preservation. Existing coverage includes exact event boundaries/precedence, DST, live/focus deadline updates, left-view/right-filter layout, every mobile date and visible weekday, keyboard-focus preservation through date selection/time changes, touch activation of overflowing dates and selected-day post links, sticker stacking, resource listings/detail destinations with unfinished bodies/editorial notes withheld, two-build editorial mutations and empty-logo fallback, header/footer logo selection across device/manual theme changes/reloads and without JavaScript, Apfel font loading, social rows below email, responsive footer alignment and scroll boundaries, Google Form responder links, analytics configuration, page/post browser titles, descriptive H1s, CMS metadata/canonical/entity output, structured-data script escaping, crawler rules, all routes/404, and mobile menu/CTA visual/keyboard order. Layout checks also cover 768px/800px footer resizing and 800px/1440px milestone resizing. Populated demo Home, milestone, calendar and resource screenshots were visually reviewed. Mobile checks use Chromium emulation, not a physical Android device. Firefox/Safari have not been exercised.

Hosted Pages CMS interaction, external form enforcement, GitHub CI execution, Pages hosting, final-domain DNS/TLS/redirects and actual analytics need account-side verification. See **[OWNER_CHECKLIST.md](OWNER_CHECKLIST.md)** for the remaining editorial/account inputs.

The supplied Telegram short link was checked by GET on 12 October 2026: HTTP 200, final URL `https://linktr.ee/collettivoalanturing?lt_utm_source=lt_share_link`. It is retained exactly as supplied, but the owner should confirm whether the Contact link should lead to Linktree or a direct Telegram channel.

## Official references

Documentation and current package/action release metadata were checked during implementation on 12 October 2026:

- [Astro content collections](https://docs.astro.build/en/guides/content-collections/) · [frontend scripts](https://docs.astro.build/en/guides/client-side-scripts/) · [Markdown renderer](https://docs.astro.build/en/reference/markdown-processors/satteri/)
- [Pages CMS configuration](https://pagescms.org/docs/configuration/) · [content](https://pagescms.org/docs/configuration/content/) · [rich text](https://pagescms.org/docs/configuration/fields/rich-text/) · [dates](https://pagescms.org/docs/configuration/fields/date/) · [media](https://pagescms.org/docs/configuration/media/)
- [Cloudflare Astro/Pages build settings](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/) · [build image](https://developers.cloudflare.com/pages/configuration/build-image/) · [Free limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [www redirect](https://developers.cloudflare.com/pages/how-to/www-redirect/) · [Pages analytics](https://developers.cloudflare.com/pages/how-to/web-analytics/) · [analytics/EU settings](https://developers.cloudflare.com/web-analytics/get-started/)
- [Web Analytics site token/snippet API reference](https://developers.cloudflare.com/api/resources/rum/subresources/site_info/methods/create/) · [Google Forms publishing/sharing](https://support.google.com/docs/answer/2839588?hl=en)
- [Apfel Grotezk files](https://github.com/collletttivo/apfel-grotezk/tree/main/fonts) · [font license](https://github.com/collletttivo/apfel-grotezk/blob/main/LICENSE.txt)
- [Phosphor Icons](https://phosphoricons.com/) · [core SVG assets and MIT licence](https://github.com/phosphor-icons/core)
- [Google AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) · [Organization markup](https://developers.google.com/search/docs/appearance/structured-data/organization) · [OpenAI search crawler guidance](https://developers.openai.com/api/docs/bots)
