"""Build transparent cross-platform application icons from the master PNG."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "build" / "appicon.png"
FRONTEND_ICON = ROOT / "frontend" / "src" / "assets" / "images" / "app-logo.png"
ROOT_ICO = ROOT / "build" / "appicon.ico"
WINDOWS_ICO = ROOT / "build" / "windows" / "icon.ico"
ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (96, 96), (128, 128), (192, 192), (256, 256)]
SOURCE_ACCENT = (44, 176, 68)
ACCENT_PALETTE = {
    "green": (7, 169, 54),
    "blue": (7, 93, 243),
    "orange": (245, 124, 4),
    "violet": (121, 64, 224),
    "coral": (252, 85, 64),
    "cyan": (7, 137, 182),
    "slate": (85, 100, 119),
    "clay": (165, 98, 84),
}


def remove_white_canvas(image: Image.Image) -> Image.Image:
    """Remove a flat corner-connected canvas while preserving interior whites."""
    if image.mode == "RGBA" and image.getchannel("A").getextrema()[0] == 0:
        return image.copy()

    rgb = image.convert("RGB")
    source = rgb.load()
    corners = [source[0, 0], source[rgb.width - 1, 0], source[0, rgb.height - 1], source[rgb.width - 1, rgb.height - 1]]
    background = tuple(round(sum(pixel[channel] for pixel in corners) / len(corners)) for channel in range(3))

    transparent_threshold = 3.0
    opaque_threshold = 90.0
    distance = Image.new("L", rgb.size, 255)
    distance_pixels = distance.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            red, green, blue = source[x, y]
            delta = ((red - background[0]) ** 2 + (green - background[1]) ** 2 + (blue - background[2]) ** 2) ** 0.5
            distance_pixels[x, y] = min(255, round(delta))

    # Only erase canvas-coloured pixels connected to an outer edge. This keeps
    # dark or light details inside the artwork opaque.
    connected = bytearray(rgb.width * rgb.height)
    queue = []
    for x in range(rgb.width):
        queue.extend(((x, 0), (x, rgb.height - 1)))
    for y in range(rgb.height):
        queue.extend(((0, y), (rgb.width - 1, y)))
    cursor = 0
    while cursor < len(queue):
        x, y = queue[cursor]
        cursor += 1
        index = y * rgb.width + x
        if connected[index] or distance_pixels[x, y] >= opaque_threshold:
            continue
        connected[index] = 1
        if x:
            queue.append((x - 1, y))
        if x + 1 < rgb.width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < rgb.height:
            queue.append((x, y + 1))

    result = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    output = result.load()
    alpha_range = opaque_threshold - transparent_threshold
    for y in range(rgb.height):
        for x in range(rgb.width):
            red, green, blue = source[x, y]
            index = y * rgb.width + x
            if not connected[index]:
                output[x, y] = (red, green, blue, 255)
                continue
            alpha = max(0.0, min(1.0, (distance_pixels[x, y] - transparent_threshold) / alpha_range))
            if alpha <= 0:
                continue
            # Undo the original matte on antialiased edge pixels.
            red = round(max(0, min(255, (red - background[0] * (1 - alpha)) / alpha)))
            green = round(max(0, min(255, (green - background[1] * (1 - alpha)) / alpha)))
            blue = round(max(0, min(255, (blue - background[2] * (1 - alpha)) / alpha)))
            output[x, y] = (red, green, blue, round(alpha * 255))

    return result


def generate_accent_logo(image: Image.Image, target_rgb: tuple) -> Image.Image:
    """Map green brand pixels to an accent while preserving details and alpha."""
    source = image.convert("RGBA")
    result = source.copy()
    source_pixels = source.load()
    output = result.load()
    source_green = SOURCE_ACCENT[1]

    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha = source_pixels[x, y]
            if alpha == 0:
                continue
            green_dominant = green > red * 1.18 and green > blue * 1.12 and green - min(red, blue) >= 22
            if not green_dominant:
                continue
            brightness = green / source_green
            recolored = tuple(max(0, min(255, round(channel * brightness))) for channel in target_rgb)
            output[x, y] = (*recolored, alpha)

    return result


def main() -> None:
    source = Image.open(SOURCE)
    transparent = remove_white_canvas(source)
    transparent.save(SOURCE, optimize=True)
    frontend_master = transparent.resize((256, 256), Image.Resampling.LANCZOS)
    frontend_master.save(FRONTEND_ICON, optimize=True)
    for name, color in ACCENT_PALETTE.items():
        themed = generate_accent_logo(frontend_master, color)
        themed.save(FRONTEND_ICON.with_name(f"app-logo-{name}.png"), optimize=True)
    transparent.save(ROOT_ICO, format="ICO", sizes=ICO_SIZES, bitmap_format="png")
    WINDOWS_ICO.write_bytes(ROOT_ICO.read_bytes())

    alpha = transparent.getchannel("A")
    if alpha.getpixel((0, 0)) != 0 or alpha.getpixel((transparent.width - 1, transparent.height - 1)) != 0:
        raise RuntimeError("Icon corners are not transparent")
    if alpha.getextrema() != (0, 255):
        raise RuntimeError("Icon does not contain a complete alpha range")


if __name__ == "__main__":
    main()
