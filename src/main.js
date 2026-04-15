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

const timeline = [];
let tCursor = 0;
for (let i = 0; i < hoverPoints.length; i++) {
  const hp = hoverPoints[i];
  const deltaT = hp.t - tCursor;
  if (deltaT > 0) {
    timeline.push({ type: 'fly', start: tCursor, end: hp.t, duration: deltaT * 10 }); 
  }
  timeline.push({ type: 'hover', hpIndex: i, duration: 4.0 }); // hover slightly longer for typing effect
  tCursor = hp.t;
}
if (tCursor < 1) {
  timeline.push({ type: 'fly', start: tCursor, end: 1, duration: (1 - tCursor) * 10 });
}

let totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

let currentTime = 0;
const currentLookAt = new THREE.Vector3(0, 0, 0);

function renderFrame(dt) {
  currentTime += dt;
  if (currentTime > totalDuration) {
      currentTime = currentTime % totalDuration;
  }

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
  if (!currentItem) {
    currentItem = timeline[timeline.length - 1]; 
    localTime = currentItem.duration;
  }

  let activeHover = -1;
  let lookAtTarget = new THREE.Vector3(0, 0, 0);

  if (currentItem.type === 'fly') {
    const ratio = localTime / currentItem.duration;
    const t = currentItem.start + (currentItem.end - currentItem.start) * ratio;
    const pos = curve.getPointAt(t);
    // Directly snap to exact track position to prevent any jumpiness when transitioning
    camera.position.copy(pos); 
  } else {
    activeHover = currentItem.hpIndex;
    const hp = hoverPoints[activeHover];
    const pos = curve.getPointAt(hp.t);
    camera.position.copy(pos);
    lookAtTarget.copy(hp.worldPos);
  }

  // Ultra smooth LookAt panning
  currentLookAt.lerp(lookAtTarget, 0.05);
  camera.lookAt(currentLookAt);

  // Pass necessary info to UI for typing effect
  ui.update(hoverPoints, activeHover, localTime, camera);
  
  renderer.render(scene, camera);
  window.frameRendered = true;
}

window.renderFrame = renderFrame;
window.totalDuration = totalDuration;

if (!window.IS_EXPORTING) {
  let lastTime = performance.now();
  function animate(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    renderFrame(Math.min(dt, 0.1));
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
