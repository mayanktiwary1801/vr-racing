# Regenerate og.png — the 1200x630 card WhatsApp / social previews show for https://vrracing.mecomm.in/.
# Run from anywhere: `python tools/og_card.py` (needs Pillow; uses the Windows fonts Impact / Bahnschrift / Consolas).
# Re-run whenever the token, the weekday floor or the weekend uplift changes on the page.
# No personal name anywhere on the card: the site is owner-run and unnamed by design.
# Palette mirrors the site tokens: pit #0b0c10, seat red #e0261c, kerb yellow #ffd23f, chalk #f2f0ea.
import io
from PIL import Image, ImageDraw, ImageFont

import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
W, H = 1200, 630
PIT, CARBON, SEAT, KERB, CHALK, MUTED = "#0b0c10", "#15171d", "#e0261c", "#ffd23f", "#f2f0ea", "#9a9aa3"

img = Image.new("RGB", (W, H), PIT)
d = ImageDraw.Draw(img)

# carbon panel on the right third for depth
d.rectangle([820, 0, W, H], fill=CARBON)

# kerb stripe along the bottom: alternating red / yellow blocks, like the site's timing-board signature
y0 = H - 34
x = 0
i = 0
while x < W:
    d.rectangle([x, y0, x + 60, H], fill=SEAT if i % 2 == 0 else KERB)
    x += 60
    i += 1

# thin chalk rule above the stripe
d.rectangle([0, y0 - 4, W, y0 - 2], fill=CHALK)

FONTS = "C:/Windows/Fonts/"
wordmark = ImageFont.truetype(FONTS + "impact.ttf", 190)
sub = ImageFont.truetype(FONTS + "bahnschrift.ttf", 44)
mono = ImageFont.truetype(FONTS + "consolab.ttf", 28)
eyebrow = ImageFont.truetype(FONTS + "consolab.ttf", 26)

# eyebrow
d.text((72, 64), "GURUGRAM · SECTOR 38 · BOOKING ONLY", font=eyebrow, fill=KERB)

# wordmark, two lines, tight leading
d.text((64, 96), "VR", font=wordmark, fill=SEAT)
d.text((64, 258), "RACING", font=wordmark, fill=CHALK)

# sub-line
d.text((72, 468), "VR racing in Gurugram.", font=sub, fill=CHALK)

# mono strip with the rig
d.text((72, 534), "Gran Turismo 7 · PS VR2 · Fanatec · Playseat", font=mono, fill=MUTED)

# right panel: a big "₹100" token block reads as the one rule people need before they click
tok_big = ImageFont.truetype(FONTS + "impact.ttf", 96)
tok_small = ImageFont.truetype(FONTS + "bahnschrift.ttf", 30)
d.text((868, 120), "TOKEN", font=tok_small, fill=KERB)
rupee = ImageFont.truetype(FONTS + "bahnschrift.ttf", 84)
d.text((868, 158), "₹", font=rupee, fill=CHALK)
d.text((868 + int(d.textlength("₹", font=rupee)) + 6, 150), "100", font=tok_big, fill=CHALK)
d.text((868, 262), "per booking, by UPI.", font=tok_small, fill=MUTED)
d.text((868, 298), "Counts toward your bill.", font=tok_small, fill=MUTED)
d.text((868, 372), "WEEKDAYS", font=tok_small, fill=KERB)
d.text((868, 406), "from ₹1,000 / hr", font=tok_small, fill=CHALK)
d.text((868, 456), "WEEKENDS", font=tok_small, fill=KERB)
d.text((868, 490), "+20%", font=tok_small, fill=CHALK)

img.save(ROOT + "og.png", optimize=True)
print("og.png written", img.size)
