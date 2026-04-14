import * as THREE from 'three';

export function setupCameraAndPath(dataObj, blocks) {
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  // A curve that loops around the grid.
  // The grid is approx from x: -30 to +30, z: -4 to +4
  const pathPoints = [
    new THREE.Vector3(0, 40, 20), // Start overhead
    new THREE.Vector3(35, 15, 20),
    new THREE.Vector3(45, 10, 0), // Right side
    new THREE.Vector3(35, 5, -20),
    new THREE.Vector3(-35, 5, -20),
    new THREE.Vector3(-45, 10, 0), // Left side
    new THREE.Vector3(-35, 25, 20), 
    new THREE.Vector3(0, 40, 20)  // Back to start
  ];
  
  const curve = new THREE.CatmullRomCurve3(pathPoints);
  curve.closed = true;

  // Find the exact 3D positions of the highlight blocks
  const targetBlocks = [];
  for (const h of dataObj.highlights) {
    const block = blocks.find(b => b.userData.w === h.w && b.userData.d === h.d);
    if (block) targetBlocks.push(block);
  }

  // Highlight blocks represent moments where we want to pause the camera and show UI.
  // We determine what `t` value on the curve is closest to each highlight block for framing.
  const hoverPoints = targetBlocks.map(block => {
    // find nearest point on curve
    let bestT = 0;
    let minDist = Infinity;
    for (let t = 0; t <= 1; t += 0.01) {
      const p = curve.getPointAt(t);
      const d = p.distanceTo(block.position);
      if (d < minDist) {
        minDist = d;
        bestT = t;
      }
    }
    return {
      t: bestT,
      block: block,
      worldPos: block.position.clone().add(new THREE.Vector3(0, block.scale.y, 0))
    };
  }).sort((a,b) => a.t - b.t);

  return { camera, curve, hoverPoints };
}
