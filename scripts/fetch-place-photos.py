"""Fetch place-specific Commons photos, keeping their license and source metadata."""
import html, io, json, re, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'place-photos'
OUT.mkdir(parents=True, exist_ok=True)
PLACES = [
 ('gyeongbokgung', '경복궁', 'Gyeongbokgung'),
 ('n-seoul-tower', '남산서울타워', 'N Seoul Tower'),
 ('seoul-forest', '서울숲', 'Seoul Forest'),
 ('bukchon', '북촌한옥마을', 'Bukchon Hanok Village'),
 ('gwangjang', '광장시장', 'Gwangjang Market'),
 ('lotte-world', '롯데월드', 'Lotte World'),
 ('saryeoni', '사려니숲길', 'Saryeoni Forest'),
 ('hyeopjae', '협재해수욕장', 'Hyeopjae Beach'),
 ('seongsan', '성산일출봉', 'Seongsan Ilchulbong'),
 ('haeundae', '해운대해수욕장', 'Haeundae Beach'),
 ('gamcheon', '감천문화마을', 'Gamcheon Culture Village'),
 ('juknokwon', '죽녹원', 'Juknokwon'),
 ('dongmun', '제주 동문시장', 'Dongmun Market'),
 ('gukje', '부산 국제시장', 'Gukje Market'),
 ('shinjuku-gyoen', '도쿄 신주쿠 교엔', 'Shinjuku Gyo-en'),
 ('sensoji', '도쿄 센소지', 'Sensō-ji'),
 ('tsukiji', '도쿄 츠키지 시장', 'Tsukiji fish market'),
 ('skytree', '도쿄 스카이트리', 'Tokyo Skytree'),
 ('arashiyama', '교토 아라시야마', 'Arashiyama'),
 ('dotonbori', '오사카 도톤보리', 'Dōtonbori'),
 ('nara', '나라 공원', 'Nara Park'),
 ('ohori', '후쿠오카 오호리 공원', 'Ōhori Park'),
 ('odori', '삿포로 오도리 공원', 'Odori Park'),
 ('seoul-night', '서울 시티 나이트 투어', None),
 ('osulloc', '제주 오설록', None),
 ('gwangalli', '부산 광안리', None),
]
EXPLICIT = {'서울숲':'SeoulForest.jpg', '서울 시티 나이트 투어':'Seoul city skyline at night from Namsan Mountain (49175035266).jpg', '부산 광안리':'Gwangalli Beach.jpg',
            '제주 오설록':'Osulloc Tea Museum & Fields, Jeju.jpg', '죽녹원':'Bamboo forest in Damyang South Korea 2015-05-06(6).jpg',
            '남산서울타워':'N Seoul Tower (6).jpg', '롯데월드':'Seoul Lotte World.jpg',
            '사려니숲길':'사려니숲길 외부 모습.jpg', '제주 동문시장':'Dongmun Market 01.JPG'}
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'NomanGo/1.0 (place image attribution)'}), timeout=35).read()
def query(domain, params):
    return json.loads(get(f'https://{domain}/w/api.php?' + urllib.parse.urlencode({'format':'json', **params})))
def plain(value):
    return html.unescape(re.sub('<[^>]+>', '', value or '')).strip()
articles = [article for _, name, article in PLACES if article and name not in EXPLICIT]
page_data = query('en.wikipedia.org', {'action':'query','titles':'|'.join(articles),'redirects':1,'prop':'pageimages','piprop':'name'})['query']
redirects = {r['from']:r['to'] for r in page_data.get('redirects',[])}
normalized = {r['from']:r['to'] for r in page_data.get('normalized',[])}
pages = {p['title']:p.get('pageimage') for p in page_data['pages'].values()}
for _, name, article in PLACES:
    key = normalized.get(article, article)
    if name not in EXPLICIT: EXPLICIT[name] = pages.get(redirects.get(key,key))
time.sleep(2)
commons = query('commons.wikimedia.org', {'action':'query','titles':'|'.join('File:'+f for f in EXPLICIT.values() if f),
              'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':960})['query']['pages']
infos = {p['title']:p.get('imageinfo',[{}])[0] for p in commons.values()}
existing = {r['name']:r for r in json.loads((OUT/'sources.json').read_text(encoding='utf-8'))} if (OUT/'sources.json').exists() else {}
def fetch(row):
    slug, name, article = row
    try:
        filename = EXPLICIT.get(name)
        if name in existing and not existing[name].get('missing') and existing[name].get('file','').replace('_',' ') == (filename or '').replace('_',' '): return existing[name]
        if not filename:
            return {'name':name,'missing':True,'reason':'No verified article photo'}
        info = infos.get('File:'+filename.replace('_',' '), {})
        meta = info.get('extmetadata',{})
        license = plain(meta.get('LicenseShortName',{}).get('value'))
        if not (license.startswith('CC') or license.startswith('Public domain') or license == 'KOGL Type 1'):
            return {'name':name,'missing':True,'reason':'License requires review: '+license,'file':filename}
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(get(info.get('thumburl') or info['url'])))).convert('RGB')
        img.thumbnail((1200,1200))
        img.save(OUT / (slug+'.jpg'), quality=88, optimize=True)
        return {'name':name,'path':'/place-photos/'+slug+'.jpg','file':filename,'source':info['descriptionurl'],
                'author':plain(meta.get('Artist',{}).get('value')),'license':license,
                'licenseUrl':meta.get('LicenseUrl',{}).get('value',''),
                'description':plain(meta.get('ImageDescription',{}).get('value')),
                'changes':'Resized and JPEG re-encoded; displayed with proportional cropping.'}
    except Exception as e:
        return {'name':name,'missing':True,'reason':str(e)}
results = []
for row in PLACES:
    results.append(fetch(row))
    time.sleep(1)
(OUT/'sources.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
for row in results:
    print(row['name'], row.get('file',''), row.get('license',''), 'MISSING' if row.get('missing') else 'OK')
