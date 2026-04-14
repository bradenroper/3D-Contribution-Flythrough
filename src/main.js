import * as THREE from 'three';
import { generateData } from './data.js';
import { createScene } from './scene.js';
import { setupCameraAndPath } from './camera.js';
import { setupUI } from './ui.js';
import './style.css';

const canvas = document.querySelector('#preview');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const dataObj = generateData();
const { scene, blocks } = createScene(dataObj);
const { camera, curve, hoverPoints } = setupCameraAndPath(dataObj, blocks);
const ui = setupUI();

let progress = 0; // 0 to 1 along the curve
// We'll define a timeline
// Fly -> Stop at HP1 -> Fly -> Stop at HP2 -> Fly -> Stop at HP3 -> Fly home
const timeline = [];
let tCursor = 0;
for (let i = 0; i < hoverPoints.length; i++) {
  const hp = hoverPoints[i];
  const deltaT = hp.t - tCursor;
  if (deltaT > 0) {
    timeline.push({ type: 'fly', start: tCursor, end: hp.t, duration: deltaT * 10 }); 
  }
  timeline.push({ type: 'hover', hpIndex: i, duration: 2.0 }); // hover for 2 seconds
  tCursor = hp.t;
}
if (tCursor < 1) {
  timeline.push({ type: 'fly', start: tCursor, end: 1, duration: (1 - tCursor) * 10 });
}

let totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0);

// For resizing
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

let currentTime = 0;

function renderFrame(dt) {
  currentTime += dt;
  if (currentTime > totalDuration) {
      currentTime = currentTime % totalDuration; // Loop
  }

  // Find current timeline item
  let tSum = 0;
  let currentItem = null;
  let localTime = 0;
  for (const item of timeline) {
    if (currentTime >= tSum && currentTime <= tSum + item.duration) {
      currentItem = item;
      localTime = currentTime - tSum;
      break;
    }
    tSum += item.duration;
  }
  // fallback for float inaccuracies
  if (!currentItem) {
    currentItem = timeline[timeline.length - 1]; 
    localTime = currentItem.duration;
  }

  let activeHover = -1;
  let lookAtTarget = new THREE.Vector3(0, 0, 0); // Center of grid is 0,0,0

  if (currentItem.type === 'fly') {
    const ratio = localTime / currentItem.duration;
    const t = currentItem.start + (currentItem.end - currentItem.start) * ratio;
    const pos = curve.getPointAt(t);
    camera.position.lerp(pos, 0.1); // Smooth following
  } else {
    // Hovering
    activeHover = currentItem.hpIndex;
    const hp = hoverPoints[activeHover];
    const pos = curve.getPointAt(hp.t);
    camera.position.lerp(pos, 0.1);
    lookAtTarget.copy(hp.worldPos);
  }

  // Look away from origin towards hover slightly
  const currentLookAt = new THREE.Vector3(0,0,0);
  if (activeHover !== -1) {
    currentLookAt.lerp(lookAtTarget, 0.1); // Look at the block
  }
  
  // Actually, Catmull curve defines position. We want the camera to look at the center, or look forward along curve.
  // For simplicity, look at center unless hovering
  const origin = new THREE.Vector3(0, 0, 0);
  camera.lookAt(activeHover === -1 ? origin : lookAtTarget);

  ui.update(hoverPoints, activeHover, camera);
  
  renderer.render(scene, camera);
  
  // Let exporter know it's done rendering this frame
  window.frameRendered = true;
}

window.renderFrame = renderFrame;
window.totalDuration = totalDuration;

// If we are not exporting, run a standard RAF loop
if (!window.IS_EXPORTING) {
  let lastTime = performance.now();
  function animate(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    // cap dt for lag spikes
    renderFrame(Math.min(dt, 0.1));
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
