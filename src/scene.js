import * as THREE from 'three';
import { WEEKS, DAYS_PER_WEEK, CELL_SIZE, CELL_GAP, X_OFFSET, Z_OFFSET } from './data.js';

// GitHub-like dark mode green palette
const COLORS = [
  new THREE.Color('#161b22'), // no contributions
  new THREE.Color('#0e4429'), // low
  new THREE.Color('#006d32'), // medium
  new THREE.Color('#26a641'), // high
  new THREE.Color('#39d353')  // max
];

function createTextLabel(text, x, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8b949e';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(4, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.05, z);
  return mesh;
}

export function createScene(dataObj) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1117');
  scene.fog = new THREE.FogExp2('#0d1117', 0.02);

  const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight('#ffffff', 1.5);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.left = -30;
  dirLight.shadow.camera.right = 30;
  dirLight.shadow.camera.top = 30;
  dirLight.shadow.camera.bottom = -30;
  scene.add(dirLight);

  const geometry = new THREE.BoxGeometry(CELL_SIZE, 1, CELL_SIZE);
  geometry.translate(0, 0.5, 0);

  const maxH = 6;
  const blocks = [];

  for (const item of dataObj.data) {
    let colorIdx = 0;
    if (item.count > 0) {
      const ratio = item.count / dataObj.maxCount;
      colorIdx = Math.ceil(ratio * 4);
    }
    const color = COLORS[colorIdx];

    const material = new THREE.MeshStandardMaterial({ 
      color: color,
      roughness: 0.3,
      metalness: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const x = X_OFFSET + item.w * (CELL_SIZE + CELL_GAP);
    const z = Z_OFFSET + item.d * (CELL_SIZE + CELL_GAP);
    const h = item.count === 0 ? 0.1 : (item.count / dataObj.maxCount) * maxH;

    mesh.position.set(x, 0, z);
    mesh.scale.y = h;
    
    mesh.userData = { ...item, height: h, baseColor: color.clone() };

    blocks.push(mesh);
    scene.add(mesh);
  }

  // Draw Flat Labels
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Find the first week index for each calendar month from actual data dates
  const monthStartWeeks = new Map(); // "YYYY-M" -> { w, monthIdx }
  for (const item of dataObj.data) {
    const parsed = new Date(item.date);
    if (isNaN(parsed)) continue;
    const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
    const existing = monthStartWeeks.get(key);
    if (existing === undefined || item.w < existing.w) {
      monthStartWeeks.set(key, { w: item.w, monthIdx: parsed.getMonth() });
    }
  }

  if (monthStartWeeks.size > 0) {
    for (const { w, monthIdx } of monthStartWeeks.values()) {
      const x = X_OFFSET + w * (CELL_SIZE + CELL_GAP);
      const z = Z_OFFSET - 1.5;
      scene.add(createTextLabel(MONTH_NAMES[monthIdx], x, z));
    }
  } else {
    // Fallback for dummy data: evenly space Jan-Dec
    for (let m = 0; m < 12; m++) {
      const w = (m / 12) * WEEKS + (WEEKS / 24);
      const x = X_OFFSET + w * (CELL_SIZE + CELL_GAP);
      const z = Z_OFFSET - 1.5;
      scene.add(createTextLabel(MONTH_NAMES[m], x, z));
    }
  }

  const days = ['Mon', 'Wed', 'Fri'];
  const dayIndices = [1, 3, 5]; // 0 is Sun
  for (let i = 0; i < 3; i++) {
    const x = X_OFFSET - 2.5;
    const z = Z_OFFSET + dayIndices[i] * (CELL_SIZE + CELL_GAP);
    scene.add(createTextLabel(days[i], x, z));
  }

  return { scene, blocks };
}
