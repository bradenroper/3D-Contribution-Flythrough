import * as THREE from 'three';

export function setupUI() {
  const container = document.getElementById('ui-layer');
  const popups = [];

  return {
    update: (hoverPoints, activeIndex, camera) => {
      // Create DOM elements if they don't exist
      if (popups.length === 0) {
        hoverPoints.forEach((hp, i) => {
          const el = document.createElement('div');
          el.className = 'popup';
          el.innerHTML = `
            <div class="glow"></div>
            <div class="content">
              <h3>Day ${hp.block.userData.w * 7 + hp.block.userData.d}</h3>
              <p>${hp.block.userData.count} Contributions</p>
            </div>
          `;
          container.appendChild(el);
          popups.push({ el, hp });
        });
      }

      // Update positions
      popups.forEach((popup, i) => {
        // Only show the active one
        if (i === activeIndex) {
          popup.el.style.opacity = 1;
          
          // Project 3D pos to 2D
          const pos = popup.hp.worldPos.clone();
          pos.project(camera);
          
          const x = (pos.x * .5 + .5) * window.innerWidth;
          const y = (pos.y * -.5 + .5) * window.innerHeight;
          
          popup.el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - 20}px)`;
        } else {
          popup.el.style.opacity = 0;
        }
      });
    }
  };
}
