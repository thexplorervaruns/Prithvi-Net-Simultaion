import * as THREE from 'three';

export interface ProceduralTextureSet {
  concreteMap: THREE.CanvasTexture;
  concreteRoughness: THREE.CanvasTexture;
  asphaltMap: THREE.CanvasTexture;
  terrainMap: THREE.CanvasTexture;
  terrainBump: THREE.CanvasTexture;
  windowFacadeMap: THREE.CanvasTexture;
  windowRoughnessMap: THREE.CanvasTexture;
  solarMap: THREE.CanvasTexture;
  plumeSprite: THREE.CanvasTexture;
  aoShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createProceduralTextures(): ProceduralTextureSet {
  // 1. Architectural Board-Formed Concrete (Albedo + Roughness)
  const [concCanvas, concCtx] = makeCanvas(512, 512);
  concCtx.fillStyle = '#d4d6d8';
  concCtx.fillRect(0, 0, 512, 512);

  // Subtle architectural formwork joints
  concCtx.strokeStyle = 'rgba(80, 86, 94, 0.22)';
  concCtx.lineWidth = 1.5;
  for (let y = 0; y < 512; y += 64) {
    concCtx.beginPath();
    concCtx.moveTo(0, y);
    concCtx.lineTo(512, y);
    concCtx.stroke();
  }
  for (let x = 0; x < 512; x += 128) {
    concCtx.beginPath();
    concCtx.moveTo(x, 0);
    concCtx.lineTo(x, 512);
    concCtx.stroke();
  }

  // Fine mineral grain & weathering
  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 175 + Math.floor(Math.random() * 55);
    concCtx.fillStyle = `rgba(${v},${v},${v + 2},0.16)`;
    concCtx.fillRect(x, y, 2, 2);
  }
  // Vertical rain-streak gradient near top
  const streakGrad = concCtx.createLinearGradient(0, 0, 0, 512);
  streakGrad.addColorStop(0, 'rgba(35, 40, 48, 0.14)');
  streakGrad.addColorStop(0.25, 'rgba(35, 40, 48, 0.02)');
  streakGrad.addColorStop(1, 'rgba(25, 30, 36, 0.12)');
  concCtx.fillStyle = streakGrad;
  concCtx.fillRect(0, 0, 512, 512);

  const concreteMap = new THREE.CanvasTexture(concCanvas);
  concreteMap.wrapS = THREE.RepeatWrapping;
  concreteMap.wrapT = THREE.RepeatWrapping;
  concreteMap.repeat.set(3, 3);
  concreteMap.colorSpace = THREE.SRGBColorSpace;

  const [roughCanvas, roughCtx] = makeCanvas(256, 256);
  roughCtx.fillStyle = '#b8b8b8';
  roughCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const v = 135 + Math.floor(Math.random() * 95);
    roughCtx.fillStyle = `rgb(${v},${v},${v})`;
    roughCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const concreteRoughness = new THREE.CanvasTexture(roughCanvas);
  concreteRoughness.wrapS = THREE.RepeatWrapping;
  concreteRoughness.wrapT = THREE.RepeatWrapping;
  concreteRoughness.repeat.set(3, 3);

  // 2. High-Resolution Asphalt Road with Lane Markings & Micro-Aggregate
  const [asphCanvas, asphCtx] = makeCanvas(512, 512);
  asphCtx.fillStyle = '#22262e';
  asphCtx.fillRect(0, 0, 512, 512);

  // Tire wear tracks (subtle lighter/smoother bands)
  asphCtx.fillStyle = 'rgba(48, 54, 64, 0.35)';
  asphCtx.fillRect(110, 0, 75, 512);
  asphCtx.fillRect(325, 0, 75, 512);

