// Licensed destination photos, deliberately selected independently of Place photos.
// Locally hosted selections retain their full attribution in /destination-photos/sources.json.
// If an asset is unavailable the caller must render a neutral background, never a random Place photo.
const HERO_PHOTOS = Object.freeze({
  tokyo: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Shinjuku_skyline%2C_Tokyo_-_Sony_A7R_%2811831328835%29.jpg/1280px-Shinjuku_skyline%2C_Tokyo_-_Sony_A7R_%2811831328835%29.jpg",
    author: "Luke Ma", license: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Shinjuku_skyline,_Tokyo_-_Sony_A7R_(11831328835).jpg",
  },
  "hong-kong": {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Skyline_and_Victoria_Harbour_at_dusk%2C_view_from_Victoria_Peak%2C_Hong_Kong%2C_China_-_%E9%A6%99%E6%B8%AF%EF%BC%8C%E4%B8%AD%E5%9B%BD_%2816215094838%29.jpg/1280px-Skyline_and_Victoria_Harbour_at_dusk%2C_view_from_Victoria_Peak%2C_Hong_Kong%2C_China_-_%E9%A6%99%E6%B8%AF%EF%BC%8C%E4%B8%AD%E5%9B%BD_%2816215094838%29.jpg",
    author: "Romain Pontida", license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Skyline_and_Victoria_Harbour_at_dusk,_view_from_Victoria_Peak,_Hong_Kong,_China_-_%E9%A6%99%E6%B8%AF%EF%BC%8C%E4%B8%AD%E5%9B%BD_(16215094838).jpg",
  },
  osaka: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/D%C5%8Dtonbori_at_night%2C_Osaka_%2819551420339%29.jpg/1280px-D%C5%8Dtonbori_at_night%2C_Osaka_%2819551420339%29.jpg",
    author: "Kristoffer Trolle", license: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:D%C5%8Dtonbori_at_night,_Osaka_(19551420339).jpg",
  },
});

// Every mapped image has a dedicated Wikimedia Commons file page for attribution.
const ADDITIONAL_PHOTOS = Object.freeze({
  "seoul": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Skyline view from Seoul City (South Korea).jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Skyline view from Seoul City (South Korea).jpg"),
    author: "lnevay", license: "CC BY-SA 2.0"
  },
  "busan": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Skyline of Busan Including Gwangan Bridge, Marine City and LCT Skyscrapers.jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Skyline of Busan Including Gwangan Bridge, Marine City and LCT Skyscrapers.jpg"),
    author: "S h y numis", license: "CC BY-SA 4.0"
  },
  "jeju": {
    src: "/destination-photos/jeju.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Seongsan_Ilchulbong_from_the_air.jpg",
    author: "Korea.net / Korean Culture and Information Service", license: "CC BY-SA 2.0",
    position: "50% 65%"
  },
  "gyeongju": {
    src: "/destination-photos/gyeongju.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Field_of_Iceland_poppies_in_the_flower_garden_near_Cheomseongdae_Observatory_in_Gyeongju_South_Korea.jpg",
    author: "Basile Morin", license: "CC BY-SA 4.0",
    position: "50% 25%"
  },
  "bangkok": {
    src: "/destination-photos/bangkok.jpg",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("เจดีย์ประธานทรงปรางค์วัดอรุณ2.jpg"),
    author: "Mastertongapollo", license: "CC BY-SA 4.0",
    position: "50% 10%"
  },
  "chiang-mai": {
    src: "/destination-photos/chiang-mai.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Wat_Phra_That_Doi_Suthep_(I).jpg",
    author: "Supanut Arunoprayote", license: "CC BY 4.0",
    position: "50% 20%"
  },
  "da-nang": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Da Nang International Fireworks Festival DIFF Dragon Bridge Han River night skyline Vietnam.jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Da Nang International Fireworks Festival DIFF Dragon Bridge Han River night skyline Vietnam.jpg"),
    author: "Wikimedia Commons contributor", license: "See source"
  },
  "phu-quoc": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Phu Quoc Beach.jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Phu Quoc Beach.jpg"),
    author: "FrogsLegs71", license: "See source"
  },
  "manila": {
    src: "/destination-photos/manila.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Front_view_of_the_Manila_Cathedral.jpg",
    author: "Bobbet21", license: "CC BY-SA 4.0",
    position: "50% 15%"
  },
  "cebu": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Cebu City (Aerial).jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Cebu City (Aerial).jpg"),
    author: "Herbertkikoy", license: "CC BY-SA 4.0"
  },
  "new-york": {
    src: "/destination-photos/new-york.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Lady_Liberty_under_a_blue_sky.jpg",
    author: "Mcj1800", license: "CC BY-SA 4.0",
    position: "50% 12%"
  },
  "los-angeles": {
    src: "/destination-photos/los-angeles.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Hollywood_Sign.jpg",
    author: "Thomas Wolf, www.foto-tw.de", license: "CC BY-SA 3.0",
    position: "50% 60%"
  }
});

// Let the browser select a smaller Wikimedia thumbnail for small cards.
// Retain the existing verified original as the high-density fallback.
const withResponsiveSource = photo => {
  if (!photo?.src) return photo;
  if (photo.src.includes("/1280px-")) {
    return { ...photo, srcSet: `${photo.src.replace("/1280px-", "/640px-")} 640w, ${photo.src} 1280w` };
  }
  if (photo.src.includes("Special:FilePath/") && photo.src.endsWith("?width=960")) {
    return { ...photo, srcSet: `${photo.src.replace("?width=960", "?width=640")} 640w, ${photo.src} 960w` };
  }
  return photo;
};

export function getDestinationHero(code) {
  const photo = Object.prototype.hasOwnProperty.call(HERO_PHOTOS, code) ? HERO_PHOTOS[code]
    : Object.prototype.hasOwnProperty.call(ADDITIONAL_PHOTOS, code) ? ADDITIONAL_PHOTOS[code] : null;
  return withResponsiveSource(photo);
}
