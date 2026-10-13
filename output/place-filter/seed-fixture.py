import csv, json
from pathlib import Path

seed = Path('C:/Users/joyfu/Downloads/noman-go-main/noman-go-main/src/main/resources/data/places_insert.sql')
places = []
for line in seed.read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if not line.startswith("('"):
        continue
    values = next(csv.reader([line.rstrip(',;')[1:-1]], quotechar="'", skipinitialspace=True))
    assert len(values) == 8, len(values)
    region, name, theme, description, address, latitude, longitude, kind = values
    places.append(dict(id=len(places)+1, region=region, name=name, theme=theme, description=description,
                       address=address, latitude=float(latitude), longitude=float(longitude), placeType=kind))
assert len(places) == 600, len(places)
Path(__file__).with_name('seed-places.json').write_text(json.dumps(places, ensure_ascii=False), encoding='utf-8')
print('600 seed records converted to local API fixtures; no database writes.')
