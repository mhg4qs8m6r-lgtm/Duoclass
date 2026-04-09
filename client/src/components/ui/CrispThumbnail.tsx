import { useRef, useEffect } from "react";

/**
 * CrispThumbnail — affiche une image source sur un <canvas> rasterisé
 * à la taille d'affichage exacte, avec les traits épaissis proportionnellement
 * au ratio de réduction.
 *
 * Problème : un PNG de page A4 (756×1070 px) affiché à 150 px réduit ×5
 * → un trait de 2px source devient 0.4px, invisible.
 *
 * Solution : après le drawImage réduit, on redessine l'image décalée de
 * ±N pixels dans les 8 directions en mode "darken". Cela dilate uniquement
 * les pixels sombres (les traits) sans toucher au fond blanc.
 * N = ceil(ratio / 2) pour qu'un trait de 2px source devienne ~ratio × 2px
 * dans la vignette, soit toujours bien visible.
 */

const THUMB_W = 400;
const THUMB_H = 560;

interface CrispThumbnailProps {
  src: string;
  alt?: string;
  className?: string;
}

export default function CrispThumbnail({ src, alt, className }: CrispThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Fond blanc
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, THUMB_W, THUMB_H);

      // Scale "object-contain"
      const scale = Math.min(THUMB_W / img.naturalWidth, THUMB_H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = (THUMB_W - dw) / 2;
      const dy = (THUMB_H - dh) / 2;

      // Ratio de réduction (ex: 756 → 400 = ratio ~1.9, 756 → 150 = ratio ~5)
      const ratio = 1 / scale;

      // Rayon de dilatation : proportionnel au ratio, min 1px
      const dilate = Math.max(1, Math.ceil(ratio / 2));

      // Passe 1 : dessiner l'image normalement
      ctx.drawImage(img, dx, dy, dw, dh);

      // Passe 2 : dilater les traits sombres en redessinant en mode "darken"
      // avec des décalages dans les 8 directions (N, S, E, W, NE, NW, SE, SW)
      ctx.globalCompositeOperation = "darken";
      for (let ox = -dilate; ox <= dilate; ox++) {
        for (let oy = -dilate; oy <= dilate; oy++) {
          if (ox === 0 && oy === 0) continue;
          ctx.drawImage(img, dx + ox, dy + oy, dw, dh);
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };
    img.src = src;
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_W}
      height={THUMB_H}
      className={className}
      aria-label={alt}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
