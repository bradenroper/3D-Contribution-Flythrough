import * as THREE from 'three';

export function setupUI() {
  const container = document.getElementById('ui-layer');
  const popups = [];

  return {
    update: (hoverPoints, activeIndex, localTime, camera) => {
      if (popups.length === 0) {
        hoverPoints.forEach((hp, i) => {
          const el = document.createElement('div');
          el.className = 'popup';
          const fullDate = hp.block.userData.date || `Day ${hp.block.userData.w * 7 + hp.block.userData.d}`;
          const fullCount = `${hp.block.userData.count} Contributions`;
          
          el.innerHTML = `
            <div class="content">
              <h3 class="date-text"></h3>
              <p class="count-text"></p>
            </div>
            <div class="leader-line"></div>
          `;
          container.appendChild(el);
          popups.push({ el, hp, fullDate, fullCount });
        });
      }

      popups.forEach((popup, i) => {
        if (i === activeIndex) {
          popup.el.style.opacity = 1;
          
          // Project 3D pos to 2D screen space
          const pos = popup.hp.worldPos.clone();
          pos.project(camera);
          
          const x = (pos.x * .5 + .5) * window.innerWidth;
          const y = (pos.y * -.5 + .5) * window.innerHeight;
          
          // The leader line will visually connect from the box down to this (x,y)
          // We'll place the popup box slightly above and to the right of the actual block point
          popup.el.style.left = `${x}px`;
          popup.el.style.top = `${y}px`;
          popup.el.style.transform = `translate(-20%, calc(-100% - 40px))`;

          // Typing Text Effect (around 15 chars per second)
          const charsToReveal = Math.floor(localTime * 25);
          
          // Split reveal logic across the two lines
          const dateReveal = popup.fullDate.substring(0, charsToReveal);
          let countReveal = '';
          if (charsToReveal > popup.fullDate.length) {
             const remainder = charsToReveal - popup.fullDate.length;
             countReveal = popup.fullCount.substring(0, remainder);
          }

          popup.el.querySelector('.date-text').textContent = dateReveal;
          popup.el.querySelector('.count-text').textContent = countReveal;

        } else {
          popup.el.style.opacity = 0;
          // reset for next time
          popup.el.querySelector('.date-text').textContent = '';
          popup.el.querySelector('.count-text').textContent = '';
        }
      });
    }
  };
}
