"""
Artwork for the Infosys SE campaign email (frontend/public/email/infosys/).

Email clients do not render SVG and strip CSS gradients, so every visual in the
email is a hosted PNG drawn here at 2x and shown at half size. Re-run after a
copy change:  python -I scripts/email-art/infosys_se_art.py
The TieEdu logo is pasted from public/email/logo.png unchanged (owner rule:
the logo colour never changes).
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'frontend', 'public', 'email', 'infosys')
LOGO = os.path.join(ROOT, 'frontend', 'public', 'email', 'logo.png')
FONTS = 'C:/Windows/Fonts/' if sys.platform == 'win32' else '/usr/share/fonts/truetype/'

TEAL = (11, 79, 74)
TEAL_DEEP = (6, 48, 45)
AMBER = (255, 164, 27)
ORANGE = (248, 65, 9)
CREAM = (255, 248, 238)
WHITE = (255, 255, 255)
INK = (42, 30, 20)


def font(size, weight='bold'):
    name = {'bold': 'segoeuib.ttf', 'regular': 'segoeui.ttf', 'light': 'segoeuil.ttf'}[weight]
    try:
        return ImageFont.truetype(FONTS + name, size)
    except OSError:
        return ImageFont.truetype(FONTS + 'arialbd.ttf', size)


def gradient(w, h, top, bottom, diagonal=True):
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = ((x / w) * 0.45 + (y / h) * 0.55) if diagonal else y / h
            px[x, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return img


def glow(base, xy, r, colour, alpha):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = xy
    d.ellipse((x - r, y - r, x + r, y + r), fill=colour + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(r // 3))
    base.alpha_composite(layer)


def dots(d, x0, y0, cols, rows, gap, colour):
    for i in range(cols):
        for j in range(rows):
            x, y = x0 + i * gap, y0 + j * gap
            d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=colour)


def logo_chip(img, x, y, height):
    logo = Image.open(LOGO).convert('RGBA')
    w = int(logo.width * height / logo.height)
    logo = logo.resize((w, height), Image.LANCZOS)
    pad_x, pad_y = 28, 16
    chip = Image.new('RGBA', (w + pad_x * 2, height + pad_y * 2), (0, 0, 0, 0))
    ImageDraw.Draw(chip).rounded_rectangle((0, 0, chip.width - 1, chip.height - 1), 22, fill=WHITE + (255,))
    chip.alpha_composite(logo, (pad_x, pad_y))
    img.alpha_composite(chip, (x, y))
    return chip.width, chip.height


def pill(d, x, y, text, fill, ink, f):
    tw = d.textlength(text, font=f)
    h = f.size + 26
    d.rounded_rectangle((x, y, x + tw + 44, y + h), h // 2, fill=fill)
    d.text((x + 22, y + h / 2), text, font=f, fill=ink, anchor='lm')
    return tw + 44


def hero():
    W, H = 1200, 640
    img = gradient(W, H, (14, 98, 91), TEAL_DEEP).convert('RGBA')
    glow(img, (1060, 90), 220, AMBER, 45)
    glow(img, (140, 600), 220, ORANGE, 70)
    d = ImageDraw.Draw(img)
    dots(d, 620, 60, 6, 4, 26, (255, 255, 255, 60))

    logo_chip(img, 64, 56, 84)

    d.text((64, 220), 'INFOSYS SYSTEM ENGINEER', font=font(30), fill=AMBER)
    d.text((64, 262), 'Your complete', font=font(66), fill=WHITE)
    d.text((64, 338), 'prep plan is live.', font=font(66), fill=WHITE)
    d.text((64, 432), 'Train  ·  Test  ·  Track — built only for this exam.', font=font(28, 'regular'), fill=(214, 236, 232))

    x = 64
    for label, fill, ink in (('25 lessons', AMBER, INK), ('Full mocks', WHITE, TEAL), ('Readiness score', (255, 214, 196), (150, 40, 6))):
        x += pill(d, x, 500, label, fill, ink, font(24)) + 14

    # Exam card illustration
    cx, cy = 820, 170
    shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((cx + 14, cy + 22, cx + 334, cy + 424), 30, fill=(0, 0, 0, 90))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((cx, cy, cx + 320, cy + 400), 30, fill=WHITE)
    d.rounded_rectangle((cx, cy, cx + 320, cy + 74), 30, fill=AMBER)
    d.rectangle((cx, cy + 44, cx + 320, cy + 74), fill=AMBER)
    d.text((cx + 26, cy + 37), 'Online Assessment', font=font(24), fill=INK, anchor='lm')
    rows = (('Math', TEAL), ('Reasoning', (64, 120, 230)), ('Verbal', (138, 76, 214)), ('Pseudocode', ORANGE), ('Puzzles', (22, 160, 100)))
    for i, (name, col) in enumerate(rows):
        y = cy + 108 + i * 50
        d.ellipse((cx + 26, y - 13, cx + 52, y + 13), fill=col)
        d.line((cx + 32, y, cx + 37, y + 6, cx + 46, y - 6), fill=WHITE, width=4, joint='curve')
        d.text((cx + 66, y), name, font=font(22, 'regular'), fill=INK, anchor='lm')
        d.rounded_rectangle((cx + 210, y - 6, cx + 296, y + 6), 6, fill=(236, 230, 220))
        d.rounded_rectangle((cx + 210, y - 6, cx + 210 + [80, 66, 74, 56, 62][i], y + 6), 6, fill=col)
    d.line((cx + 26, cy + 354, cx + 294, cy + 354), fill=(232, 223, 208), width=2)
    d.text((cx + 26, cy + 378), '54 Qs', font=font(22), fill=TEAL, anchor='lm')
    d.text((cx + 294, cy + 378), '100 min', font=font(22), fill=ORANGE, anchor='rm')

    # Timer badge
    bx, by = 1112, 112
    d.ellipse((bx - 62, by - 62, bx + 62, by + 62), fill=ORANGE)
    d.ellipse((bx - 50, by - 50, bx + 50, by + 50), outline=WHITE, width=5)
    d.text((bx, by - 8), '100', font=font(34), fill=WHITE, anchor='mm')
    d.text((bx, by + 24), 'MIN', font=font(16), fill=WHITE, anchor='mm')

    d.text((W - 40, H - 30), 'tieedu.in', font=font(22), fill=(214, 236, 232), anchor='rm')
    return img


def icon(kind, colour):
    S = 160
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, S - 1, S - 1), 40, fill=colour)
    w = WHITE
    if kind == 'train':  # open book
        d.polygon([(30, 52), (78, 60), (78, 122), (30, 112)], fill=w)
        d.polygon([(130, 52), (82, 60), (82, 122), (130, 112)], fill=w)
        for i in range(3):
            d.line((40, 72 + i * 13, 68, 77 + i * 13), fill=colour, width=4)
            d.line((92, 77 + i * 13, 120, 72 + i * 13), fill=colour, width=4)
    elif kind == 'test':  # stopwatch
        d.rounded_rectangle((70, 24, 90, 38), 4, fill=w)
        d.ellipse((34, 40, 126, 132), fill=w)
        d.ellipse((46, 52, 114, 120), fill=colour)
        d.line((80, 86, 80, 62), fill=w, width=8)
        d.line((80, 86, 98, 96), fill=w, width=8)
        d.ellipse((74, 80, 86, 92), fill=w)
    elif kind == 'track':  # rising bars + arrow
        for i, h in enumerate((30, 52, 78)):
            x = 36 + i * 32
            d.rounded_rectangle((x, 124 - h, x + 22, 124), 5, fill=w)
        d.line((36, 70, 70, 48, 92, 58, 124, 30), fill=AMBER if colour != AMBER else INK, width=8, joint='curve')
        d.polygon([(124, 30), (106, 30), (124, 48)], fill=AMBER if colour != AMBER else INK)
    elif kind == 'interview':  # two speech bubbles
        d.rounded_rectangle((22, 34, 102, 88), 16, fill=w)
        d.polygon([(40, 86), (40, 108), (60, 86)], fill=w)
        d.rounded_rectangle((60, 78, 138, 128), 16, fill=AMBER)
        d.polygon([(118, 126), (122, 146), (102, 126)], fill=AMBER)
        for i in range(3):
            d.ellipse((42 + i * 20, 56, 52 + i * 20, 66), fill=colour)
    return img


def interview_banner():
    W, H = 1200, 360
    img = gradient(W, H, (92, 54, 196), (40, 26, 110)).convert('RGBA')
    glow(img, (1080, 60), 200, (255, 120, 180), 80)
    glow(img, (80, 330), 160, AMBER, 70)
    d = ImageDraw.Draw(img)
    dots(d, 860, 230, 8, 4, 26, (255, 255, 255, 50))
    img.alpha_composite(icon('interview', (120, 84, 226)).resize((200, 200), Image.LANCZOS), (64, 80))
    d.text((310, 84), 'INTERVIEW PREP', font=font(26), fill=AMBER)
    d.text((310, 120), 'Walk in ready for', font=font(54), fill=WHITE)
    d.text((310, 184), 'both interviews.', font=font(54), fill=WHITE)
    x = 310
    for label in ('32 technical Q&As', '12 HR Q&As'):
        x += pill(d, x, 284, label, WHITE, (70, 40, 160), font(22)) + 14
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    hero().convert('RGB').save(os.path.join(OUT, 'hero.png'), optimize=True)
    for kind, col in (('train', TEAL), ('test', ORANGE), ('track', (64, 120, 230))):
        icon(kind, col).save(os.path.join(OUT, f'{kind}.png'), optimize=True)
    interview_banner().convert('RGB').save(os.path.join(OUT, 'interview.png'), optimize=True)
    print('wrote', sorted(os.listdir(OUT)))


if __name__ == '__main__':
    main()
