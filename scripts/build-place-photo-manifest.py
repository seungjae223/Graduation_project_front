import html, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
rows = json.loads((root/'public/place-photos/sources.json').read_text(encoding='utf-8'))
photos = {r['name']:{'image':r['path'],'credit':Path(r['path']).stem} for r in rows if not r.get('missing')}
(root/'src/data').mkdir(exist_ok=True)
(root/'src/data/placePhotos.js').write_text('// Only curated editorial cards and Mock data use this mapping. API images stay authoritative.\nconst photos = '+json.dumps(photos,ensure_ascii=False,indent=2)+';\nexport function getPlacePhoto(name) {\n  const photo = photos[name];\n  return photo ? { ...photo, image: `${process.env.PUBLIC_URL}${photo.image}` } : { image: "", credit: undefined };\n}\n',encoding='utf-8')
entries = []
for r in rows:
    if r.get('missing'): continue
    esc = lambda key: html.escape(r.get(key,''),quote=True)
    entries.append(f'<section id="{Path(r["path"]).stem}"><h2>{esc("name")}</h2><p>Photo: {esc("author")} · <a href="{esc("source")}">{esc("file")}</a> · <a href="{esc("licenseUrl")}">{esc("license")}</a></p><p>{esc("changes")}</p></section>')
(root/'public/place-photos/credits.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>장소 사진 출처</title><style>body{font:16px/1.6 sans-serif;max-width:800px;margin:auto;padding:24px}section{padding:16px 0;border-bottom:1px solid #ddd}a{overflow-wrap:anywhere}</style><h1>장소 사진 출처</h1>'+''.join(entries)+'</html>',encoding='utf-8')
print('Mapped photos:',len(photos),'Missing:',len(rows)-len(photos))
