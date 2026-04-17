import * as THREE from 'three';
import { generateData } from './data.js';
import { createScene } from './scene.js';
import { setupCameraAndPath } from './camera.js';
import { setupUI3D } from './ui3d.js';
import './style.css';

const canvas = document.querySelector('#preview');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const dataObj = generateData();
const { scene, blocks } = createScene(dataObj);
const { camera, curve, hoverPoints } = setupCameraAndPath(dataObj, blocks);
const ui = setupUI3D(scene, hoverPoints);

function smoothstep(x) {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
}

// How far along the curve the camera drifts during a hover (slow creep instead of full stop)
const HOVER_ADVANCE = 0.015;
// Look-ahead/look-behind windows (seconds) for blending lookAt toward each highlight
const LOOKAHEAD_SEC = 2.0;
const LOOKBEHIND_SEC = 1.5;

const timeline = [];
let tCursor = 0;
for (let i = 0; i < hoverPoints.length; i++) {
  const hp = hoverPoints[i];
  const deltaT = hp.t - tCursor;
  if (deltaT > 0) {
    timeline.push({ type: 'fly', start: tCursor, end: hp.t, duration: deltaT * 10 });
  }
  const hoverTEnd = Math.min(hp.t + HOVER_ADVANCE, 0.9999);
  timeline.push({ type: 'hover', hpIndex: i, tStart: hp.t, tEnd: hoverTEnd, duration: 4.0 });
  tCursor = hoverTEnd;
}
if (tCursor < 1) {
  timeline.push({ type: 'fly', start: tCursor, end: 1, duration: (1 - tCursor) * 10 });
}

const totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0);

// Precompute absolute start/end times for each hover segment (for look-ahead blending)
const hoverSegTimes = [];
let accumTime = 0;
for (const item of timeline) {
  if (item.type === 'hover') {
    hoverSegTimes[item.hpIndex] = { startTime: accumTime, endTime: accumTime + item.duration };
  }
  accumTime += item.duration;
}

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

  if (currentItem.type === 'fly') {
    // Ease-in-out so the camera naturally slows near hover points
    const ratio = localTime / currentItem.duration;
    const t = currentItem.start + (currentItem.end - currentItem.start) * smoothstep(ratio);
    camera.position.copy(curve.getPointAt(t));
  } else {
    // Slow drift along the curve instead of a hard stop
    activeHover = currentItem.hpIndex;
    const ratio = localTime / currentItem.duration;
    const t = currentItem.tStart + (currentItem.tEnd - currentItem.tStart) * ratio;
    camera.position.copy(curve.getPointAt(t));
  }

  // Smooth look-ahead: blend lookAt toward each highlight before/during/after its hover
  const lookAtTarget = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < hoverPoints.length; i++) {
    const { startTime, endTime } = hoverSegTimes[i];
    const toStart = startTime - currentTime;
    const sinceEnd = currentTime - endTime;

    let influence = 0;
    if (toStart > 0 && toStart <= LOOKAHEAD_SEC) {
      influence = smoothstep(1 - toStart / LOOKAHEAD_SEC);
    } else if (toStart <= 0 && sinceEnd <= 0) {
      influence = 1.0;
    } else if (sinceEnd > 0 && sinceEnd <= LOOKBEHIND_SEC) {
      influence = smoothstep(1 - sinceEnd / LOOKBEHIND_SEC);
    }

    if (influence > 0) {
      lookAtTarget.lerp(hoverPoints[i].worldPos, influence);
    }
  }

  currentLookAt.lerp(lookAtTarget, 0.05);
  camera.lookAt(currentLookAt);

  ui.update(activeHover, localTime, camera);

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
