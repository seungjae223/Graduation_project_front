from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).parent
for theme in ['light', 'dark']:
    files = sorted((root / 'screens' / '1920x1080' / theme).glob('*.jpg'))
    sheet = Image.new('RGB', (1100, ((len(files)+4)//5)*310), '#e4e7ec')
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(files):
        im = Image.open(path)
        center = im.width // 2
        im = im.crop((center-280, 0, center+280, min(im.height, 1020)))
        im.thumbnail((208, 275))
        x, y = (i%5)*220, (i//5)*310
        draw.text((x+6, y+4), path.stem, fill='#202938')
        sheet.paste(im, (x+(220-im.width)//2, y+28))
    sheet.save(root / ('final-overview-1920-'+theme+'.jpg'), quality=90)

pair = Image.new('RGB', (780, 464), '#e4e7ec')
for i, theme in enumerate(['light', 'dark']):
    im = Image.open(root / 'after' / ('memo-390-'+theme+'.jpg'))
    pair.paste(im.crop((0, 200, 390, 664)), (390*i, 0))
pair.save(root / 'memo-final.jpg', quality=93)
