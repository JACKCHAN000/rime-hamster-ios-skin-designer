"""Rasterize source-based README illustrations; requires CairoSVG."""
from pathlib import Path
import cairosvg

image_dir = Path(__file__).resolve().parent.parent / 'docs' / 'images'
for name in ('web-studio', 'generated-skins'):
    source = image_dir / f'{name}.svg'
    target = image_dir / f'{name}.png'
    cairosvg.svg2png(url=str(source), write_to=str(target), scale=1.5)
    print(f'Generated {target.name}')
