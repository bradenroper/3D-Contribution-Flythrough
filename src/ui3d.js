import * as THREE from 'three';

export function setupUI3D(scene, hoverPoints) {
  const popups = [];

  hoverPoints.forEach((hp) => {
    const group = new THREE.Group();
    // Move group directly on top of the highlighted block
    group.position.copy(hp.worldPos);

    // 1. Leader Line (Cylinder stretching upwards)
    const lineHeight = 2;
    const lineGeo = new THREE.CylinderGeometry(0.06, 0.06, lineHeight, 8);
    lineGeo.translate(0, lineHeight / 2, 0); // Base sits at block, extends up
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x6d6d6d,
      transparent: true,
      opacity: 0,
      depthTest: false
    });
    const leaderLine = new THREE.Mesh(lineGeo, lineMat);
    group.add(leaderLine);

    // 2. Text Canvas Plane
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 150;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const planeGeo = new THREE.PlaneGeometry(8, 4);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthTest: false
    });
    const textPlane = new THREE.Mesh(planeGeo, planeMat);
    // Position text box just slightly above the top of the leader line
    textPlane.position.y = lineHeight + 2;
    group.add(textPlane);

    scene.add(group);

    const fullDate = hp.block.userData.date || `Day ${hp.block.userData.w * 7 + hp.block.userData.d}`;
    const fullCount = `${hp.block.userData.count} Contributions`;

    popups.push({
      group,
      leaderLine,
      textPlane,
      canvas,
      texture,
      fullDate,
      fullCount,
      opacity: 0
    });
  });

  return {
    update: (activeHover, localTime, camera) => {
      popups.forEach((popup, i) => {
        // Target opacity
        const targetOpacity = (i === activeHover) ? 1.0 : 0.0;
        popup.opacity += (targetOpacity - popup.opacity) * 0.1;

        popup.leaderLine.material.opacity = popup.opacity;
        popup.textPlane.material.opacity = popup.opacity;

        // Billboarding perfectly to the camera
        popup.textPlane.lookAt(camera.position);

        // Only update canvas text while actively hovering — during fade-out, leave the
        // fully-typed text in place so it doesn't clear mid-fade.
        if (i === activeHover) {
          // Calculate typing text reveal
          const charsToReveal = Math.floor(localTime * 25);
          const dateReveal = popup.fullDate.substring(0, charsToReveal);
          let countReveal = '';
          if (charsToReveal > popup.fullDate.length) {
            const remainder = charsToReveal - popup.fullDate.length;
            countReveal = popup.fullCount.substring(0, remainder);
          }

          // Draw Canvas Text
          const ctx = popup.canvas.getContext('2d');
          ctx.clearRect(0, 0, popup.canvas.width, popup.canvas.height);

          // Draw gray box
          ctx.fillStyle = 'rgba(5, 5, 5, 0.75)';
          ctx.fillRect(8, 8, popup.canvas.width - 16, popup.canvas.height - 16);
          // Draw white border
          ctx.strokeStyle = '#6d6d6dff';
          ctx.lineWidth = 6;
          ctx.strokeRect(8, 8, popup.canvas.width - 16, popup.canvas.height - 16);

          // Draw Date text
          ctx.fillStyle = '#8b949e';
          ctx.font = '500 28px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(dateReveal, 36, 40);

          // Draw Count text
          ctx.fillStyle = '#ffffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText(countReveal, 36, 80);

          popup.texture.needsUpdate = true;
        }
      });
    }
  };
}