  for (let i = 0; i < 20000; i++) {
    const v = 26 + Math.floor(Math.random() * 44);
    asphCtx.fillStyle = `rgba(${v},${v + 2},${v + 5},0.35)`;
    asphCtx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  // Crisp reflective edge lines
  asphCtx.fillStyle = 'rgba(226, 232, 240, 0.65)';
  asphCtx.fillRect(18, 0, 6, 512);
  asphCtx.fillRect(488, 0, 6, 512);

  // Center dashed amber marking
  asphCtx.strokeStyle = 'rgba(245, 185, 66, 0.78)';
  asphCtx.lineWidth = 6;
  asphCtx.setLineDash([36, 28]);
  asphCtx.beginPath();
  asphCtx.moveTo(256, 0);
  asphCtx.lineTo(256, 512);
  asphCtx.stroke();

  const asphaltMap = new THREE.CanvasTexture(asphCanvas);
  asphaltMap.wrapS = THREE.RepeatWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(1, 14);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;

  // 3. Natural South Indian Terrain (Verdant Piedmont + Laterite Earth)
  const [terrCanvas, terrCtx] = makeCanvas(1024, 1024);
  const grad = terrCtx.createRadialGradient(512, 512, 60, 512, 512, 700);
  grad.addColorStop(0, '#44583c');
  grad.addColorStop(0.55, '#3b4e35');
  grad.addColorStop(1, '#2f3f2a');
  terrCtx.fillStyle = grad;
  terrCtx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 42000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const pick = Math.random();
    if (pick < 0.5) {
      terrCtx.fillStyle = 'rgba(74, 98, 58, 0.16)';
    } else if (pick < 0.82) {
      terrCtx.fillStyle = 'rgba(54, 72, 45, 0.18)';
    } else {
      terrCtx.fillStyle = 'rgba(116, 86, 58, 0.11)';
    }
    const s = 2 + Math.random() * 5;
    terrCtx.fillRect(x, y, s, s);
  }
  const terrainMap = new THREE.CanvasTexture(terrCanvas);
  terrainMap.wrapS = THREE.RepeatWrapping;
  terrainMap.wrapT = THREE.RepeatWrapping;
  terrainMap.repeat.set(8, 8);
  terrainMap.colorSpace = THREE.SRGBColorSpace;

