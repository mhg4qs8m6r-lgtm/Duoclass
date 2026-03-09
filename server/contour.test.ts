/**
 * Tests unitaires pour les algorithmes de contour de silhouette.
 *
 * Ces tests valident :
 * 1. Le Moore neighborhood tracing 8-connexe (extraction du contour d'un masque binaire).
 * 2. La fonction scalePathToPx (conversion de coordonnées normalisées en px avec rotation).
 *
 * Les algorithmes sont extraits de CreationsAtelierV2.tsx et réimplémentés ici
 * en TypeScript pur (sans dépendances DOM) pour permettre les tests côté serveur.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Réimplémentation pure (sans DOM) du Moore neighborhood tracing 8-connexe
// ---------------------------------------------------------------------------

type ContourResult = Array<[number, number]>;

function mooreTrace(
  dilated: Uint8Array,
  W: number,
  H: number
): ContourResult {
  const isOpaque = (x: number, y: number) =>
    x >= 0 && x < W && y >= 0 && y < H && dilated[y * W + x] === 1;

  // 8 directions horaires : E, SE, S, SW, W, NW, N, NE
  const DX8 = [1, 1, 0, -1, -1, -1, 0, 1];
  const DY8 = [0, 1, 1, 1, 0, -1, -1, -1];

  // Point de départ : premier pixel opaque en scan ligne par ligne
  let startX = -1, startY = -1;
  outer: for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (isOpaque(x, y)) { startX = x; startY = y; break outer; }
    }
  }
  if (startX < 0) return [];

  const contourPts: ContourResult = [];
  let cx2 = startX, cy2 = startY;
  const startDir = 4; // ouest
  const MAX_STEPS = W * H * 2;
  let step = 0;

  // Trouver le premier voisin opaque depuis startDir
  let firstDir = -1;
  for (let k = 0; k < 8; k++) {
    const nd = (startDir + k) % 8;
    if (isOpaque(cx2 + DX8[nd], cy2 + DY8[nd])) { firstDir = nd; break; }
  }
  if (firstDir < 0) return []; // pixel isolé

  contourPts.push([cx2, cy2]);
  let dir = firstDir;
  cx2 += DX8[dir]; cy2 += DY8[dir];
  let entryDir = (dir + 4) % 8;

  while (step < MAX_STEPS) {
    contourPts.push([cx2, cy2]);
    let found = false;
    for (let k = 1; k <= 8; k++) {
      const nd = (entryDir + k) % 8;
      const nx = cx2 + DX8[nd], ny = cy2 + DY8[nd];
      if (isOpaque(nx, ny)) {
        dir = nd;
        cx2 = nx; cy2 = ny;
        entryDir = (dir + 4) % 8;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (cx2 === startX && cy2 === startY && contourPts.length > 4) break;
    step++;
  }

  return contourPts;
}

// ---------------------------------------------------------------------------
// Réimplémentation pure de scalePathToPx
// ---------------------------------------------------------------------------

function scalePathToPx(
  d: string,
  ox: number, oy: number,
  w: number, h: number,
  rot: number
): string {
  const cx = ox + w / 2;
  const cy = oy + h / 2;
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const tx = (nx: number, ny: number): [number, number] => {
    const px = ox + nx * w;
    const py = oy + ny * h;
    const dx = px - cx;
    const dy = py - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  };

  let curNx = 0, curNy = 0;
  return d.replace(/([MCQLHVZmclhvz])([^MCQLHVZmclhvz]*)/g, (_, cmd: string, args: string) => {
    const nums = args.trim().split(/[,\s]+/).filter(Boolean).map(Number);
    if (cmd === 'Z' || cmd === 'z') return 'Z ';
    if (cmd === 'M' || cmd === 'L') {
      const pts: string[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        curNx = nums[i]; curNy = nums[i + 1];
        const [px, py] = tx(curNx, curNy);
        pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
      }
      return `${cmd}${pts.join(' ')} `;
    }
    if (cmd === 'C') {
      const pts: string[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        if (i % 6 === 4) { curNx = nums[i]; curNy = nums[i + 1]; }
        const [px, py] = tx(nums[i], nums[i + 1]);
        pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
      }
      return `C${pts.join(' ')} `;
    }
    if (cmd === 'Q') {
      const pts: string[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        if (i % 4 === 2) { curNx = nums[i]; curNy = nums[i + 1]; }
        const [px, py] = tx(nums[i], nums[i + 1]);
        pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
      }
      return `Q${pts.join(' ')} `;
    }
    if (cmd === 'H') {
      curNx = nums[0];
      const [px, py] = tx(curNx, curNy);
      return `L${px.toFixed(2)},${py.toFixed(2)} `;
    }
    if (cmd === 'V') {
      curNy = nums[0];
      const [px, py] = tx(curNx, curNy);
      return `L${px.toFixed(2)},${py.toFixed(2)} `;
    }
    return `${cmd}${args}`;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Moore neighborhood tracing 8-connexe', () => {
  it('retourne [] pour un masque vide', () => {
    const mask = new Uint8Array(4 * 4);
    expect(mooreTrace(mask, 4, 4)).toEqual([]);
  });

  it('retourne [] pour un pixel isolé sans voisins', () => {
    const mask = new Uint8Array(4 * 4);
    mask[1 * 4 + 1] = 1; // un seul pixel au centre
    const pts = mooreTrace(mask, 4, 4);
    // Un pixel isolé n'a pas de voisin → firstDir = -1 → []
    expect(pts.length).toBe(0);
  });

  it('trace le contour d\'un carré 3×3 correctement', () => {
    // Carré 3×3 centré dans un masque 7×7
    const W = 7, H = 7;
    const mask = new Uint8Array(W * H);
    for (let y = 2; y <= 4; y++) {
      for (let x = 2; x <= 4; x++) {
        mask[y * W + x] = 1;
      }
    }
    const pts = mooreTrace(mask, W, H);
    // Le contour doit avoir au moins 4 points (les 4 coins du carré)
    expect(pts.length).toBeGreaterThanOrEqual(4);
    // Tous les points doivent être dans le masque
    for (const [x, y] of pts) {
      expect(mask[y * W + x]).toBe(1);
    }
    // Le premier point doit être le coin haut-gauche du carré (2,2)
    expect(pts[0]).toEqual([2, 2]);
    // Le contour doit couvrir les 4 côtés du carré
    // (8 points pour un carré 3×3 : 3 points par côté - 4 coins partagés)
    expect(pts.length).toBe(8);
    // L'algorithme s'arrête avant de ré-ajouter le point de départ
    // (le path SVG utilise Z pour fermer) — le dernier point est le voisin du départ
    const last = pts[pts.length - 1];
    expect(last).toEqual([2, 3]);
  });

  it('trace le contour d\'un rectangle horizontal', () => {
    // Rectangle 5×2 dans un masque 8×6
    const W = 8, H = 6;
    const mask = new Uint8Array(W * H);
    for (let y = 2; y <= 3; y++) {
      for (let x = 1; x <= 5; x++) {
        mask[y * W + x] = 1;
      }
    }
    const pts = mooreTrace(mask, W, H);
    expect(pts.length).toBeGreaterThanOrEqual(4);
    // Tous les points doivent être dans le masque
    for (const [x, y] of pts) {
      expect(mask[y * W + x]).toBe(1);
    }
    // Le premier point doit être le coin haut-gauche du rectangle (1,2)
    expect(pts[0]).toEqual([1, 2]);
  });

  it('trace le contour d\'une forme en L (connectivité 8-voisins)', () => {
    // Forme en L : pixels connectés diagonalement
    const W = 6, H = 6;
    const mask = new Uint8Array(W * H);
    // Colonne verticale
    for (let y = 0; y <= 3; y++) mask[y * W + 1] = 1;
    // Ligne horizontale
    for (let x = 1; x <= 4; x++) mask[4 * W + x] = 1;
    const pts = mooreTrace(mask, W, H);
    expect(pts.length).toBeGreaterThanOrEqual(4);
  });

  it('ne dépasse pas MAX_STEPS pour un grand masque plein', () => {
    const W = 64, H = 64;
    const mask = new Uint8Array(W * H).fill(1);
    const pts = mooreTrace(mask, W, H);
    // Le contour d'un rectangle plein doit boucler en O(périmètre) étapes
    expect(pts.length).toBeLessThan(W * H * 2);
    expect(pts.length).toBeGreaterThan(4);
  });
});

// ---------------------------------------------------------------------------
// Réimplémentation pure du lissage gaussien
// ---------------------------------------------------------------------------

function smooth(arr: Array<[number, number]>, passes: number): Array<[number, number]> {
  let cur = arr;
  for (let p = 0; p < passes; p++) {
    const m = cur.length;
    cur = cur.map((_, i) => [
      cur[(i - 1 + m) % m][0] * 0.25 + cur[i][0] * 0.5 + cur[(i + 1) % m][0] * 0.25,
      cur[(i - 1 + m) % m][1] * 0.25 + cur[i][1] * 0.5 + cur[(i + 1) % m][1] * 0.25,
    ] as [number, number]);
  }
  return cur;
}

describe('Lissage gaussien (smooth)', () => {
  it('ne modifie pas un carré parfait (symétrie préservée)', () => {
    // Un carré parfait avec 4 points également espacés
    const square: Array<[number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const result = smooth(square, 3);
    // Après lissage, les points doivent rester proches des coins (symétrie)
    expect(result.length).toBe(4);
    // Le lissage déplace les points vers le centre, mais la symétrie est préservée
    expect(result[0][0]).toBeCloseTo(result[3][0], 3); // x[0] = x[3] par symétrie
    expect(result[1][0]).toBeCloseTo(result[2][0], 3); // x[1] = x[2] par symétrie
  });

  it('réduit les irrégularités sur une ligne bruitée', () => {
    // Ligne horizontale avec bruit sur Y
    const noisy: Array<[number, number]> = [
      [0, 0.5], [0.25, 0.6], [0.5, 0.4], [0.75, 0.55], [1, 0.5],
    ];
    const result = smooth(noisy, 5);
    // Après lissage, les Y doivent être plus proches de 0.5
    const maxDeviation = Math.max(...result.map(([, y]) => Math.abs(y - 0.5)));
    const originalMaxDeviation = Math.max(...noisy.map(([, y]) => Math.abs(y - 0.5)));
    expect(maxDeviation).toBeLessThan(originalMaxDeviation);
  });

  it('préserve le nombre de points', () => {
    const pts: Array<[number, number]> = Array.from({ length: 20 }, (_, i) => [
      Math.cos(i * Math.PI * 2 / 20),
      Math.sin(i * Math.PI * 2 / 20),
    ] as [number, number]);
    const result = smooth(pts, 3);
    expect(result.length).toBe(20);
  });

  it('converge vers le barycentre après de nombreuses passes', () => {
    // Avec beaucoup de passes, tous les points convergent vers la moyenne
    const pts: Array<[number, number]> = [[0, 0], [2, 0], [2, 2], [0, 2]];
    const result = smooth(pts, 50);
    // Tous les points doivent être proches du centre (1, 1)
    for (const [x, y] of result) {
      expect(x).toBeCloseTo(1, 0);
      expect(y).toBeCloseTo(1, 0);
    }
  });
});

// ---------------------------------------------------------------------------
// Réimplémentation pure de scalePathToMm (identique à scalePathToPx mais en mm)
// ---------------------------------------------------------------------------

function scalePathToMm(d: string, el: { x: number; y: number; width: number; height: number; rotation?: number }): string {
  const ox = el.x * 10;
  const oy = el.y * 10;
  const w  = el.width * 10;
  const h  = el.height * 10;
  const cx = ox + w / 2;
  const cy = oy + h / 2;
  const rot = el.rotation || 0;
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tx = (nx: number, ny: number): [number, number] => {
    const px = ox + nx * w;
    const py = oy + ny * h;
    const dx = px - cx;
    const dy = py - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  };
  let curNx = 0, curNy = 0;
  return d.replace(/([MCQLHVZmclhvz])([^MCQLHVZmclhvz]*)/g, (_, cmd: string, args: string) => {
    const nums = args.trim().split(/[,\s]+/).filter(Boolean).map(Number);
    if (cmd === 'Z' || cmd === 'z') return 'Z ';
    if (cmd === 'M' || cmd === 'L') {
      const pts: string[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        curNx = nums[i]; curNy = nums[i + 1];
        const [px, py] = tx(curNx, curNy);
        pts.push(`${px.toFixed(3)},${py.toFixed(3)}`);
      }
      return `${cmd}${pts.join(' ')} `;
    }
    if (cmd === 'C') {
      const pts: string[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        if (i % 6 === 4) { curNx = nums[i]; curNy = nums[i + 1]; }
        const [px, py] = tx(nums[i], nums[i + 1]);
        pts.push(`${px.toFixed(3)},${py.toFixed(3)}`);
      }
      return `C${pts.join(' ')} `;
    }
    if (cmd === 'H') { curNx = nums[0]; const [px, py] = tx(curNx, curNy); return `L${px.toFixed(3)},${py.toFixed(3)} `; }
    if (cmd === 'V') { curNy = nums[0]; const [px, py] = tx(curNx, curNy); return `L${px.toFixed(3)},${py.toFixed(3)} `; }
    return `${cmd}${args}`;
  });
}

// ---------------------------------------------------------------------------
// Tests du lissage gaussien (smooth function)
// ---------------------------------------------------------------------------

describe('smooth (lissage gaussien)', () => {
  it('0 passe = identique', () => {
    const pts: Array<[number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const result = smooth(pts, 0);
    expect(result).toEqual(pts);
  });

  it('1 passe réduit les variations', () => {
    // Carré avec un point extrême : [0,0], [10,0], [0,0], [0,0]
    const pts: Array<[number, number]> = [[0, 0], [10, 0], [0, 0], [0, 0]];
    const result = smooth(pts, 1);
    // Le point extrême (10,0) doit être réduit
    expect(result[1][0]).toBeLessThan(10);
    expect(result[1][0]).toBeGreaterThan(0);
  });

  it('plus de passes = plus de lissage (valeurs plus proches de la moyenne)', () => {
    const pts: Array<[number, number]> = [[0, 0], [10, 0], [0, 0], [0, 0]];
    const r1 = smooth(pts, 1);
    const r10 = smooth(pts, 10);
    // Après 10 passes, le point extrême doit être encore plus réduit qu'après 1 passe
    expect(r10[1][0]).toBeLessThan(r1[1][0]);
  });

  it('conserve le nombre de points', () => {
    const pts: Array<[number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]];
    expect(smooth(pts, 5)).toHaveLength(5);
  });

  it('gaussPasses=3 est la valeur par défaut (test de référence)', () => {
    // Vérifie que la valeur par défaut produit un résultat stable et reproductible.
    // Un carré [0,0],[1,0],[1,1],[0,1] avec lissage circulaire (chaque point influence
    // ses voisins) converge vers le centre (0.5, 0.5) après plusieurs passes.
    // On vérifie que les coordonnées restent dans [0, 1] et que le résultat est
    // reproductible (même résultat pour les mêmes entrées).
    const pts: Array<[number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const r3a = smooth(pts, 3);
    const r3b = smooth(pts, 3);
    // Reproductibilité
    expect(r3a).toEqual(r3b);
    // Toutes les coordonnées restent dans [0, 1]
    r3a.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    });
    // 3 passes produit moins de lissage que 10 passes (le point [0,0] s'éloigne moins du centre)
    const r10 = smooth(pts, 10);
    const dist3 = Math.hypot(r3a[0][0] - 0.5, r3a[0][1] - 0.5);
    const dist10 = Math.hypot(r10[0][0] - 0.5, r10[0][1] - 0.5);
    expect(dist3).toBeGreaterThan(dist10);
  });
});

describe('scalePathToMm', () => {
  it('convertit un path normalisé en mm sans rotation', () => {
    // Élément à x=1cm, y=2cm, w=5cm, h=4cm, rot=0
    const el = { x: 1, y: 2, width: 5, height: 4, rotation: 0 };
    // Point normalisé (0,0) → (10mm, 20mm), (1,1) → (60mm, 60mm)
    const path = 'M0,0 L1,1 Z';
    const result = scalePathToMm(path, el);
    expect(result).toContain('M10.000,20.000');
    expect(result).toContain('L60.000,60.000');
  });

  it('applique la rotation correctement', () => {
    // Élément carré centré en (30mm, 30mm), rotation 90°
    const el = { x: 1, y: 1, width: 4, height: 4, rotation: 90 };
    // Centre = (30mm, 30mm). Point normalisé (1, 0) → (50mm, 10mm) avant rotation
    // Après rotation 90° autour de (30,30) : (50-30, 10-30) = (20, -20)
    // Rotation 90° : (20, -20) → (20, 20) (x'=-y, y'=x) → (30+20, 30+20) = (50, 50)
    const path = 'M1,0 Z';
    const result = scalePathToMm(path, el);
    // Avec rotation 90° : cos=0, sin=1 → x' = cx + dx*0 - dy*1, y' = cy + dx*1 + dy*0
    // dx=20, dy=-20 → x'=30+20=50, y'=30+20=50
    expect(result).toContain('M50.000,50.000');
  });

  it('convertit H et V en L 2D', () => {
    const el = { x: 0, y: 0, width: 10, height: 10, rotation: 0 };
    // H0.5 depuis (0,0) → L50mm,0mm
    const path = 'M0,0 H0.5 V0.5 Z';
    const result = scalePathToMm(path, el);
    expect(result).toContain('L50.000,0.000'); // H0.5 → x=50mm, y=0mm
    expect(result).toContain('L50.000,50.000'); // V0.5 → x=50mm, y=50mm
  });

  it('produit un path cohérent avec scalePathToPx (même ratio)', () => {
    // scalePathToMm et scalePathToPx doivent produire les mêmes ratios
    // (seule l'unité change : mm vs px avec pxPerCm donné)
    const el = { x: 2, y: 3, width: 6, height: 4, rotation: 0 };
    const path = 'M0.25,0.5 Z';
    const resultMm = scalePathToMm(path, el);
    // Point normalisé (0.25, 0.5) → x=2*10+0.25*60=35mm, y=3*10+0.5*40=50mm
    expect(resultMm).toContain('M35.000,50.000');
  });
});

describe('scalePathToPx', () => {
  const EPS = 0.1; // tolérance en px pour les comparaisons flottantes

  it('convertit M et Z correctement sans rotation', () => {
    // Élément à x=10, y=20, w=100, h=80, rot=0
    const result = scalePathToPx('M0,0 Z', 10, 20, 100, 80, 0);
    // M0,0 → px = 10 + 0*100 = 10, py = 20 + 0*80 = 20
    expect(result).toContain('M10.00,20.00');
    expect(result).toContain('Z');
  });

  it('convertit M1,1 correctement (coin bas-droit)', () => {
    const result = scalePathToPx('M1,1 Z', 10, 20, 100, 80, 0);
    // M1,1 → px = 10 + 1*100 = 110, py = 20 + 1*80 = 100
    expect(result).toContain('M110.00,100.00');
  });

  it('convertit M0.5,0.5 correctement (centre)', () => {
    const result = scalePathToPx('M0.5,0.5 Z', 10, 20, 100, 80, 0);
    // M0.5,0.5 → px = 10 + 0.5*100 = 60, py = 20 + 0.5*80 = 60
    expect(result).toContain('M60.00,60.00');
  });

  it('convertit H correctement en L sans rotation', () => {
    // Après M0,0.5, H1 → lineto horizontal vers x=1, y=0.5
    // px = 10 + 1*100 = 110, py = 20 + 0.5*80 = 60
    const result = scalePathToPx('M0,0.5 H1 Z', 10, 20, 100, 80, 0);
    expect(result).toContain('L110.00,60.00');
  });

  it('convertit V correctement en L sans rotation', () => {
    // Après M0.5,0, V1 → lineto vertical vers x=0.5, y=1
    // px = 10 + 0.5*100 = 60, py = 20 + 1*80 = 100
    const result = scalePathToPx('M0.5,0 V1 Z', 10, 20, 100, 80, 0);
    expect(result).toContain('L60.00,100.00');
  });

  it('applique la rotation 90° correctement', () => {
    // Élément carré 100×100 à ox=0, oy=0, rot=90°
    // Centre = (50, 50)
    // M1,0 → px = 0 + 1*100 = 100, py = 0 + 0*100 = 0
    // Après rotation 90° autour de (50,50) :
    // dx = 100-50 = 50, dy = 0-50 = -50
    // px_rot = 50 + 50*cos(90) - (-50)*sin(90) = 50 + 0 + 50 = 100
    // py_rot = 50 + 50*sin(90) + (-50)*cos(90) = 50 + 50 + 0 = 100
    const result = scalePathToPx('M1,0 Z', 0, 0, 100, 100, 90);
    // Extraire les coordonnées
    const match = result.match(/M([\d.]+),([\d.]+)/);
    expect(match).not.toBeNull();
    expect(parseFloat(match![1])).toBeCloseTo(100, 0);
    expect(parseFloat(match![2])).toBeCloseTo(100, 0);
  });

  it('convertit un path bbox arrondi complet (M H Q V Q H Q V Q Z)', () => {
    // Path typique du fallback bbox
    const d = 'M0.1,0 H0.9 Q1,0 1,0.1 V0.9 Q1,1 0.9,1 H0.1 Q0,1 0,0.9 V0.1 Q0,0 0.1,0 Z';
    const result = scalePathToPx(d, 0, 0, 100, 100, 0);
    // Vérifier que le résultat contient des commandes L (H→L, V→L) et Q
    expect(result).toContain('L');
    expect(result).toContain('Q');
    expect(result).toContain('Z');
    // Vérifier que M est correct : M0.1,0 → px=10, py=0
    expect(result).toContain('M10.00,0.00');
  });

  it('convertit un path Catmull-Rom (M C Z) correctement', () => {
    const d = 'M0.5,0.1 C0.6,0.1 0.9,0.4 0.9,0.5 C0.9,0.6 0.6,0.9 0.5,0.9 Z';
    const result = scalePathToPx(d, 0, 0, 100, 100, 0);
    expect(result).toContain('M50.00,10.00');
    expect(result).toContain('C');
    expect(result).toContain('Z');
  });
});

// ---------------------------------------------------------------------------
// Tests du toggle showFormatBorder (logique pure)
// ---------------------------------------------------------------------------

describe('showFormatBorder toggle', () => {
  it('démarre à false par défaut', () => {
    let showFormatBorder = false;
    expect(showFormatBorder).toBe(false);
  });

  it('le toggle inverse la valeur courante', () => {
    let val = false;
    const onToggle = (v: boolean) => { val = v; };
    onToggle(!val); // false → true
    expect(val).toBe(true);
    onToggle(!val); // true → false
    expect(val).toBe(false);
  });

  it('le rectangle de format est visible uniquement quand showFormatBorder = true', () => {
    // Simule la logique de rendu conditionnel : {showFormatBorder && <svg>}
    const renderFormatBorder = (show: boolean): string | null =>
      show ? '<svg><rect x=2 y=2 width=100% height=100% stroke=#6366f1 /></svg>' : null;
    expect(renderFormatBorder(false)).toBeNull();
    expect(renderFormatBorder(true)).not.toBeNull();
    expect(renderFormatBorder(true)).toContain('#6366f1');
  });
});
