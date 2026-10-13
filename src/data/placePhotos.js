// Only curated editorial cards and Mock data use this mapping. API images stay authoritative.
const photos = {
  "경복궁": {
    "image": "/place-photos/gyeongbokgung.jpg",
    "credit": "gyeongbokgung"
  },
  "남산서울타워": {
    "image": "/place-photos/n-seoul-tower.jpg",
    "credit": "n-seoul-tower"
  },
  "서울숲": {
    "image": "/place-photos/seoul-forest.jpg",
    "credit": "seoul-forest"
  },
  "북촌한옥마을": {
    "image": "/place-photos/bukchon.jpg",
    "credit": "bukchon"
  },
  "광장시장": {
    "image": "/place-photos/gwangjang.jpg",
    "credit": "gwangjang"
  },
  "롯데월드": {
    "image": "/place-photos/lotte-world.jpg",
    "credit": "lotte-world"
  },
  "사려니숲길": {
    "image": "/place-photos/saryeoni.jpg",
    "credit": "saryeoni"
  },
  "협재해수욕장": {
    "image": "/place-photos/hyeopjae.jpg",
    "credit": "hyeopjae"
  },
  "성산일출봉": {
    "image": "/place-photos/seongsan.jpg",
    "credit": "seongsan"
  },
  "해운대해수욕장": {
    "image": "/place-photos/haeundae.jpg",
    "credit": "haeundae"
  },
  "감천문화마을": {
    "image": "/place-photos/gamcheon.jpg",
    "credit": "gamcheon"
  },
  "죽녹원": {
    "image": "/place-photos/juknokwon.jpg",
    "credit": "juknokwon"
  },
  "제주 동문시장": {
    "image": "/place-photos/dongmun.jpg",
    "credit": "dongmun"
  },
  "부산 국제시장": {
    "image": "/place-photos/gukje.jpg",
    "credit": "gukje"
  },
  "도쿄 신주쿠 교엔": {
    "image": "/place-photos/shinjuku-gyoen.jpg",
    "credit": "shinjuku-gyoen"
  },
  "도쿄 센소지": {
    "image": "/place-photos/sensoji.jpg",
    "credit": "sensoji"
  },
  "도쿄 츠키지 시장": {
    "image": "/place-photos/tsukiji.jpg",
    "credit": "tsukiji"
  },
  "도쿄 스카이트리": {
    "image": "/place-photos/skytree.jpg",
    "credit": "skytree"
  },
  "교토 아라시야마": {
    "image": "/place-photos/arashiyama.jpg",
    "credit": "arashiyama"
  },
  "오사카 도톤보리": {
    "image": "/place-photos/dotonbori.jpg",
    "credit": "dotonbori"
  },
  "나라 공원": {
    "image": "/place-photos/nara.jpg",
    "credit": "nara"
  },
  "후쿠오카 오호리 공원": {
    "image": "/place-photos/ohori.jpg",
    "credit": "ohori"
  },
  "삿포로 오도리 공원": {
    "image": "/place-photos/odori.jpg",
    "credit": "odori"
  },
  "서울 시티 나이트 투어": {
    "image": "/place-photos/seoul-night.jpg",
    "credit": "seoul-night"
  },
  "제주 오설록": {
    "image": "/place-photos/osulloc.jpg",
    "credit": "osulloc"
  },
  "부산 광안리": {
    "image": "/place-photos/gwangalli.jpg",
    "credit": "gwangalli"
  }
};
export function getPlacePhoto(name) {
  const photo = photos[name];
  return photo ? { ...photo, image: `${process.env.PUBLIC_URL}${photo.image}` } : { image: "", credit: undefined };
}
