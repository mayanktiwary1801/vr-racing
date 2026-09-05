# VR Racing — booking page

A single static page for **VR Racing**, an owner-run sim-racing room in Gurugram (Sector 38). Not a MEcommerce project; hosted on the `vrracing.commercedwar.com` subdomain (CommerceDwar is the company's brand) with the company's knowledge.

**No personal name, phone number or street address belongs anywhere in this repo.** The page names the venture, the sector and a business WhatsApp number only; the owner's name and the full address go to a guest with the booking confirmation.

- `index.html` — the whole site (inline CSS/JS; Google Fonts is the only external dependency).
- `img/` — every image the page uses, in four widths (3840 / 2560 / 1600 / 800) as WebP plus a JPEG or PNG fallback, produced by `tools/optimise_images.py` from `img/manifest.json`. `img/CREDITS.md` lists where each image came from and who owns it.
- `img/raw/` — the 4K masters (git-ignored; keep a backup). The manifest names each master.
- `og.png` — the WhatsApp/social link-preview card, produced by `tools/og_card.py`.
- `CNAME` — the custom domain for GitHub Pages (`vrracing.commercedwar.com`); harmless on other hosts.
- Booking = a form that works out the price and opens WhatsApp with the request pre-filled; the ₹100 UPI token details are sent on WhatsApp after the slot is confirmed. No backend, no data stored by the page.

## Editing

Edit `index.html`, commit, push to `main`; the host redeploys in about a minute.

- **The WhatsApp number** lives in one place: `<body data-wa="91…">`. The script fills every booking link and the visible number from it.
- **Prices** live in two places that must match: the three `#price` cards and the `RATES` table at the top of the script (the live estimate in the form). Weekend = weekday + 20%.
- **Dates**: `OPEN` (first bookable date, also the date input's `min`) and `RATES.vr.from` (first VR date) in the script; the "from 25 September" wording in the copy.
- **Time slots**: the `SLOTS` table in the script — weekday evenings and weekend days.
- **The games grid**: the first two tiles are always visible; every tile carrying class `extra` hides behind the "more" tile, which counts them itself and opens them in place (with scripts off, every tile shows).
- **The link-preview card**: regenerate with `python tools/og_card.py` (Pillow + the Windows fonts Impact, Bahnschrift, Consolas) whenever the token, the weekday floor or the weekend uplift changes.

## Images

Every picture is declared in `img/manifest.json`: the master file in `img/raw/`, an optional crop, the largest width to produce, whether it keeps transparency (product shots), the `sizes` hint for the layout slot, the alt text and the credit line. Then:

    python tools/optimise_images.py            # everything
    python tools/optimise_images.py tile-gt7   # one entry

The script writes `img/<name>-<width>.{webp,jpg|png}`, prints the `<picture>` markup to paste into `index.html`, and rewrites `img/CREDITS.md`. It re-encodes from pixels, so **no metadata survives** — phone photos carry the GPS position of where they were taken, and that must never reach the site.

To add a photo of the room or the rig: drop the original into `img/raw/`, add an entry to the manifest (nothing in frame that identifies the building), run the script, paste the markup.

The 4K frames in the gallery open at their full 3840 × 2160 in the tap-to-enlarge view; the grid itself loads the 1600 or 2560 version, and phones load 800. Game frames and product images belong to their publishers and makers (see `img/CREDITS.md`); the two drift photographs are Unsplash-licensed.

## Launch checklist (owner)

1. Put the business WhatsApp number into `<body data-wa>`; keep the personal number off the site.
2. Confirm the price figures in `#price` and in `RATES`.
3. Publish from a fresh, single-commit history under a neutral author (the pre-publish history is local only).
4. Point `vrracing.commercedwar.com` at the host with a `CNAME` record on the `commercedwar.com` DNS (Hostinger); wait for HTTPS.
5. Add photos of the room and the rig through the manifest + script above.
