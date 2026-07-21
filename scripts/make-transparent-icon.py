"""Remove the white canvas around the rounded app mark without touching book whites."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "build" / "appicon.png"
FRONTEND_ICON = ROOT / "frontend" / "src" / "assets" / "images" / "app-logo.png"


def build_silhouette(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    mask = Image.new("L", rgb.size, 0)
    source = rgb.load()
    target = mask.load()

    for y in range(rgb.height):
        for x in range(rgb.width):
            red, green, blue = source[x, y]
            colour_range = max(red, green, blue) - min(red, green, blue)
            brightness = (red + green + blue) / 3
            if colour_range > 8 or brightness < 240:
                target[x, y] = 255

    # Join tiny antialiasing gaps, then flood the outside. Any remaining holes
    # belong to the book artwork and must stay opaque.
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    flooded = mask.copy()
    ImageDraw.floodfill(flooded, (0, 0), 128, thresh=0)
    flooded = flooded.point(lambda value: 0 if value == 128 else 255)
    return flooded


def remove_white_canvas(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    silhouette = build_silhouette(rgb)
    inner = silhouette.filter(ImageFilter.MinFilter(11))
    result = Image.new("RGBA", rgb.size, (0, 0, 0, 0))

    source = rgb.load()
    shape = silhouette.load()
    solid = inner.load()
    output = result.load()

    background = 255.0
    foreground_brightness = 72.0
    denominator = background - foreground_brightness

    for y in range(rgb.height):
        for x in range(rgb.width):
            if not shape[x, y]:
                continue

            red, green, blue = source[x, y]
            alpha = 1.0
            if not solid[x, y]:
                brightness = (red + green + blue) / 3
                alpha = max(0.0, min(1.0, (background - brightness) / denominator))

            if alpha <= 0:
                continue

            # Undo the original white matte on translucent edge pixels.
            if alpha < 0.999:
                red = round(max(0, min(255, (red - background * (1 - alpha)) / alpha)))
                green = round(max(0, min(255, (green - background * (1 - alpha)) / alpha)))
                blue = round(max(0, min(255, (blue - background * (1 - alpha)) / alpha)))

            output[x, y] = (red, green, blue, round(alpha * 255))

    return result


def main() -> None:
    source = Image.open(SOURCE)
    transparent = remove_white_canvas(source)
    transparent.save(SOURCE, optimize=True)
    transparent.resize((256, 256), Image.Resampling.LANCZOS).save(FRONTEND_ICON, optimize=True)

    alpha = transparent.getchannel("A")
    if alpha.getpixel((0, 0)) != 0 or alpha.getpixel((transparent.width - 1, transparent.height - 1)) != 0:
        raise RuntimeError("Icon corners are not transparent")
    if alpha.getextrema() != (0, 255):
        raise RuntimeError("Icon does not contain a complete alpha range")


if __name__ == "__main__":
    main()
