"""Restore only five approved photos. Never publish unverified or empty bytes."""
import argparse
import concurrent.futures
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import parse_qs, urljoin, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
RECORDS = json.loads(Path(__file__).with_suffix('.json').read_text(encoding='utf-8'))
LIMIT = 20 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def get(url, referer):
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': referer})
    with urlopen(req, timeout=25) as response:
        data = response.read(LIMIT + 1)
    if not data or len(data) > LIMIT:
        raise ValueError('Empty or oversized response')
    return data


class Sources(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.urls = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and key in ('src', 'data-src', 'data-url', 'href', 'content'):
                self.urls.append(value)


def recover(record, assets_dir=None):
    local = ROOT / ('public' + record['imageUrl'])
    candidates = [local]
    if assets_dir:
        candidates.insert(0, assets_dir / Path(record['imageUrl']).name)
    for file in candidates:
        if file.is_file() and digest(file.read_bytes()) == record['imageSha256']:
            return record, file.read_bytes()
    source = record['imageSource']
    page = get(source, source).decode('utf-8')
    parser = Sources()
    parser.feed(page)
    parser.urls.extend(re.findall(r'https?://[^\s\"\'<>]+', html.unescape(page).replace('\\/', '/')))
    urls = []
    approved = {'blog.kakaocdn.net', 't1.daumcdn.net', 'img1.daumcdn.net', 'img2.daumcdn.net', 'img3.daumcdn.net', 'img4.daumcdn.net', urlsplit(source).hostname}
    for candidate in parser.urls:
        candidate = urljoin(source, html.unescape(candidate))
        parsed = urlsplit(candidate)
        variants = parse_qs(parsed.query).get('fname', []) + [candidate]
        for variant in variants:
            item = urlsplit(variant)
            if item.scheme == 'https' and item.hostname in approved and not item.username and not item.password:
                if item.hostname == urlsplit(source).hostname and not re.search(r'/(image|attachment)/', item.path):
                    continue
                if variant not in urls:
                    urls.append(variant)
    urls = urls[:100]
    def attempt(url):
        try:
            data = get(url, source)
            return data if digest(data) == record['imageSha256'] else None
        except Exception:
            return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for data in pool.map(attempt, urls):
            if data:
                print('Verified original:', record['placeName'], len(data), 'bytes', flush=True)
                return record, data
    raise RuntimeError('Original photo hash not found: ' + record['placeName'] + '; no application files have been changed')


def patch_resolver(text):
    if 'const matchesIdentity = record =>' in text:
        raise RuntimeError('Resolver changed since preparation; review it before retrying')
    start = text.index('    const lat = numeric(')
    stop = text.index('    const candidates = ', start)
    replacement = '''    const rawLat = raw.latitude ?? raw.lat, rawLng = raw.longitude ?? raw.lng ?? raw.lon;
    const supplied = value => value !== null && value !== undefined && value !== "";
    const hasAnyCoordinate = supplied(rawLat) || supplied(rawLng);
    const lat = numeric(rawLat), lng = numeric(rawLng);
    const hasCoordinates = lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    if (!name || (hasAnyCoordinate && !hasCoordinates)) return null;
    const region = normalize(raw.region);
    const explicitCountry = raw.countryCode || raw.country || raw.nationCode;
    const country = countryCode(explicitCountry);
    const overseasGroup = normalize(explicitCountry) === "overseas";
    if (explicitCountry && !country && !overseasGroup) return null;
    const address = normalize(raw.address || raw.roadAddress);
    const matchesIdentity = record =>
      [record.placeName, ...(record.aliases || [])].some(alias => normalize(alias) === name) &&
      (!region || [record.region, ...(record.regionAliases || [])].some(value => region === normalize(value))) &&
      (!country || country === record.countryCode) &&
      (!overseasGroup || record.countryCode !== "KR") &&
      (!address || address === normalize(record.address));
    const matches = record => matchesIdentity(record) && hasCoordinates && distanceKm(lat, lng, record) <= 0.25;
    // Compact cards require an exact stored ID, exact name and region.
    // Supplied but invalid/partial coordinates never become a missing-coordinate fallback.
    const matchesId = record => matchesIdentity(record) && (hasCoordinates ? matches(record) : Boolean(region));
    if (explicitId != null && byId.has(String(explicitId))) {
      const record = byId.get(String(explicitId));
      return matchesId(record) ? record : null;
    }
    if (explicitId == null && id != null && byId.has(String(id))) {
      const record = byId.get(String(id));
      if (matchesId(record)) return record;
    }
    if (!hasCoordinates) return null;
'''
    return text[:start] + replacement + text[stop:]


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--assets-dir', type=Path)
    options = args.parse_args()
    manifest_path = ROOT / 'src/data/placeImages.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    names = {r['identityKey'] for r in RECORDS}
    if any(r.get('identityKey') in names for r in manifest):
        raise RuntimeError('A target is already mapped; refusing to overwrite concurrent work')
    ids = {str(r['placeId']) for r in manifest if r.get('placeId') is not None}
    if any(str(r['placeId']) in ids for r in RECORDS):
        raise RuntimeError('A historical place ID is already in use; refusing an ambiguous mapping')
    # Recover and checksum every original before changing application files.
    recovered = [recover(record, options.assets_dir) for record in RECORDS]
    resolver_path = ROOT / 'src/utils/placeImageResolver.js'
    new_resolver = patch_resolver(resolver_path.read_text(encoding='utf-8'))
    for record, data in recovered:
        target = ROOT / ('public' + record['imageUrl'])
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    manifest += RECORDS
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    resolver_path.write_text(new_resolver, encoding='utf-8')
    # Run the real resolver with the real complete manifest, without npm dependencies.
    smoke = r'''
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const images = JSON.parse(fs.readFileSync('src/data/placeImages.json', 'utf8'));
const restored = JSON.parse(fs.readFileSync('scripts/restore-five-place-photos.json', 'utf8'));
const source = fs.readFileSync('src/utils/placeImageResolver.js','utf8').replace(/^import .*;\s*$/gm, '').replace(/export /g, '');
const context = { verifiedImages: images, URL, process: {env: {}} };
vm.runInNewContext(source + '\nthis.resolve = resolvePlaceImage; this.photoUrl = placeImageUrl;', context);
for (const image of images) {
 const payload = {id:90000, name:image.placeName, region:image.region, address:image.address, latitude:image.latitude, longitude:image.longitude};
 assert.equal(context.resolve(payload), image, image.identityKey);
}
for (const image of restored) {
 const payload = {id:image.placeId, name:image.placeName, region:image.region, countryCode:image.countryCode};
 assert.equal(context.resolve(payload).identityKey, image.identityKey);
 assert.equal(context.photoUrl(context.resolve(payload)), image.imageUrl);
 for (const patch of [{name:'wrong'}, {region:'wrong'}, {countryCode:'KR'}, {latitude:NaN, longitude:image.longitude}, {latitude:0,longitude:0}, {latitude:image.latitude}]) assert.equal(context.resolve({...payload,...patch}), null);
 const data = fs.readFileSync('public'+image.imageUrl);
 assert.equal(require('node:crypto').createHash('sha256').update(data).digest('hex'), image.imageSha256);
}
console.log('PASS: '+images.length+' complete catalog identities, 5 compact-card mappings, conflict checks and 5 original image hashes.');
'''
    subprocess.run(['node', '-e', smoke], cwd=ROOT, check=True)
    print('Restored only the five requested places; other records and all styling preserved.')


if __name__ == '__main__':
    main()
