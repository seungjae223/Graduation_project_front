// Licensed city panoramas. These are NOT derived from individual Place photos.
// The 1280px thumbnail URLs are the preview targets shown on the Commons file pages.
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
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Jeju Island seacoast.jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Jeju Island seacoast.jpg"),
    author: "Wikimedia Commons contributor", license: "See source"
  },
  "gyeongju": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Bulguksa Temple, Gyeongju - Bulguska2654.jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Bulguksa Temple, Gyeongju - Bulguska2654.jpg"),
    author: "lumoplank", license: "See source"
  },
  "bangkok": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Bangkok Skyline (MK).jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Bangkok Skyline (MK).jpg"),
    author: "Mathias Krumbholz", license: "See source"
  },
  "chiang-mai": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Chiang Mai Panorama.jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Chiang Mai Panorama.jpg"),
    author: "Jan Beck", license: "See source"
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
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Manila skyline from Doroteo Jose, Santa Cruz, Manila, May 2026.jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Manila skyline from Doroteo Jose, Santa Cruz, Manila, May 2026.jpg"),
    author: "Ralff Nestor Nacor", license: "See source"
  },
  "cebu": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Cebu City (Aerial).jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Cebu City (Aerial).jpg"),
    author: "Herbertkikoy", license: "CC BY-SA 4.0"
  },
  "new-york": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("New York City, Skyline.jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("New York City, Skyline.jpg"),
    author: "Davidswiki", license: "CC BY-SA 4.0"
  },
  "los-angeles": {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent("Downtown Los Angeles skyline.jpg")+"?width=960",
    source: "https://commons.wikimedia.org/wiki/File:"+encodeURIComponent("Downtown Los Angeles skyline.jpg"),
    author: "Serouj", license: "Public domain"
  }
});

export function getDestinationHero(code) {
  return Object.prototype.hasOwnProperty.call(HERO_PHOTOS, code) ? HERO_PHOTOS[code]
    : Object.prototype.hasOwnProperty.call(ADDITIONAL_PHOTOS, code) ? ADDITIONAL_PHOTOS[code] : null;
}
