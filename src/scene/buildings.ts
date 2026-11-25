import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';
import { getTerrainHeight } from './terrain';
import { INSPECTABLE_BUILDINGS } from '../simulation/worldLayout';
import { InspectableBuilding } from '../simulation/types';

export interface BuildingsBuildResult {
  root: THREE.Group;
  buildingMeshes: Map<string, THREE.Object3D>;
}

function enableShadows(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (!child.userData.noShadow) {
        child.castShadow = true;
      }
      child.receiveShadow = true;
    }
  });
}

function addContactShadow(
  parent: THREE.Group,
  width: number,
  depth: number,
  aoShadowMap: THREE.Texture
) {
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.38, depth * 1.38),
    new THREE.MeshBasicMaterial({
      map: aoShadowMap,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.04;
  shadowPlane.userData.noShadow = true;
  parent.add(shadowPlane);
}

export function buildNeighborhoodArchitecture(
  textures: ProceduralTextureSet
): BuildingsBuildResult {
  const root = new THREE.Group();
  root.name = 'NeighborhoodArchitecture';
  const buildingMeshes = new Map<string, THREE.Object3D>();

  // Shared Photorealistic PBR Materials
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.28,
    metalness: 0.85,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.36,
    metalness: 0.78,
  });
  const brushedAluminumMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.24,
    metalness: 0.88,
  });
  const industrialCladdingMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    map: textures.concreteMap,
    roughness: 0.48,
    metalness: 0.35,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xd8dee6,
    map: textures.concreteMap,
    roughnessMap: textures.concreteRoughness,
    roughness: 0.82,
    metalness: 0.06,
  });
  const hazardOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.38,
    metalness: 0.32,
  });
  const architecturalGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e3a5f,
    roughness: 0.12,
    metalness: 0.15,
    reflectivity: 0.92,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0.88,
  });
  const solarPanelMat = new THREE.MeshPhysicalMaterial({
    map: textures.solarMap,
    roughness: 0.18,
    metalness: 0.25,
    clearcoat: 0.85,
  });

  // ============================================================================
  // 1. INDUSTRIAL ZONE: MODERN GAS-PROCESSING & THERMAL COMBUSTION COMPLEX
  // ============================================================================
  const industrialCompound = new THREE.Group();
  const indY = getTerrainHeight(-56, -42);
  industrialCompound.position.set(-56, indY, -42);

  // Heavy industrial concrete plinth & apron with curbing
  const padMesh = new THREE.Mesh(
    new THREE.BoxGeometry(82, 0.45, 70),
    concreteMat
  );
  padMesh.position.y = 0.22;
  industrialCompound.add(padMesh);

  // Perimeter security wall & steel columns
  const fenceWallMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.75,
  });
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(82, 2.2, 0.45), fenceWallMat);
  northWall.position.set(0, 1.1, -34.8);
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.2, 70), fenceWallMat);
  westWall.position.set(-40.8, 1.1, 0);
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(54, 2.2, 0.45), fenceWallMat);
  southWall.position.set(-14, 1.1, 34.8);
  industrialCompound.add(northWall, westWall, southWall);

  // Main Process Hall & Turbine Building (BLD-IND-01)
  const mainHallGroup = new THREE.Group();
  mainHallGroup.position.set(8, 0.45, 0);
  addContactShadow(mainHallGroup, 32, 24, textures.aoShadowMap);

  const hallCore = new THREE.Mesh(
    new THREE.BoxGeometry(30, 14.5, 22),
    industrialCladdingMat
  );
  hallCore.position.y = 7.25;
  mainHallGroup.add(hallCore);

  // Architectural curtain-wall control bay along East elevation
  const controlBay = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 11.5, 18),
    architecturalGlassMat
  );
  controlBay.position.set(14.2, 5.75, 0);
  mainHallGroup.add(controlBay);

  // Horizontal steel sun-shading louvers on control bay
  for (let ly = 2.5; ly <= 10.5; ly += 2.0) {
    const louver = new THREE.Mesh(
      new THREE.BoxGeometry(5.1, 0.22, 18.6),
      brushedAluminumMat
    );
    louver.position.set(14.2, ly, 0);
    mainHallGroup.add(louver);
  }

  // Structural steel portal frames along roof & facades
  for (let x = -12; x <= 12; x += 6) {
    const portalFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 15.2, 22.8),
      darkSteelMat
    );
    portalFrame.position.set(x, 7.6, 0);
    mainHallGroup.add(portalFrame);
  }

  // Rooftop Acoustic HVAC Penthouse & Solar Array
  const penthouse = new THREE.Mesh(
    new THREE.BoxGeometry(16, 2.8, 10),
    darkSteelMat
  );
  penthouse.position.set(-2, 15.9, 0);
  mainHallGroup.add(penthouse);

  // Twin Stack Flues on Main Hall
  for (let i = 0; i < 2; i++) {
    const stackGroup = new THREE.Group();
    stackGroup.position.set(8, 14.5, -5 + i * 10);

    const stackCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.5, 18, 24),
      steelMat
    );
    stackCyl.position.y = 9;

    const band1 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.22, 1.26, 2.0, 24),
      hazardOrangeMat
    );
    band1.position.y = 15.5;

    const band2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.35, 1.6, 24),
      hazardOrangeMat
    );
    band2.position.y = 11.5;

    // Maintenance service platform ring
    const catwalk = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.25, 24),
      darkSteelMat
    );
    catwalk.position.y = 13.5;

    stackGroup.add(stackCyl, band1, band2, catwalk);
    mainHallGroup.add(stackGroup);
  }

  // Primary Thermal Cracker & Flue Tower (Emission & Combustion Source)
  const mainChimneyGroup = new THREE.Group();
  mainChimneyGroup.position.set(0, 0, 0);

  // Combustion furnace base chamber
  const furnaceBase = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 9.5, 8.5),
    darkSteelMat
  );
  furnaceBase.position.y = 4.75;
  mainChimneyGroup.add(furnaceBase);

  const mainStack = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 2.2, 26, 32),
    concreteMat
  );
  mainStack.position.y = 13;

  const topCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 3.2, 32),
    hazardOrangeMat
  );
  topCrown.position.y = 24.4;

  const midRing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.8, 2.2, 32),
    hazardOrangeMat
  );
  midRing.position.y = 18.5;

  const upperCatwalk = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.3, 24),
    darkSteelMat
  );
  upperCatwalk.position.y = 21.5;

  mainChimneyGroup.add(mainStack, topCrown, midRing, upperCatwalk);
  mainHallGroup.add(mainChimneyGroup);

  industrialCompound.add(mainHallGroup);

  // Pressurized Spherical LNG / Cryogenic Storage Tanks (BLD-IND-02)
  const tankFarmGroup = new THREE.Group();
  tankFarmGroup.position.set(-20, 0.45, -6);
  addContactShadow(tankFarmGroup, 26, 36, textures.aoShadowMap);

  // Concrete containment bund wall around tank farm
  const bundMat = concreteMat;
  const bundN = new THREE.Mesh(new THREE.BoxGeometry(24, 1.6, 0.5), bundMat);
  bundN.position.set(-1, 0.8, -16);
  const bundS = new THREE.Mesh(new THREE.BoxGeometry(24, 1.6, 0.5), bundMat);
  bundS.position.set(-1, 0.8, 16);
  const bundW = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 32.5), bundMat);
  bundW.position.set(-13, 0.8, 0);
  tankFarmGroup.add(bundN, bundS, bundW);

  const sphereTankPositions: [number, number][] = [
    [-5, -8],
    [5, -8],
    [-5, 5],
    [5, 5],
  ];
  sphereTankPositions.forEach(([tx, tz]) => {
    const tankUnit = new THREE.Group();
    tankUnit.position.set(tx, 0, tz);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(4.4, 32, 24),
      steelMat
    );
    sphere.position.y = 5.6;
    tankUnit.add(sphere);

    // Equatorial structural ring & hazard stripe
    const eqRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.42, 0.16, 12, 36),
      hazardOrangeMat
    );
    eqRing.rotation.x = Math.PI / 2;
    eqRing.position.y = 5.6;
    tankUnit.add(eqRing);

    // 6 radial support legs
    for (let l = 0; l < 6; l++) {
      const angle = (l * Math.PI) / 3;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 5.4, 12),
        darkSteelMat
      );
      leg.position.set(Math.cos(angle) * 3.5, 2.7, Math.sin(angle) * 3.5);
      tankUnit.add(leg);
    }

    // Top pressure relief valve tower
    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 1.4, 12),
      hazardOrangeMat
    );
    valve.position.y = 10.2;
    tankUnit.add(valve);

    tankFarmGroup.add(tankUnit);
  });

  // Elevated structural pipe rack connecting Tank Farm to Main Process Hall
  const pipeRackGroup = new THREE.Group();
  for (let py = 4.8; py <= 6.4; py += 0.8) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 24, 16),
      py > 5.5 ? hazardOrangeMat : steelMat
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(8, py, 2);
    pipeRackGroup.add(pipe);
  }
  tankFarmGroup.add(pipeRackGroup);
  industrialCompound.add(tankFarmGroup);

  root.add(industrialCompound);

  // ============================================================================
  // 2. ARCHITECTURAL RESIDENTIAL & CIVIC BUILDINGS (WITH PBR GLASS & LOUVERS)
  // ============================================================================
  const inspectableMap = new Map<string, InspectableBuilding>();
  INSPECTABLE_BUILDINGS.forEach((b) => inspectableMap.set(b.id, b));

  buildingMeshes.set('BLD-IND-01', mainHallGroup);
  mainHallGroup.userData.inspectableBuilding = inspectableMap.get('BLD-IND-01');

  buildingMeshes.set('BLD-IND-02', tankFarmGroup);
  tankFarmGroup.userData.inspectableBuilding = inspectableMap.get('BLD-IND-02');

  interface BuildingSpec {
    id?: string;
    x: number;
    z: number;
    w: number;
    h: number;
    d: number;
    color: number;
    accentColor: number;
    style: 'apartment' | 'civic' | 'residence' | 'commercial';
    hasWaterTank?: boolean;
    hasSolarRoof?: boolean;
  }

  const buildingSpecs: BuildingSpec[] = [
    // East Residential & Civic Sector
    {
      id: 'BLD-RES-01',
      x: 42,
      z: -32,
      w: 18,
      h: 22,
      d: 14,
      color: 0xf1f5f9,
      accentColor: 0x334155,
      style: 'apartment',
      hasWaterTank: true,
      hasSolarRoof: true,
    },
    {
      id: 'BLD-RES-02',
      x: 68,
      z: -28,
      w: 16,
      h: 19,
      d: 14,
      color: 0xe2e8f0,
      accentColor: 0x0f766e,
      style: 'apartment',
      hasWaterTank: true,
      hasSolarRoof: true,
    },
    {
      id: 'BLD-PUB-01',
      x: 24,
      z: 36,
      w: 26,
      h: 12,
      d: 16,
      color: 0xf8fafc,
      accentColor: 0xb45309,
      style: 'civic',
      hasWaterTank: true,
      hasSolarRoof: true,
    },
    {
      id: 'BLD-PUB-02',
      x: 64,
      z: 34,
      w: 22,
      h: 15,
      d: 16,
      color: 0xffffff,
      accentColor: 0x0284c7,
      style: 'civic',
      hasWaterTank: true,
      hasSolarRoof: true,
    },
    // Surrounding Modern Villas & Mixed-Use Residences
    { x: 24, z: -48, w: 10, h: 8.5, d: 9, color: 0xf1f5f9, accentColor: 0x475569, style: 'residence', hasWaterTank: true },
    { x: 40, z: -54, w: 11, h: 9.5, d: 10, color: 0xe2e8f0, accentColor: 0x334155, style: 'residence', hasWaterTank: true },
    { x: 60, z: -52, w: 12, h: 11, d: 10, color: 0xf8fafc, accentColor: 0x1e293b, style: 'residence', hasSolarRoof: true },
    { x: 84, z: -44, w: 11, h: 8.5, d: 9, color: 0xf1f5f9, accentColor: 0x475569, style: 'residence', hasWaterTank: true },
    { x: 26, z: -8, w: 11, h: 9.5, d: 11, color: 0xf8fafc, accentColor: 0x0369a1, style: 'commercial', hasSolarRoof: true },
    { x: 48, z: -6, w: 13, h: 12.5, d: 11, color: 0xf1f5f9, accentColor: 0x334155, style: 'apartment', hasWaterTank: true },
    { x: 72, z: -4, w: 12, h: 10, d: 10, color: 0xe2e8f0, accentColor: 0x475569, style: 'residence', hasWaterTank: true },
    { x: 88, z: -12, w: 10, h: 8.5, d: 9, color: 0xf8fafc, accentColor: 0x334155, style: 'residence' },
    { x: 22, z: 16, w: 11, h: 8.5, d: 9, color: 0xf1f5f9, accentColor: 0x0f766e, style: 'commercial' },
    { x: 44, z: 16, w: 14, h: 14, d: 12, color: 0xf8fafc, accentColor: 0x1e293b, style: 'apartment', hasWaterTank: true, hasSolarRoof: true },
    { x: 68, z: 14, w: 11, h: 9.5, d: 10, color: 0xe2e8f0, accentColor: 0x334155, style: 'residence', hasWaterTank: true },
    { x: 88, z: 18, w: 11, h: 10.5, d: 10, color: 0xf1f5f9, accentColor: 0x475569, style: 'residence' },
    { x: 44, z: 58, w: 13, h: 11, d: 11, color: 0xf8fafc, accentColor: 0x334155, style: 'residence', hasWaterTank: true },
    { x: 68, z: 58, w: 14, h: 13, d: 11, color: 0xe2e8f0, accentColor: 0x1e293b, style: 'apartment', hasWaterTank: true, hasSolarRoof: true },
    { x: 18, z: 60, w: 11, h: 8.5, d: 10, color: 0xf1f5f9, accentColor: 0x475569, style: 'residence' },
    // South-West Buffer Commercial & Logistics Units
    { x: -34, z: 36, w: 16, h: 10.5, d: 14, color: 0xe2e8f0, accentColor: 0x334155, style: 'commercial', hasSolarRoof: true },
    { x: -62, z: 38, w: 18, h: 11, d: 14, color: 0xcbd5e1, accentColor: 0x1e293b, style: 'commercial', hasSolarRoof: true },
    { x: -48, z: 60, w: 15, h: 9.5, d: 12, color: 0xf1f5f9, accentColor: 0x475569, style: 'residence', hasWaterTank: true },
  ];

  buildingSpecs.forEach((spec) => {
    const bGroup = new THREE.Group();
    const by = getTerrainHeight(spec.x, spec.z);
    bGroup.position.set(spec.x, by, spec.z);

    // Soft ground contact shadow plane
    addContactShadow(bGroup, spec.w, spec.d, textures.aoShadowMap);

    // Elevated architectural podium base
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      map: textures.concreteMap,
      roughness: 0.78,
    });
    const podium = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 1.2, 0.85, spec.d + 1.2),
      podiumMat
    );
    podium.position.y = 0.425;
    bGroup.add(podium);

    // Clone window texture per building size so proportions remain architectural
    const facadeTex = textures.windowFacadeMap.clone();
    facadeTex.needsUpdate = true;
    facadeTex.repeat.set(
      Math.max(1, Math.round(spec.w / 7)),
      Math.max(1, Math.round(spec.h / 6.5))
    );

    const roughTex = textures.windowRoughnessMap.clone();
    roughTex.needsUpdate = true;
    roughTex.repeat.copy(facadeTex.repeat);

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: spec.color,
      map: facadeTex,
      roughnessMap: roughTex,
      roughness: 0.35,
      metalness: 0.18,
      clearcoat: 0.45,
      clearcoatRoughness: 0.15,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: spec.accentColor,
      roughness: 0.42,
      metalness: 0.38,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w, spec.h, spec.d),
      bodyMat
    );
    body.position.y = 0.85 + spec.h / 2;
    bGroup.add(body);

    // Architectural vertical fin mullions on corners
    const cornerOffsets: [number, number][] = [
      [-spec.w / 2, -spec.d / 2],
      [spec.w / 2, -spec.d / 2],
      [-spec.w / 2, spec.d / 2],
      [spec.w / 2, spec.d / 2],
    ];
    cornerOffsets.forEach(([cx, cz]) => {
      const pilaster = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, spec.h + 0.5, 0.65),
        accentMat
      );
      pilaster.position.set(cx, 0.85 + spec.h / 2, cz);
      bGroup.add(pilaster);
    });

    // Horizontal floor slab bands & glass balcony balustrades
    const numFloors = Math.max(2, Math.floor(spec.h / 3.4));
    for (let f = 1; f < numFloors; f++) {
      const fy = 0.85 + f * 3.4;
      const slabBand = new THREE.Mesh(
        new THREE.BoxGeometry(spec.w + 0.55, 0.28, spec.d + 0.55),
        concreteMat
      );
      slabBand.position.y = fy;
      bGroup.add(slabBand);

      // Cantilevered glass balconies on apartments
      if (spec.style === 'apartment' && f % 2 === 1) {
        const balcSlab = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w * 0.65, 0.24, 1.4),
          concreteMat
        );
        balcSlab.position.set(0, fy, spec.d / 2 + 0.65);

        const glassRail = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w * 0.65, 1.05, 0.12),
          architecturalGlassMat
        );
        glassRail.position.set(0, fy + 0.6, spec.d / 2 + 1.28);

        bGroup.add(balcSlab, glassRail);
      }
    }

    // Civic Entrance Canopy & Glazed Atrium for School / Hospital
    if (spec.style === 'civic') {
      const atrium = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, spec.h * 0.82, 2.4),
        architecturalGlassMat
      );
      atrium.position.set(0, 0.85 + (spec.h * 0.82) / 2, spec.d / 2 + 0.9);
      bGroup.add(atrium);

      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(8.5, 0.35, 3.6),
        accentMat
      );
      canopy.position.set(0, 4.2, spec.d / 2 + 1.5);
      bGroup.add(canopy);
    }

    // Rooftop Parapet Wall & Overhang Crown
    const roofY = 0.85 + spec.h;
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.9, 0.65, spec.d + 0.9),
      accentMat
    );
    crown.position.y = roofY + 0.32;
    bGroup.add(crown);

    // Rooftop Elevator Overrun Core & Water Tank
    if (spec.hasWaterTank) {
      const coreRoom = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 2.6, 3.8),
        concreteMat
      );
      coreRoom.position.set(-spec.w * 0.24, roofY + 1.3, -spec.d * 0.2);
      bGroup.add(coreRoom);

      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 2.1, 20),
        new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          roughness: 0.35,
          metalness: 0.15,
        })
      );
      tank.position.set(-spec.w * 0.24, roofY + 3.55, -spec.d * 0.2);
      bGroup.add(tank);
    }

    // Rooftop Tilted Solar PV Array
    if (spec.hasSolarRoof) {
      const panelW = Math.min(spec.w * 0.52, 8.5);
      const panelD = Math.min(spec.d * 0.45, 5.5);
      const solarArray = new THREE.Mesh(
        new THREE.BoxGeometry(panelW, 0.14, panelD),
        solarPanelMat
      );
      solarArray.position.set(spec.w * 0.16, roofY + 1.05, spec.d * 0.12);
      solarArray.rotation.x = 0.22;
      bGroup.add(solarArray);
    }

    if (spec.id && inspectableMap.has(spec.id)) {
      bGroup.userData.inspectableBuilding = inspectableMap.get(spec.id);
      buildingMeshes.set(spec.id, bGroup);
    }

    root.add(bGroup);
  });

  // ============================================================================
  // 3. REALISTIC TROPICAL FOLIAGE & STREET INFRASTRUCTURE
  // ============================================================================
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3525,
    roughness: 0.92,
  });
  const canopyDarkMat = new THREE.MeshStandardMaterial({
    color: 0x264e2c,
    roughness: 0.82,
  });
  const canopyLightMat = new THREE.MeshStandardMaterial({
    color: 0x366938,
    roughness: 0.78,
  });

  const treeCoords: [number, number, number][] = [
    [-20, -68, 1.15], [10, -66, 0.95], [32, -66, 1.2], [58, -68, 1.0], [82, -62, 1.1],
    [-85, 8, 1.25], [-76, 26, 0.95], [-20, 48, 1.1], [-12, 70, 1.25], [14, 76, 1.0],
    [36, 78, 1.15], [62, 76, 0.95], [88, 68, 1.1], [96, 26, 1.2], [96, -24, 1.0],
    [16, -24, 0.92], [16, 6, 0.95], [34, 2, 1.05], [56, 2, 0.92], [56, 26, 1.1],
    [-16, -22, 0.95], [-16, 14, 1.0], [10, 46, 0.95], [48, -22, 1.0],
  ];

  treeCoords.forEach(([tx, tz, scale], idx) => {
    const tGroup = new THREE.Group();
    const ty = getTerrainHeight(tx, tz);
    tGroup.position.set(tx, ty, tz);

    addContactShadow(tGroup, 3.6 * scale, 3.6 * scale, textures.aoShadowMap);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24 * scale, 0.42 * scale, 3.0 * scale, 10),
      trunkMat
    );
    trunk.position.y = 1.5 * scale;
    tGroup.add(trunk);

    // Multi-cluster organic tropical canopy (Banyan / Neem silhouette)
    const mainCanopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.3 * scale, 2),
      idx % 2 === 0 ? canopyDarkMat : canopyLightMat
    );
    mainCanopy.position.y = 3.9 * scale;
    mainCanopy.scale.set(1.15, 0.85, 1.12);
    tGroup.add(mainCanopy);

    const subCanopy1 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.65 * scale, 2),
      canopyLightMat
    );
    subCanopy1.position.set(1.1 * scale, 3.5 * scale, 0.6 * scale);
    tGroup.add(subCanopy1);

    const subCanopy2 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5 * scale, 2),
      canopyDarkMat
    );
    subCanopy2.position.set(-1.0 * scale, 3.6 * scale, -0.7 * scale);
    tGroup.add(subCanopy2);

    root.add(tGroup);
  });

  // Architectural LED Streetlights along Main Arterial & Avenue
  const poleMat = brushedAluminumMat;
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  for (let z = -75; z <= 75; z += 30) {
    const slGroup = new THREE.Group();
    const sy = getTerrainHeight(9.8, z);
    slGroup.position.set(9.8, sy, z);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.15, 6.8, 10),
      poleMat
    );
    pole.position.y = 3.4;

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.14), poleMat);
    arm.position.set(-0.85, 6.75, 0);

    const luminaire = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.12, 0.32),
      lampGlowMat
    );
    luminaire.position.set(-1.6, 6.68, 0);

    slGroup.add(pole, arm, luminaire);
    root.add(slGroup);
  }

  enableShadows(root);
  return { root, buildingMeshes };
}