  const [bumpCanvas, bumpCtx] = makeCanvas(512, 512);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18000; i++) {
    const v = 96 + Math.floor(Math.random() * 64);
    bumpCtx.fillStyle = `rgb(${v},${v},${v})`;
    bumpCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  const terrainBump = new THREE.CanvasTexture(bumpCanvas);
  terrainBump.wrapS = THREE.RepeatWrapping;
  terrainBump.wrapT = THREE.RepeatWrapping;
  terrainBump.repeat.set(12, 12);

  // 4. Modern Architectural Curtain-Wall Glass & Mullion Facade (Albedo + Roughness)
  const [winCanvas, winCtx] = makeCanvas(512, 512);
  const [winRoughCanvas, winRoughCtx] = makeCanvas(512, 512);

  // Base anodized dark aluminum frame
  winCtx.fillStyle = '#1e242d';
  winCtx.fillRect(0, 0, 512, 512);
  winRoughCtx.fillStyle = '#b0b0b0'; // Matte frame
  winRoughCtx.fillRect(0, 0, 512, 512);

  const cols = 4;
  const rows = 4;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    // Spandrel horizontal slab band between floors
    winCtx.fillStyle = '#2a313c';
    winCtx.fillRect(0, r * cellH, 512, 22);
    winCtx.fillStyle = '#475569';
    winCtx.fillRect(0, r * cellH + 20, 512, 2);

    for (let c = 0; c < cols; c++) {
      const wx = c * cellW + 10;
      const wy = r * cellH + 26;
      const ww = cellW - 20;
      const wh = cellH - 34;

      // Architectural low-E double-glazed glass pane with interior depth
      const paneGrad = winCtx.createLinearGradient(wx, wy, wx + ww, wy + wh);
      const interiorWarmth = ((r * 3 + c * 7) % 5) === 0;
      if (interiorWarmth) {
        paneGrad.addColorStop(0, '#2a4158');
        paneGrad.addColorStop(0.55, '#3b5974');
        paneGrad.addColorStop(1, '#586d78');
      } else {
        paneGrad.addColorStop(0, '#16283a');
        paneGrad.addColorStop(0.5, '#233f58');
        paneGrad.addColorStop(1, '#315472');
      }
      winCtx.fillStyle = paneGrad;
      winCtx.fillRect(wx, wy, ww, wh);

      // Subtle interior ceiling soffit line & vertical blind suggestion
      winCtx.fillStyle = interiorWarmth
        ? 'rgba(255, 228, 181, 0.22)'
        : 'rgba(186, 230, 253, 0.12)';
      winCtx.fillRect(wx + 4, wy + 4, ww - 8, 10);

      // Diagonal sky specular sheen
      winCtx.fillStyle = 'rgba(224, 242, 254, 0.11)';
      winCtx.beginPath();
      winCtx.moveTo(wx, wy);
      winCtx.lineTo(wx + ww * 0.55, wy);
      winCtx.lineTo(wx, wy + wh * 0.75);
      winCtx.closePath();
      winCtx.fill();

      // Anodized window mullion border
      winCtx.strokeStyle = '#64748b';
      winCtx.lineWidth = 2;
      winCtx.strokeRect(wx, wy, ww, wh);

      // Center vertical transom
      winCtx.fillStyle = '#1e242d';
      winCtx.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);

      // Glass roughness (very smooth/glossy = dark value on roughness map)
      winRoughCtx.fillStyle = '#1c1c1c';
      winRoughCtx.fillRect(wx, wy, ww, wh);
    }
  }

  const windowFacadeMap = new THREE.CanvasTexture(winCanvas);
  windowFacadeMap.wrapS = THREE.RepeatWrapping;
  windowFacadeMap.wrapT = THREE.RepeatWrapping;
  windowFacadeMap.colorSpace = THREE.SRGBColorSpace;

  const windowRoughnessMap = new THREE.CanvasTexture(winRoughCanvas);
  windowRoughnessMap.wrapS = THREE.RepeatWrapping;
  windowRoughnessMap.wrapT = THREE.RepeatWrapping;

  // 5. Monocrystalline Solar Panel Texture
  const [solCanvas, solCtx] = makeCanvas(256, 256);
  const solGrad = solCtx.createLinearGradient(0, 0, 256, 256);
  solGrad.addColorStop(0, '#0c1e3e');
  solGrad.addColorStop(0.5, '#132e5c');
  solGrad.addColorStop(1, '#091730');
  solCtx.fillStyle = solGrad;
  solCtx.fillRect(0, 0, 256, 256);

  solCtx.strokeStyle = 'rgba(148, 197, 255, 0.38)';
  solCtx.lineWidth = 1.5;
  for (let x = 0; x <= 256; x += 32) {
    solCtx.beginPath();
    solCtx.moveTo(x, 0);
    solCtx.lineTo(x, 256);
    solCtx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    solCtx.beginPath();
    solCtx.moveTo(0, y);
    solCtx.lineTo(256, y);
    solCtx.stroke();
  }
  // Silver perimeter frame
  solCtx.strokeStyle = '#cbd5e1';
  solCtx.lineWidth = 8;
  solCtx.strokeRect(0, 0, 256, 256);

  const solarMap = new THREE.CanvasTexture(solCanvas);
  solarMap.colorSpace = THREE.SRGBColorSpace;

  // 6. Soft Volumetric Smoke / Flame Puff Sprite
  const [plumeCanvas, plumeCtx] = makeCanvas(128, 128);
  const pGrad = plumeCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  pGrad.addColorStop(0.32, 'rgba(240, 244, 248, 0.58)');
  pGrad.addColorStop(0.68, 'rgba(205, 214, 224, 0.20)');
  pGrad.addColorStop(1, 'rgba(180, 190, 200, 0.0)');
  plumeCtx.fillStyle = pGrad;
  plumeCtx.fillRect(0, 0, 128, 128);
  const plumeSprite = new THREE.CanvasTexture(plumeCanvas);

  // 7. Soft Ambient-Occlusion Ground Contact Shadow Texture
  const [aoCanvas, aoCtx] = makeCanvas(128, 128);
  const aoGrad = aoCtx.createRadialGradient(64, 64, 14, 64, 64, 64);
  aoGrad.addColorStop(0, 'rgba(10, 14, 20, 0.58)');
  aoGrad.addColorStop(0.55, 'rgba(10, 14, 20, 0.28)');
  aoGrad.addColorStop(1, 'rgba(10, 14, 20, 0.0)');
  aoCtx.fillStyle = aoGrad;
  aoCtx.fillRect(0, 0, 128, 128);
  const aoShadowMap = new THREE.CanvasTexture(aoCanvas);

  return {
    concreteMap,
    concreteRoughness,
    asphaltMap,
    terrainMap,
    terrainBump,
    windowFacadeMap,
    windowRoughnessMap,
    solarMap,
    plumeSprite,
    aoShadowMap,
    dispose: () => {
      concreteMap.dispose();
      concreteRoughness.dispose();
      asphaltMap.dispose();
      terrainMap.dispose();
      terrainBump.dispose();
      windowFacadeMap.dispose();
      windowRoughnessMap.dispose();
      solarMap.dispose();
      plumeSprite.dispose();
      aoShadowMap.dispose();
    },
  };
}
