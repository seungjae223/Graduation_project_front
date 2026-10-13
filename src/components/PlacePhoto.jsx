import { useState } from "react";
import "./PlacePhoto.css";

// Keep the same neutral area for absent photos and failed requests.
export default function PlacePhoto({ src, alt, className = "", credit }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const [portraitSrc, setPortraitSrc] = useState(null);
  const available = Boolean(src) && failedSrc !== src;
  return <>
    {available ? <img src={src} alt={alt} className={className} style={{ objectFit: portraitSrc === src ? "contain" : "cover" }}
      onLoad={event => setPortraitSrc(event.currentTarget.naturalWidth < event.currentTarget.naturalHeight ? src : null)} onError={() => setFailedSrc(src)} /> :
      <div className={`${className} place-photo-placeholder`} role="img" aria-label={`${alt} 사진 정보 없음`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 3-3 4 4" /></svg>
        <span>사진 정보 없음</span>
      </div>}
    {available && credit && <a className="place-photo-credit" href={`${process.env.PUBLIC_URL}/place-photos/credits.html#${credit}`} target="_blank" rel="noreferrer"
      aria-label={`${alt} 사진 출처`} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>사진 출처</a>}
  </>;
}
