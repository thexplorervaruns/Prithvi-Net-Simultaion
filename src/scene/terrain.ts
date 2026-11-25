import * as THREE from 'three';
import { getCanalCenterZ, groundHeightAt } from '../simulation/worldLayout';
import type { ProceduralTextureSet } from './textures';

export interface TerrainAndInfraHandle {
  group: THREE.Group;
  roadMaterials: THREE.MeshPhysicalMaterial[];
  culvertBlockageMarker: THREE.Group;
  dispose: () => void;
}

export function buildTerrainAndInfrastructure(
  textures: ProceduralTextureSet
): TerrainAndInfraHandle {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // 1. Continuous South Indian Terrain (420m x 420m so horizon blends smoothly into fog & foothills)
  const terrainGeo = trackGeo(new THREE.PlaneGeometry(420, 420, 140, 140));
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = groundHeightAt(x, z);
    posAttr.setY(i, y);

    // Vertex color modulation: greener hills on Western Ghats ridge, concrete gray in canal bed, red laterite in flatlands
    const canalDist = Math.abs(z - getCanalCenterZ(x));
    if (x >= -94 && x <= 145 && canalDist < 5.0) {
      c.set('#64686d'); // concrete canal bed
    } else if (y > 3.2) {
      c.set('#4c6438'); // forested foothill slope
    } else if (x >= -102 && x <= -20 && z >= -92 && z <= -14) {
      c.set('#74777b'); // compacted industrial gravel/concrete yard
    } else {
      const patch = Math.sin(x * 0.08) * Math.cos(z * 0.08);
      c.set(patch > 0.15 ? '#757d47' : '#8d5b42');
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.terrainMap,
      bumpMap: textures.terrainBump,
      bumpScale: 0.18,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 2. Concrete Stormwater Canal Retaining Walls (left & right embankments)
  const canalWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.concreteMap,
      color: '#9aa0a6',
      roughness: 0.88,
      metalness: 0.05,
    })
  );

  const wallSegments = 28;
  for (let i = 0; i < wallSegments; i++) {
    const x0 = -90 + (i / wallSegments) * 228;
    const x1 = -90 + ((i + 1) / wallSegments) * 228;
    const xm = (x0 + x1) * 0.5;
    // Skip wall inside retention basin open pool (x: 62..90)
    if (xm > 62 && xm < 90) continue;

    const z0 = getCanalCenterZ(x0);
    const z1 = getCanalCenterZ(x1);
    const zm = (z0 + z1) * 0.5;
    const len = Math.hypot(x1 - x0, z1 - z0) + 0.4;
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const baseH = groundHeightAt(xm, zm + 4.8);

    const wallGeo = trackGeo(new THREE.BoxGeometry(len, 1.9, 0.55));
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(wallGeo, canalWallMat);
      wall.position.set(xm - Math.sin(ang) * side * 3.7, baseH - 0.82, zm + Math.cos(ang) * side * 3.7);
      wall.rotation.y = -ang;
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
  }

  // 3. Road Network with Physical Wetness Support
  const roadMaterials: THREE.MeshPhysicalMaterial[] = [];
  const createRoadMat = (repeatY: number) => {
    const mapClone = textures.asphaltMap.clone();
    mapClone.repeat.set(1, repeatY);
    mapClone.needsUpdate = true;
    const mat = trackMat(
      new THREE.MeshPhysicalMaterial({
        map: mapClone,
        color: '#8c929a',
        roughness: 0.84,
        metalness: 0.04,
        clearcoat: 0.0,
        clearcoatRoughness: 0.12,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    roadMaterials.push(mat);
    return mat;
  };

  // Helper to lay segmented terrain-hugging road strips
  const addRoadStrip = (
    xStart: number,
    zStart: number,
    xEnd: number,
    zEnd: number,
    width: number,
    segments: number
  ) => {
    const totalLen = Math.hypot(xEnd - xStart, zEnd - zStart);
    const roadMat = createRoadMat(Math.max(1, Math.round(totalLen / 18)));
    const sidewalkMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.concreteMap,
        color: '#a3a7ac',
        roughness: 0.9,
      })
    );

    const ang = Math.atan2(xEnd - xStart, zEnd - zStart);
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const cx = xStart + (xEnd - xStart) * ((t0 + t1) * 0.5);
      const cz = zStart + (zEnd - zStart) * ((t0 + t1) * 0.5);
      const segLen = totalLen / segments + 0.15;
      const y = groundHeightAt(cx, cz);

      // Raise slightly if crossing canal to form culvert deck
      const canalDist = Math.abs(cz - getCanalCenterZ(cx));
      const deckY = canalDist < 5.5 && cx > -90 && cx < 135 ? Math.max(y, 0.55) : y + 0.08;

      const roadGeo = trackGeo(new THREE.BoxGeometry(width, 0.12, segLen));
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.position.set(cx, deckY, cz);
      roadMesh.rotation.y = ang;
      roadMesh.receiveShadow = true;
      group.add(roadMesh);

      // Raised concrete curbs / sidewalks on main roads
      if (width >= 8.5) {
        const curbGeo = trackGeo(new THREE.BoxGeometry(0.95, 0.22, segLen));
        for (const side of [-1, 1]) {
          const curb = new THREE.Mesh(curbGeo, sidewalkMat);
          curb.position.set(
            cx + Math.cos(ang) * side * (width * 0.5 + 0.45),
            deckY + 0.05,
            cz - Math.sin(ang) * side * (width * 0.5 + 0.45)
          );
          curb.rotation.y = ang;
          curb.receiveShadow = true;
          curb.castShadow = true;
          group.add(curb);
        }
      }
    }
  };

  // Main Ettimadai Arterial Road (East-West at z=0)
  addRoadStrip(-135, 0, 135, 0, 11.5, 22);
  // Industrial Link Avenue (North-South at x=-12)
  addRoadStrip(-12, -110, -12, 112, 9.5, 22);
  // Civic & Culvert C2 Avenue (North-South at x=48)
  addRoadStrip(48, -96, 48, 108, 8.8, 22);
  // South Canal Parallel Residential Lane (z=54)
  addRoadStrip(-86, 54, 52, 54, 6.2, 14);
  // North Residential Loop Lane (z=-54)
  addRoadStrip(6, -54, 104, -54, 5.8, 10);
  // Residential Cross Lane (x=22, z=-92 to -4)
  addRoadStrip(22, -92, 22, -4, 5.2, 10);
  // Industrial Internal Service Loop
  addRoadStrip(-82, -26, -15, -26, 6.4, 8);
  addRoadStrip(-82, -76, -82, -24, 6.0, 6);

  // 4. Culvert Bridges (C1 at x=-12, C2 at x=48) with Concrete Parapets & Grates
  const addCulvertBridge = (bx: number, bz: number) => {
    const bridgeGroup = new THREE.Group();
    const deckGeo = trackGeo(new THREE.BoxGeometry(11.6, 0.55, 10.2));
    const deck = new THREE.Mesh(deckGeo, canalWallMat);
    deck.position.set(bx, 0.42, bz);
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // Bridge safety railings
    const railGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.85, 10.2));
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, canalWallMat);
      rail.position.set(bx + side * 5.4, 1.05, bz);
      rail.castShadow = true;
      bridgeGroup.add(rail);
    }

    // Steel stormwater trash-rack bars under bridge
    const barMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.75, roughness: 0.38 })
    );
    const barGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 6));
    for (let zOff = -2.8; zOff <= 2.8; zOff += 0.7) {
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(bx - 5.2, -0.5, bz + zOff);
      bridgeGroup.add(bar);
    }

    group.add(bridgeGroup);
  };

  addCulvertBridge(-12, getCanalCenterZ(-12));
  addCulvertBridge(48, getCanalCenterZ(48));

  // 5. Dynamic Silt / Debris Blockage Visual at Culvert C2 (scales with blockageSeverity)
  const culvertBlockageMarker = new THREE.Group();
  culvertBlockageMarker.position.set(42.5, -0.55, getCanalCenterZ(48));
  const debrisMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#5c4028',
      roughness: 0.95,
      metalness: 0.05,
    })
  );
  const warningMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#991b1b',
      emissiveIntensity: 0.7,
      roughness: 0.4,
    })
  );
  for (let i = 0; i < 6; i++) {
    const moundGeo = trackGeo(new THREE.DodecahedronGeometry(0.75 + (i % 3) * 0.25, 1));
    const mound = new THREE.Mesh(moundGeo, debrisMat);
    mound.position.set((i % 2) * 0.6 - 0.3, 0.25 + (i % 2) * 0.15, (i - 2.5) * 0.95);
    mound.scale.set(1.2, 0.75, 1.1);
    culvertBlockageMarker.add(mound);
  }
  const warnBeacon = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 2.2, 12)), warningMat);
  warnBeacon.position.set(0, 1.4, 0);
  culvertBlockageMarker.add(warnBeacon);
  culvertBlockageMarker.visible = false;
  group.add(culvertBlockageMarker);

  return {
    group,
    roadMaterials,
    culvertBlockageMarker,
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}

export function getTerrainHeight(x: number, z: number): number {
  return groundHeightAt(x, z);
}

export function buildNeighborhoodTerrain(
  textures: ProceduralTextureSet
): THREE.Group {
  return buildTerrainAndInfrastructure(textures).group;
}

