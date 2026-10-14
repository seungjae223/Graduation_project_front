import { useState } from "react";
import { placeImageUrl, resolvePlaceImage } from "../utils/placeImageResolver";
import "./PlacePhoto.css";

// Keep the same neutral area for absent photos and failed requests.
export default function PlacePhoto({ place, src: suppliedSrc, alt, className = "", credit: suppliedCredit, loading = "lazy" }) {
  const verified = resolvePlaceImage(place);
  const src = verified ? placeImageUrl(verified) : suppliedSrc;
  const credit = verified?.credit || suppliedCredit;
  const [failedSrc, setFailedSrc] = useState(null);
  const [portraitSrc, setPortraitSrc] = useState(null);
  const available = Boolean(src) && failedSrc !== src;
  return <>
    {available ? <img src={src} alt={alt} className={className} loading={loading} decoding="async"
      style={{ objectFit: portraitSrc === src ? "contain" : "cover", objectPosition: verified?.objectPosition || "50% 50%" }}
      onLoad={event => setPortraitSrc(event.currentTarget.naturalWidth < event.currentTarget.naturalHeight ? src : null)} onError={() => setFailedSrc(src)} /> :
      <div className={`${className} place-photo-placeholder`} role="img" aria-label={`${alt} 사진 정보 없음`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 3-3 4 4" /></svg>
        <span>사진 정보 없음</span>
      </div>}
    {available && credit && <a className="place-photo-credit" href={`${process.env.PUBLIC_URL || ""}/${verified ? "place-images" : "place-photos"}/credits.html#${credit}`} target="_blank" rel="noreferrer"
      title={verified ? `${verified.author} · ${verified.license}` : undefined}
      aria-label={`${alt} 사진 출처`} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>사진 출처</a>}
  </>;
}
