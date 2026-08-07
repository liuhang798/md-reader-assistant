"""Regenerate repository social media artwork from the latest app screenshots."""

from __future__ import annotations

from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "screenshots"
OUTPUT = ROOT / "social-media" / "portrait-2026-07-22"
ACCENT = (7, 142, 55)
DARK = (17, 61, 42)
MUTED = (54, 104, 78)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ["msyhbd.ttc", "msyh.ttc"] if bold else ["msyh.ttc", "msyhbd.ttc"]
    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def background(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    rng = Random(20260807)
    for y in range(height):
        ratio = y / max(1, height - 1)
        for x in range(width):
            green_glow = max(0.0, 1.0 - (((x - width * 0.28) / (width * 0.62)) ** 2 + ((y - height * 0.58) / (height * 0.55)) ** 2))
            noise = rng.choice((-1, 0, 0, 0, 1))
            pixels[x, y] = (
                int(250 - 5 * ratio - 3 * green_glow + noise),
                int(248 - 3 * ratio + 5 * green_glow + noise),
                int(242 - 2 * ratio + 1 * green_glow + noise),
            )
    return image


def rounded(image: Image.Image, radius: int) -> Image.Image:
    result = image.convert("RGBA")
    mask = Image.new("L", result.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, result.width, result.height), radius=radius, fill=255)
    result.putalpha(mask)
    return result


def paste_card(canvas: Image.Image, source: Path, box: tuple[int, int, int, int]) -> None:
    left, top, max_width, max_height = box
    screenshot = Image.open(source).convert("RGB")
    screenshot.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    card = rounded(screenshot, 22)
    x = left + (max_width - card.width) // 2
    y = top + (max_height - card.height) // 2
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (x - 8, y + 12, x + card.width + 8, y + card.height + 32),
        radius=30,
        fill=(33, 59, 42, 56),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(card, (x, y), card)


def centered(draw: ImageDraw.ImageDraw, text: str, y: int, text_font: ImageFont.FreeTypeFont, fill: tuple[int, int, int]) -> None:
    box = draw.textbbox((0, 0), text, font=text_font)
    draw.text(((1080 - (box[2] - box[0])) / 2, y), text, font=text_font, fill=fill)


def brand(canvas: Image.Image, y: int, large: bool = False) -> int:
    logo_size = 126 if large else 82
    logo = Image.open(ROOT / "frontend" / "src" / "assets" / "images" / "app-logo-green.png").convert("RGBA")
    logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
    title_font = font(56 if large else 38, bold=True)
    title = "MD阅读助手"
    title_box = ImageDraw.Draw(canvas).textbbox((0, 0), title, font=title_font)
    total_width = logo_size + 28 + title_box[2] - title_box[0]
    x = (1080 - total_width) // 2
    canvas.paste(logo, (x, y), logo)
    ImageDraw.Draw(canvas).text((x + logo_size + 28, y + (logo_size - (title_box[3] - title_box[1])) // 2 - 5), title, font=title_font, fill=DARK)
    return y + logo_size


def make_portrait(filename: str, title: str, subtitle: str, screenshot: str) -> None:
    canvas = background((1080, 1440))
    draw = ImageDraw.Draw(canvas)
    brand(canvas, 74)
    centered(draw, title, 250, font(70, bold=True), DARK)
    draw.rounded_rectangle((96, 365, 162, 371), radius=3, fill=(224, 158, 41))
    centered(draw, subtitle, 404, font(29), MUTED)
    paste_card(canvas, SCREENSHOTS / screenshot, (54, 525, 972, 570))
    centered(draw, "Windows  ·  macOS  ·  Linux   |   v2.2.6", 1275, font(24), (83, 103, 90))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT / filename, optimize=True)


def make_cover_3x4() -> None:
    canvas = background((1080, 1440))
    draw = ImageDraw.Draw(canvas)
    brand(canvas, 84, large=True)
    centered(draw, "轻量  ·  优雅  ·  跨平台", 242, font(31), MUTED)
    centered(draw, "Markdown 阅读与编辑器", 342, font(50, bold=True), DARK)
    centered(draw, "Windows  ·  macOS  ·  Linux", 420, font(29), (44, 55, 49))
    paste_card(canvas, SCREENSHOTS / "03-split-editor.png", (52, 530, 976, 570))
    centered(draw, "开源免费  ·  本地优先  ·  约 7 MB", 1272, font(26), MUTED)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT / "01-cover-xiaohongshu-3x4.png", optimize=True)


def make_cover_9x16() -> None:
    canvas = background((1080, 1920))
    draw = ImageDraw.Draw(canvas)
    brand(canvas, 240, large=True)
    centered(draw, "轻量  ·  优雅  ·  跨平台", 404, font(31), MUTED)
    draw.rounded_rectangle((507, 505, 573, 511), radius=3, fill=(224, 158, 41))
    centered(draw, "Markdown 阅读与编辑器", 565, font(50, bold=True), DARK)
    centered(draw, "Windows  ·  macOS  ·  Linux", 645, font(29), (44, 55, 49))
    paste_card(canvas, SCREENSHOTS / "03-split-editor.png", (54, 790, 972, 570))
    centered(draw, "开源免费  ·  本地优先  ·  约 7 MB", 1500, font(27), MUTED)
    centered(draw, "MD Reader Assistant  v2.2.6", 1560, font(22), (101, 118, 108))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT / "01-cover-douyin-9x16.png", optimize=True)


def main() -> None:
    make_cover_3x4()
    make_cover_9x16()
    make_portrait("02-home-3x4.png", "本地文档，一目了然", "最近阅读  ·  资源浏览器  ·  快速打开", "01-home.png")
    make_portrait("03-reader-3x4.png", "沉浸阅读，只看内容", "本页目录  ·  阅读进度  ·  文档搜索", "02-reader.png")
    make_portrait("04-editor-3x4.png", "边写边看，实时预览", "语法高亮  ·  格式工具栏  ·  自动保存", "03-split-editor.png")


if __name__ == "__main__":
    main()
