"""
Creates a demo logo and two test creatives in sample_data/images/.
  docker compose exec backend python scripts/make_test_images.py

  logo.png       upload on the Visual identity page
  test_good.png  on-brand: palette colours, logo with clear space, readable text
  test_bad.png   off-brand: hot pink, low-contrast text, no logo, banned words
Brand palette to add on the Visual identity page:  #1B5E20, #FFB300, #212121, #FAFAFA
"""
import os

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "sample_data", "images")
os.makedirs(OUT, exist_ok=True)

GREEN, AMBER, DARK, LIGHT = "#1B5E20", "#FFB300", "#212121", "#FAFAFA"


def font(size: int):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        print("Warning: only a tiny default font is available, OCR may fail")
        return ImageFont.load_default()


def centered(draw, box, text, f, fill):
    x0, y0, x1, y1 = box
    l, t, r, b = draw.textbbox((0, 0), text, font=f)
    draw.text((x0 + (x1 - x0 - (r - l)) / 2 - l, y0 + (y1 - y0 - (b - t)) / 2 - t), text, font=f, fill=fill)


# logo
logo = Image.new("RGB", (400, 400), "white")
d = ImageDraw.Draw(logo)
d.ellipse((30, 30, 370, 370), fill=GREEN)
d.ellipse((60, 60, 340, 340), outline=AMBER, width=14)
centered(d, (30, 30, 370, 370), "FF", font(150), "white")
logo.save(os.path.join(OUT, "logo.png"))

# on-brand creative
good = Image.new("RGB", (1200, 630), LIGHT)
d = ImageDraw.Draw(good)
good.paste(logo.resize((160, 160)), (60, 60))
d.text((60, 280), "FitFuel Classic protein bar", font=font(64), fill=DARK)
d.text((60, 370), "20g of plant-based protein", font=font(44), fill=GREEN)
d.rectangle((0, 520, 1200, 630), fill=AMBER)
d.text((60, 552), "Available in Chocolate, Peanut Butter and Almond", font=font(36), fill=DARK)
good.save(os.path.join(OUT, "test_good.png"))

# off-brand creative
bad = Image.new("RGB", (1200, 630), "#FF1493")
d = ImageDraw.Draw(bad)
d.rectangle((100, 120, 1100, 470), fill="white")
d.text((140, 160), "Miracle detox bars", font=font(72), fill="#BBBBBB")
d.text((140, 290), "Guaranteed results in 7 days!!", font=font(48), fill="#CCCCCC")
d.text((140, 540), "Buy now", font=font(40), fill="white")
bad.save(os.path.join(OUT, "test_bad.png"))

print("Created:", sorted(os.listdir(OUT)))