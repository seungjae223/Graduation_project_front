import html2canvas from "html2canvas";
import { loadKakaoMapsScript } from "./kakaoMapLoader";
import { preparePdfImages, waitForPdfImages } from "./pdfTask";

// Build maps only inside the visible export clone. The on-screen map stays intact.
export async function preparePdfMaps(root) {
  if (root.querySelector("[data-pdf-map-error]")) throw new Error("PDF Google 지도 설정을 확인해 주세요.");
  for (const container of root.querySelectorAll("[data-pdf-kakao-map]")) {
    const data = JSON.parse(container.dataset.pdfKakaoMap);
    if (!container.clientWidth || !container.clientHeight) throw new Error("PDF 지도 영역 크기가 0입니다.");
    const kakao = await loadKakaoMapsScript();
    const map = new kakao.maps.Map(container, {
      center: new kakao.maps.LatLng(data.center.lat, data.center.lng), level: 7,
    });
    const overlays = [];
    const bounds = new kakao.maps.LatLngBounds();
    for (const marker of data.markers) {
      const position = new kakao.maps.LatLng(marker.lat, marker.lng);
      bounds.extend(position);
      overlays.push(new kakao.maps.Marker({ map, position, title: marker.title }));
    }
    for (const line of data.lines) {
      const path = line.path.map(point => new kakao.maps.LatLng(point.lat, point.lng));
      path.forEach(point => bounds.extend(point));
    }
    try {
      await new Promise((resolve, reject) => {
        const loaded = () => { clearTimeout(timer); kakao.maps.event.removeListener(map, "tilesloaded", loaded); resolve(); };
        const timer = setTimeout(() => {
          kakao.maps.event.removeListener(map, "tilesloaded", loaded);
          reject(new Error("PDF 지도 타일 로드 시간 초과"));
        }, 15000);
        kakao.maps.event.addListener(map, "tilesloaded", loaded);
        if (data.markers.length > 1) map.setBounds(bounds);
        else map.setLevel(data.markers.length === 1 ? 4 : 7);
      });
      await preparePdfImages(container);
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, allowTaint: false,
        backgroundColor: "#ffffff", logging: false });
      // Kakao's SVG overlay is not reliably preserved by html2canvas. Draw the
      // same route coordinates with the SDK projection into the export bitmap.
      const context = canvas.getContext("2d");
      context.save();
      context.setTransform(canvas.width / container.clientWidth, 0, 0, canvas.height / container.clientHeight, 0, 0);
      context.lineWidth = 10;
      context.lineJoin = "round";
      context.lineCap = "round";
      for (const line of data.lines) {
        context.strokeStyle = line.color || "#FF3B30";
        context.beginPath();
        line.path.forEach((point, index) => {
          const pixel = map.getProjection().containerPointFromCoords(new kakao.maps.LatLng(point.lat, point.lng));
          if (index === 0) context.moveTo(pixel.x, pixel.y);
          else context.lineTo(pixel.x, pixel.y);
        });
        context.stroke();
      }
      context.restore();
      const image = document.createElement("img");
      image.src = canvas.toDataURL("image/png");
      image.alt = container.dataset.pdfMapLabel || "경로 지도";
      image.className = "route-map-static-image";
      image.dataset.pdfAsset = "true";
      overlays.forEach(overlay => overlay.setMap(null));
      container.replaceChildren(image);
      await waitForPdfImages(container);
    } finally { overlays.forEach(overlay => overlay.setMap(null)); }
  }
}
