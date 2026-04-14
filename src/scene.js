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

  // Instead of many individual BoxGeometries which can be slow,
  // we will use individual meshes for simplicity or InstancedMesh for performance.
  // Given only 365 blocks, individual meshes are totally fine and easier to handle.

  const geometry = new THREE.BoxGeometry(CELL_SIZE, 1, CELL_SIZE);
  // translate geometry so bottom is at y=0 instead of y=-0.5
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
    
    // Store item data in userData for UI mapping
    mesh.userData = { ...item, height: h };

    blocks.push(mesh);
    scene.add(mesh);
  }

  // Base plane
  const planeGeo = new THREE.PlaneGeometry(80, 40);
  const planeMat = new THREE.MeshStandardMaterial({ color: '#0d1117', roughness: 0.8 });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  return { scene, blocks };
}
