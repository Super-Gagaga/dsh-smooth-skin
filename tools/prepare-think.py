"""Prepares the thinking-level artwork for the model panel.

The panel paints the art over its own dark surface, so the background has to be gone.
Sources usually arrive as RGBA with a transparent background whose stored RGB is white
or black; sometimes they arrive flattened onto one of those two colours. This tool uses
the alpha channel when the file has one and otherwise keyes out whichever of white or
black touches the border (flood fill, so white or black inside the character survives).
The result is trimmed to the level suffix in the file name, downscaled to 780px wide
and written to ``assets/think/cutout/<level>.webp`` with straight alpha.
``node tools/export-think.mjs`` then inlines those files into ``src/think.js``.

Only needed when the source art changes; requires Pillow and NumPy, which the DSH
runtime already ships (``python tools/prepare-think.py``).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "think"
TARGET = SOURCE / "cutout"
LEVELS = ("off", "low", "high", "max")
WIDTH = 780
QUALITY = 84
WHITE = 232
BLACK = 24


def border_mask(image: Image.Image, colour: str) -> np.ndarray:
    """True where an opaque border-connected run of `colour` was flood filled."""
    width, height = image.size
    marked = image.copy()
    seeds = [(x, 0) for x in range(width)] + [(x, height - 1) for x in range(width)]
    seeds += [(0, y) for y in range(height)] + [(width - 1, y) for y in range(height)]
    magic = (255, 0, 255) if colour == "white" else (0, 255, 0)
    for point in seeds:
        pixel = marked.getpixel(point)
        if pixel == magic:
            continue
        if colour == "white" and min(pixel) > WHITE:
            ImageDraw.floodfill(marked, point, magic, thresh=42)
        elif colour == "black" and max(pixel) < BLACK:
            ImageDraw.floodfill(marked, point, magic, thresh=26)
    data = np.asarray(marked).astype(np.int16)
    if colour == "white":
        return (data[:, :, 0] > 240) & (data[:, :, 1] < 40) & (data[:, :, 2] > 240)
    return (data[:, :, 1] > 240) & (data[:, :, 0] < 40) & (data[:, :, 2] < 40)


def matte(path: Path) -> tuple[Image.Image, str]:
    """Straight-alpha matte for one source image, plus how it was obtained."""
    image = Image.open(path).convert("RGBA")
    alpha = np.asarray(image)[:, :, 3]
    if alpha.min() < 250:
        # The file already carries a background cut-out; trust it.
        return Image.fromarray(alpha, "L"), "alpha"
    # Flattened source: remove whichever of white or black lines the border.
    rgb = image.convert("RGB")
    removed = border_mask(rgb, "white") | border_mask(rgb, "black")
    return Image.fromarray(np.where(removed, 0, 255).astype(np.uint8), "L"), "colour key"


def resize_premultiplied(colour: Image.Image, alpha: Image.Image, width: int) -> Image.Image:
    """Resize through premultiplied alpha; resizing straight RGBA bleeds the fringe."""
    array = np.asarray(colour.convert("RGB")).astype(np.float32)
    a = np.asarray(alpha, dtype=np.float32) / 255.0
    premultiplied = np.rint(array * a[:, :, None]).astype(np.uint8)
    height = round(colour.height * width / colour.width)
    scaled_colour = np.asarray(Image.fromarray(premultiplied, "RGB").resize((width, height), Image.LANCZOS)).astype(np.float32)
    scaled_alpha = np.asarray(alpha.resize((width, height), Image.LANCZOS)).astype(np.float32) / 255.0
    safe = np.where(scaled_alpha > 0.004, scaled_alpha, 1.0)
    straight = np.clip(scaled_colour / safe[:, :, None], 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([straight, np.rint(scaled_alpha * 255).astype(np.uint8)]), "RGBA")


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    found = {}
    for path in sorted(SOURCE.glob("*.png")):
        for level in LEVELS:
            if path.stem.lower().endswith(f"-{level}"):
                found[level] = path
    missing = [level for level in LEVELS if level not in found]
    if missing:
        raise SystemExit(f"assets/think: no artwork for {', '.join(missing)} (expected *-Off.png, *-Low.png, *-High.png, *-Max.png)")
    for level in LEVELS:
        alpha, how = matte(found[level])
        source = Image.open(found[level]).convert("RGBA")
        # One pixel in gives the downscale clean edges instead of a colour fringe.
        alpha = alpha.filter(ImageFilter.MinFilter(3))
        art = resize_premultiplied(source, alpha, WIDTH)
        out = TARGET / f"{level}.webp"
        art.save(out, "WEBP", quality=QUALITY, method=6)
        clear = float((np.asarray(art)[:, :, 3] == 0).mean() * 100)
        print(f"assets/think/cutout/{out.name}: {art.width}x{art.height}, {out.stat().st_size // 1024} KB, "
              f"{clear:.0f}% transparent ({how} from {found[level].name})")


if __name__ == "__main__":
    main()
