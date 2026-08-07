import importlib.util
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


SCRIPT = Path(__file__).with_name("make-transparent-icon.py")
SPEC = importlib.util.spec_from_file_location("make_transparent_icon", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class TransparentIconTests(unittest.TestCase):
    def test_removes_black_canvas_without_erasing_bright_green_mark(self):
        source = Image.new("RGB", (64, 64), "black")
        draw = ImageDraw.Draw(source)
        draw.rounded_rectangle((4, 4, 59, 59), radius=12, fill="#2CB044")
        draw.rectangle((20, 20, 44, 44), fill="white")

        result = MODULE.remove_white_canvas(source)

        self.assertEqual(result.mode, "RGBA")
        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertEqual(result.getpixel((63, 63))[3], 0)
        self.assertEqual(result.getpixel((8, 32))[3], 255)
        self.assertGreater(result.getpixel((8, 32))[1], 150)

    def test_generated_application_icons_are_synchronized(self):
        root = SCRIPT.parents[1]
        png_paths = [
            root / "build" / "appicon.png",
            root / "frontend" / "src" / "assets" / "images" / "app-logo.png",
        ]
        for path in png_paths:
            with Image.open(path) as source:
                icon = source.convert("RGBA")
            self.assertEqual(icon.getpixel((0, 0))[3], 0, path)
            self.assertEqual(icon.getpixel((icon.width - 1, icon.height - 1))[3], 0, path)
            red, green, blue, alpha = icon.getpixel((icon.width // 2, icon.height // 8))
            self.assertGreaterEqual(alpha, 250, path)
            self.assertGreaterEqual(green, 150, path)
            self.assertGreaterEqual(green - red, 60, path)
            self.assertGreaterEqual(green - blue, 40, path)

        root_ico = root / "build" / "appicon.ico"
        windows_ico = root / "build" / "windows" / "icon.ico"
        self.assertEqual(root_ico.read_bytes(), windows_ico.read_bytes())
        with Image.open(root_ico) as ico:
            self.assertEqual(
                sorted(ico.info["sizes"]),
                [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (96, 96), (128, 128), (192, 192), (256, 256)],
            )

    def test_recolors_green_pixels_without_changing_white_or_alpha(self):
        source = Image.new("RGBA", (4, 1), (0, 0, 0, 0))
        source.putpixel((1, 0), (44, 176, 68, 255))
        source.putpixel((2, 0), (22, 88, 34, 128))
        source.putpixel((3, 0), (250, 249, 247, 255))

        recolor = getattr(MODULE, "generate_accent_logo", lambda image, _target: image)
        result = recolor(source, (7, 93, 243))

        self.assertEqual(result.getpixel((0, 0)), (0, 0, 0, 0))
        self.assertEqual(result.getpixel((1, 0)), (7, 93, 243, 255))
        self.assertEqual(result.getpixel((2, 0)), (4, 46, 122, 128))
        self.assertEqual(result.getpixel((3, 0)), (250, 249, 247, 255))

    def test_all_runtime_accent_logos_are_transparent_and_match_the_palette(self):
        root = SCRIPT.parents[1]
        palette = {
            "green": (7, 169, 54),
            "blue": (7, 93, 243),
            "orange": (245, 124, 4),
            "violet": (121, 64, 224),
            "coral": (252, 85, 64),
            "cyan": (7, 137, 182),
            "slate": (85, 100, 119),
            "clay": (165, 98, 84),
        }

        for name, expected in palette.items():
            path = root / "frontend" / "src" / "assets" / "images" / f"app-logo-{name}.png"
            self.assertTrue(path.exists(), path)
            with Image.open(path) as source:
                icon = source.convert("RGBA")
            self.assertEqual(icon.size, (256, 256), path)
            self.assertEqual(icon.getpixel((0, 0))[3], 0, path)
            self.assertEqual(icon.getpixel((255, 255))[3], 0, path)
            actual = icon.getpixel((128, 32))[:3]
            distance = sum((actual[index] - expected[index]) ** 2 for index in range(3)) ** 0.5
            self.assertLess(distance, 45, (path, actual, expected))


if __name__ == "__main__":
    unittest.main()
