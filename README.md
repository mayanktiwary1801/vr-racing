# VR Racing — booking page

A single static page for **VR Racing**, an owner-run sim-racing room in Gurugram (Sector 38). Not a MEcommerce project; hosted on the `vrracing.commercedwar.com` subdomain (CommerceDwar is the company's brand) with the company's knowledge.

**No personal name, phone number or street address belongs anywhere in this repo.** The page names the venture, the sector and a business WhatsApp number only; the owner's name and the full address go to a guest with the booking confirmation.

- `index.html` — the whole site (inline CSS/JS; Google Fonts is the only external dependency, loaded without blocking the first paint).
- `img/` — every image the page uses, in four widths (3840 / 2560 / 1600 / 800) as WebP plus a JPEG or PNG fallback, produced by `tools/optimise_images.py` from `img/manifest.json`. `img/CREDITS.md` lists where each image came from and who owns it.
- `img/raw/` — the 4K masters (git-ignored; keep a backup). The manifest names each master.
- `og.png` — the WhatsApp/social link-preview card, produced by `tools/og_card.py`. Evergreen by decision (9 Sept 2026): it carries the facts, never the launch offer, because WhatsApp bakes the preview into each message when it is sent and a regenerated card cannot fix chats already shared.
- `tools/verify.cjs` — the page's browser checks (see "Checks").
- `CNAME` — the custom domain for GitHub Pages (`vrracing.commercedwar.com`); harmless on other hosts.
- Booking = a form that works out the price (the launch offer included) and opens WhatsApp with the request pre-filled; the ₹100 UPI token details are sent on WhatsApp after the slot is confirmed. No backend, no data stored by the page, no analytics.

The page's order, top to bottom: hero → launch offer → price → VR → groups → the room (photographs) → the rig → drift photo → GT7 in 4K → games → how it works (with the where-and-trust block) → reviews → book → FAQ → the closing band → footer. A phone shows a fixed "Book your slot" bar once the hero has scrolled away.

## Editing

Edit `index.html`, commit, push to `main`; the host redeploys in about a minute. Run the checks first (below).

- **The WhatsApp number** lives in one place: `<body data-wa="91…">`. The script fills every booking link and the visible number from it.
- **Prices** live in two places that must match: the three `#price` cards and the `RATES` table at the top of the script (the live estimate in the form). Weekend = weekday + 20%. The hero's facts line and the phone bar's hint also quote the floor ("from ₹1,000/hr") and the VR rate — change those by hand too.
- **Dates**: `OPEN` (first bookable date, also the date input's `min`) and `RATES.vr.from` (first VR date) in the script; the "from 25 September" wording in the copy.
- **Time slots**: the `SLOTS` table in the script — weekday evenings and weekend days.

### The launch offer

50% off for the first five groups of three to five people. Its state lives in **one place** — three attributes on `<body>` — and is right even with scripts off:

```html
<body data-wa="…" data-offer="open" data-offer-remaining="" data-offer-review-by="2026-09-14">
```

| Attribute | Values | Meaning |
| --- | --- | --- |
| `data-offer` | `open` / `closed` | the offer is on, or over. The script may show an open offer as **stale** (below). |
| `data-offer-remaining` | `""` or a number | leave empty for "Limited to the first five qualifying groups"; put a number (maintained by hand after each confirmed group) for "N of 5 still open". `0` closes the offer. Never show a number you have not set yourself. |
| `data-offer-review-by` | `YYYY-MM-DD` | the date you last confirmed the offer plus a week, in IST. Past it, the page goes **stale** on its own: the band says "Ask us on WhatsApp whether the launch offer is still open", the estimate shows the full price with "to be confirmed on WhatsApp", the WhatsApp text says "please confirm", and no number shows. It never deletes a live offer silently. |

Precedence: closed (`data-offer="closed"` or remaining `0`) beats stale beats open. The comparison uses today's date in IST for every visitor (the business's clock), not the phone's timezone.

**The Monday routine (two minutes; first one Monday 14 September 2026):** still open? count right? Then either confirm — bump `data-offer-review-by` a week, fix the number — or close it with `data-offer="closed"`. Commit, push. The WhatsApp requests carry `Launch offer: YES (group of N)` so redemptions can be counted from the chats; a group that turns up with fewer than three pays the regular rate, which the page says.

Where the offer appears, all driven by that one place: the band under the hero, the live estimate (50% off rate × hours for three or more people; the ₹100 token is never discounted and still counts toward the bill — the maths lives in `quote()` in the script and nowhere else), the closing band, the WhatsApp text, and one line in the groups and reviews sections. Structural numbers (`total: 5`, `pct: 50`, `minPeople: 3`) are in the `OFFER` object in the script.

### The room photographs

`#room` has eight slots. A slot with class `slot` shows a labelled placeholder until its photograph lands; the first four show by default and the other four sit behind a "4 more photos" bar. To fill a slot:

1. Drop the photo into `img/raw/` (phone photos are fine; the script strips the GPS position and every other byte of metadata). **Nothing in frame may identify the building or the flat** — no windows with a view, no door numbers, no exterior, no letters or parcels.
2. Add its entry to `img/manifest.json` — the eight are ready to paste, one per slot, in the order the page shows them:
   ```json
   {"name":"room-01","src":"room-01.jpg","max":2560,"sizes":"(max-width: 860px) 50vw, 25vw","alt":"The room from the door: the cockpit in front of the 65-inch OLED","credit":"VR Racing"},
   {"name":"room-02","src":"room-02.jpg","max":2560,"sizes":"(max-width: 860px) 50vw, 25vw","alt":"In the cockpit, hands on the wheel","credit":"VR Racing"},
   {"name":"room-03","src":"room-03.jpg","max":2560,"sizes":"(max-width: 860px) 50vw, 25vw","alt":"In the PlayStation VR2, mid-corner","credit":"VR Racing"},
   {"name":"room-04","src":"room-04.jpg","max":2560,"sizes":"(max-width: 860px) 50vw, 25vw","alt":"The Fanatec GT DD Pro wheel, up close","credit":"VR Racing"},
   {"name":"room-05","src":"room-05.jpg","max":2560,"sizes":"(max-width: 860px) 50vw, 25vw","alt":"The direct-drive base and the pedals","credit":"VR Racing"},
   {"name":"room-06","src":"room-06.jpg","max":2560,"sizes":"(max-width: 860px) 50vw, 25vw","alt":"Friends on the sofa, watching the big screen","credit":"VR Racing"},
   {"name":"room-07","src":"room-07.jpg","max":2560,"sizes":"(max-width: 860px) 50vw, 25vw","alt":"A first lap in VR","credit":"VR Racing"},
   {"name":"room-08","src":"room-08.jpg","max":2560,"sizes":"(max-width: 860px) 50vw, 25vw","alt":"The whole room","credit":"VR Racing"}
   ```
   (Check the key names against an existing entry in the manifest before pasting; adjust `src` to the file you dropped in.)
3. `python tools/optimise_images.py room-01` — it writes the sizes and prints the `<picture>` markup.
4. In `index.html`, find `data-slot="room-01"`, replace its `<div class="ph">…</div>` with the printed `<picture>`, remove the class `slot` (the caption then shows), and — if the photo should open full-size on tap — add class `zoom` plus `data-full` / `data-full-webp` / `data-cap` like the gallery frames.

The shot list the slots were built for: the room from the door · someone in the cockpit · someone in the PSVR2 (after 25 Sept) · the wheel close-up · the base and pedals · friends watching · a reaction · the whole room. A landscape photo of the room can also replace the hero's game frame later: same pipeline, then swap the hero's `<picture>` and the preload in `<head>`.

**The hero video slot (not built until a file exists):** a ≤ 15 s landscape loop, ≤ 3 MB as WebM (VP9) with an MP4 (H.264) fallback, would replace the hero `<picture>` with `<video autoplay muted loop playsinline poster="img/gt7-cockpit-1600.jpg">` inside the same `.hero-bg` container (keep the `zoom` class off it). Keep the poster, keep `fetchpriority` on the poster preload.

### Reviews

Real reviews only. `REVIEWS` in the script is an array of objects — `{name:'Riya', group:4, occasion:'birthday', quote:'…', month:'October 2026'}` — rendered from the `#review-card` template; while it is empty the "Be one of our first racers" block shows and the list stays hidden. No stars, no counts, no averages: nothing that a real review did not say. Ask for the guest's permission to use a first name.

### The FAQ

Nineteen questions in `#faq-list`: the seven most asked sit open to view; the other twelve carry class `extra` and sit behind the "12 more questions" bar, grouped under small labels (also `extra`). It is the same "more" pattern as the games and the gallery — the count is read from the DOM. The bar carries `data-collapse="self"` so collapsing keeps the reader at the bar, with the seven questions still above it (the grids use the default and scroll their section back to the top).

### The games grid, the 4K gallery and the room strip

The first two games, the first two frames and the first four photos are always visible; every item carrying class `extra` hides behind the "more" button of its grid, which counts them itself and opens them in place. With scripts off everything shows (the `<noscript>` rule in `<head>` lists each kind of `.extra`; add a rule there if you invent a new one).

### The section menu

The nav lists every section (the two photo bands and the offer band are deliberately left out — mark such a section `data-nav="no"` and the checks skip it). Under the width in the CSS rule marked `/* NAV BREAKPOINT 1010 */` the links fold behind the Menu button; that number is measured (brand + links + padding + a gap, plus 40 px of slack). **When you add a link, re-measure:** at a wide viewport read `document.querySelector('nav.links').scrollWidth` + 128 (brand) + 40 (padding) + 24 (gap) + 40, and set the three `@media (max-width:…)` rules that carry the marker or `.menu` (the nav block, the `<noscript>` block, the `nav.links a.book` rule) to that width.

### The phone booking bar

`#sticky`, fixed to the foot of the screen under 860 px. The script turns it on once the hero has scrolled away and off while the form, the closing band or the footer is on screen, or while the menu is open; with the tap-to-enlarge view open the dialog makes it inert and the CSS hides it.

### Fonts and colours

The Google Fonts stylesheet is loaded as a preload that switches itself to a stylesheet (non-blocking), with a `<noscript>` link for scripts-off. The muted colour token `--tarmac-2` and the headset card's amber were set by computing WCAG contrast (values and ratios in the CSS comments); keep any new text colour at 4.5:1 or better on its background.

### Analytics

None, by decision (9 Sept 2026) — to be revisited if bookings do not come. When they are wanted, the cookieless option researched was GoatCounter (free for a small business, no cookies, no IP stored, click events via `data-goatcounter-click`), with these events planned: `book_cta_hero` · `book_cta_price` · `book_cta_vr` · `book_cta_groups` · `book_cta_sticky` · `book_cta_close` · `launch_offer_clicked` · `pricing_seen` · `booking_started` · `whatsapp_handoff` · `whatsapp_click`. Adding it changes the footer (a one-sentence disclosure) and the rule in `CLAUDE.md`.

## Checks

`tools/verify.cjs` drives the page in headless Chromium and prints PASS/FAIL per check (exit code 1 on any failure). It needs Playwright and a Chromium build; the workspace's OMS project has both:

    python -m http.server 8765 --bind 127.0.0.1
    NODE_PATH=../claude-project/node_modules node tools/verify.cjs http://127.0.0.1:8765/ ../../"Claude generated files"/<folder>

It asserts: no horizontal overflow at 375 / 800 / 1366 and 20 px either side of the menu fold; every section has a menu entry and every link a target; every CTA at least 44 px tall; the phone bar's show/hide rules including the lightbox (and that it never takes focus while the lightbox is open); the FAQ bar and the spec sheet; the lightbox at 3840; the form's WhatsApp text against the estimate for a weekday, a weekend, VR before the 25th, two people and three people; the offer's open / count / stale / closed states; and that with scripts off all 19 FAQ rows, 12 tiles, 9 frames and 8 photos show. It also saves first-screen screenshots at 375 and 1366.

Lighthouse (mobile preset) with Edge as the browser:

    CHROME_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" npx lighthouse http://127.0.0.1:8765/ --quiet --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=lh.json

Hold the line at: layout shift 0 (the font swap is the thing to watch), accessibility 100, and every other score at or above the last run.

## Images

Every picture is declared in `img/manifest.json`: the master file in `img/raw/`, an optional crop, the largest width to produce, whether it keeps transparency (product shots), the `sizes` hint for the layout slot, the alt text and the credit line. Then:

    python tools/optimise_images.py            # everything
    python tools/optimise_images.py tile-gt7   # one entry

The script writes `img/<name>-<width>.{webp,jpg|png}`, prints the `<picture>` markup to paste into `index.html`, and rewrites `img/CREDITS.md`. It re-encodes from pixels, so **no metadata survives** — phone photos carry the GPS position of where they were taken, and that must never reach the site.

The 4K frames in the gallery open at their full 3840 × 2160 in the tap-to-enlarge view; the grid itself loads the 1600 or 2560 version, and phones load 800. Game frames and product images belong to their publishers and makers (see `img/CREDITS.md`); the two drift photographs are Unsplash-licensed.

## Launch checklist (owner)

1. Put the business WhatsApp number into `<body data-wa>`; keep the personal number off the site.
2. Confirm the price figures in `#price`, in `RATES`, in the hero's facts line and in the phone bar's hint.
3. Published from a fresh, single-commit history under a neutral author (the pre-publish history is local only) — done 4 Sept 2026.
4. `vrracing.commercedwar.com` points at the host — done 4 Sept 2026.
5. Add the eight room photographs through "The room photographs" above; consider a real frame for the hero.
6. **Every Monday while the launch offer runs:** the routine under "The launch offer". First: Monday 14 September 2026.
7. After each session: ask the group for honest feedback on WhatsApp (three questions — what was great, what was not, what to change; no star-rating ask); with permission, add it under "Reviews".
