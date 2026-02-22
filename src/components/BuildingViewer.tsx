"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface FloorData {
  label: string;
  gridW: number;
  gridH: number;
  grid: (string | null)[][];
}

export interface Config {
  voxelH: number;
  floorGap: number;
  roomTypes: Record<string, { name: string; color?: string }>;
}

interface Props {
  floors: FloorData[];
  config: Config;
  visibleFloors: boolean[];
}

// Room type codes that have colored tiles (not walls/outline)
const ROOM_CODES = ["A", "C", "R", "L", "O", "S", "G"];

export default function BuildingViewer({ floors, config, visibleFloors }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const meshGroupsRef = useRef<{ meshes: THREE.Object3D[] }[]>([]);

  // Toggle floor visibility
  useEffect(() => {
    const groups = meshGroupsRef.current;
    for (let i = 0; i < groups.length; i++) {
      const visible = visibleFloors[i] ?? true;
      for (const m of groups[i].meshes) {
        m.visible = visible;
      }
    }
  }, [visibleFloors]);

  // Build scene on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { voxelH, floorGap, roomTypes } = config;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 800, 2000);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(200, 400, 150);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb0c8ff, 0.4);
    fill.position.set(-200, 100, -150);
    scene.add(fill);
    const back = new THREE.DirectionalLight(0xffffff, 0.3);
    back.position.set(0, 200, -300);
    scene.add(back);

    // Max grid dimensions
    let maxGW = 0, maxGH = 0;
    for (const f of floors) {
      if (f.gridW > maxGW) maxGW = f.gridW;
      if (f.gridH > maxGH) maxGH = f.gridH;
    }

    // Geometries
    const wallGeo = new THREE.BoxGeometry(1, voxelH, 1);
    const outlineGeo = new THREE.BoxGeometry(1, voxelH, 1);
    const floorGeo = new THREE.BoxGeometry(1, 0.5, 1);
    const dummy = new THREE.Object3D();

    // Materials
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0xc0d0e0, transparent: true, opacity: 0.45,
      roughness: 0.6, metalness: 0.1,
    });
    const outlineMat = new THREE.MeshPhysicalMaterial({
      color: 0xd0d8e8, transparent: true, opacity: 0.55,
      roughness: 0.4, metalness: 0.15,
    });

    const roomMats: Record<string, THREE.MeshPhysicalMaterial> = {};
    for (const key of ROOM_CODES) {
      const rt = roomTypes[key];
      if (!rt?.color) continue;
      roomMats[key] = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(rt.color), transparent: true, opacity: 0.65,
        roughness: 0.5, metalness: 0.0,
      });
    }

    // Count instances per type per floor
    const ALL_TYPES = ["W", "B", ...ROOM_CODES];
    const counts: Record<string, number> = {};
    for (let fi = 0; fi < floors.length; fi++) {
      const { grid } = floors[fi];
      for (const t of ALL_TYPES) counts[`${t}_${fi}`] = 0;
      for (const row of grid) {
        for (const cell of row) {
          if (cell) counts[`${cell}_${fi}`] = (counts[`${cell}_${fi}`] || 0) + 1;
        }
      }
    }

    // Build instanced meshes
    const meshGroups: { meshes: THREE.Object3D[] }[] = [];

    for (let fi = 0; fi < floors.length; fi++) {
      const { grid, gridW, gridH } = floors[fi];
      const floorMeshes: { key: string; mesh: THREE.InstancedMesh; idx: number }[] = [];

      const wallCount = counts[`W_${fi}`] || 0;
      if (wallCount > 0) {
        const mesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
        scene.add(mesh);
        floorMeshes.push({ key: "W", mesh, idx: 0 });
      }

      const outlineCount = counts[`B_${fi}`] || 0;
      if (outlineCount > 0) {
        const mesh = new THREE.InstancedMesh(outlineGeo, outlineMat, outlineCount);
        scene.add(mesh);
        floorMeshes.push({ key: "B", mesh, idx: 0 });
      }

      for (const key of ROOM_CODES) {
        const cnt = counts[`${key}_${fi}`] || 0;
        if (cnt === 0 || !roomMats[key]) continue;
        const mesh = new THREE.InstancedMesh(floorGeo, roomMats[key], cnt);
        scene.add(mesh);
        floorMeshes.push({ key, mesh, idx: 0 });
      }

      const yBaseWall = fi * floorGap + voxelH / 2;
      const yBaseFloor = fi * floorGap + 0.2;
      const offsetX = (maxGW - gridW) / 2;
      const offsetZ = (maxGH - gridH) / 2;

      for (let gy = 0; gy < grid.length; gy++) {
        for (let gx = 0; gx < grid[gy].length; gx++) {
          const t = grid[gy][gx];
          if (!t) continue;
          const fm = floorMeshes.find((f) => f.key === t);
          if (!fm) continue;

          const posX = (gridW - gx - 1) + offsetX + 0.5;
          const posZ = maxGH - (gy + offsetZ) - 0.5;

          if (t === "W" || t === "B") {
            dummy.position.set(posX, yBaseWall, posZ);
          } else {
            dummy.position.set(posX, yBaseFloor, posZ);
          }
          dummy.updateMatrix();
          fm.mesh.setMatrixAt(fm.idx++, dummy.matrix);
        }
      }
      for (const fm of floorMeshes) fm.mesh.instanceMatrix.needsUpdate = true;

      // Floor slab
      const slabGeo = new THREE.BoxGeometry(gridW, 0.12, gridH);
      const slabMat = new THREE.MeshPhysicalMaterial({
        color: 0x8899aa, transparent: true, opacity: 0.12,
        roughness: 0.8, metalness: 0.0,
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(gridW / 2 + offsetX, fi * floorGap, gridH / 2 + offsetZ);
      scene.add(slab);

      meshGroups.push({
        meshes: [...floorMeshes.map((f) => f.mesh), slab],
      });
    }

    // Floor label sprites
    for (let fi = 0; fi < floors.length; fi++) {
      const sprite = makeTextSprite(floors[fi].label);
      sprite.position.set(-18, fi * floorGap + voxelH / 2, maxGH / 2);
      sprite.scale.set(30, 10, 1);
      scene.add(sprite);
      meshGroups[fi].meshes.push(sprite);
    }

    meshGroupsRef.current = meshGroups;

    // Camera
    const cx = maxGW / 2, cy = (floors.length - 1) * floorGap / 2, cz = maxGH / 2;
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.set(cx + 220, cy + 160, cz + 250);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx, cy, cz);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 30;
    controls.maxDistance = 1200;
    controls.update();

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors, config]);

  return <div id="canvas-container" ref={containerRef} />;
}

function makeTextSprite(text: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0008";
  ctx.beginPath();
  ctx.roundRect(0, 0, 256, 64, 10);
  ctx.fill();
  ctx.fillStyle = "#aaccff";
  ctx.font = "bold 28px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  return new THREE.Sprite(mat);
}
