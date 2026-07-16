// PHYSICS AND CHAMBER RENDERING (REACTOR)

class FizzyReactor {
  constructor(canvasId, containerId, layerId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById(containerId);
    this.bubbleLayer = document.getElementById(layerId);
    
    this.width = 0;
    this.height = 0;
    
    // Physics variables
    this.bubbles = []; // physics representation of goals
    this.fizzParticles = [];
    this.mouseX = null;
    this.mouseY = null;
    this.repelRadius = 110;
    this.repelForce = 0.4;
    this.bounce = 0.55;
    this.friction = 0.96;
    this.bubbleMap = new Map(); // goalId -> DOM Element

    this.init();
    this.setupListeners();
    this.animate();
  }

  init() {
    this.resize();
    this.spawnFizz(50);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  setupListeners() {
    // Resize observer to scale container sizes
    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this.container);

    // Mouse interaction for bubble repulsion
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    this.container.addEventListener('mouseleave', () => {
      this.mouseX = null;
      this.mouseY = null;
    });

    // Clicking the container background shakes it
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container || e.target === this.canvas || e.target === this.bubbleLayer) {
        this.shakeReactor();
        window.FizzyAudio.playGlug();
      }
    });
  }

  // Generate background carbonation bubbles
  spawnFizz(count) {
    this.fizzParticles = [];
    for (let i = 0; i < count; i++) {
      this.fizzParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 1 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1.5,
        wiggle: Math.random() * 100,
        wiggleSpeed: 0.02 + Math.random() * 0.03
      });
    }
  }

  // Triggered when user checks list off or manually shakes the reactor
  shakeReactor() {
    this.bubbles.forEach(b => {
      b.vx += (Math.random() - 0.5) * 15;
      b.vy += (Math.random() - 0.5) * 15;
    });

    // Spawn an burst of fizz particles from the bottom
    for (let i = 0; i < 20; i++) {
      this.fizzParticles.push({
        x: Math.random() * this.width,
        y: this.height - 20,
        r: 2 + Math.random() * 6,
        speed: 2 + Math.random() * 4,
        wiggle: Math.random() * 100,
        wiggleSpeed: 0.08
      });
    }
  }

  // Spawns visual pops
  createPopVisual(x, y, colorCode) {
    const parent = this.bubbleLayer;
    const colors = {
      peach: ['#ffd0c1', '#ff8359', '#ff9e7d'],
      mint: ['#abffd9', '#1dd189', '#2ee59d'],
      cherry: ['#ff9ebb', '#ff2a65', '#ff477e'],
      grape: ['#f79ce5', '#a20d8c', '#e062cc'],
      lime: ['#c5ff6c', '#62ca00', '#70e000']
    }[colorCode] || ['#3db8ff', '#00f5a0'];

    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      p.className = 'pop-particle';
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = 3 + Math.random() * 7;
      const dx = Math.cos(angle) * velocity * 12;
      const dy = Math.sin(angle) * velocity * 12;

      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.animation = 'particlePop 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards';
      
      parent.appendChild(p);
      setTimeout(() => p.remove(), 600);
    }
  }

  // Spawns Steam/Valve release effect
  createValveReleaseVisual(x, y) {
    const parent = this.bubbleLayer;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const steam = document.createElement('div');
        steam.className = 'steam-cloud';
        
        const offset = (Math.random() - 0.5) * 30;
        steam.style.left = `${x + offset - 15}px`;
        steam.style.top = `${y - 10}px`;
        
        const size = 20 + Math.random() * 25;
        steam.style.width = `${size}px`;
        steam.style.height = `${size}px`;
        
        parent.appendChild(steam);
        setTimeout(() => steam.remove(), 800);
      }, i * 100);
    }
  }

  // Synchronizes data goals with physics bubbles
  syncGoals(storeGoals) {
    // Remove expired bubbles from physics representation
    const activeIds = new Set(storeGoals.filter(g => !g.completed && !g.popped).map(g => g.id));
    this.bubbles = this.bubbles.filter(b => activeIds.has(b.id));

    // Remove obsolete DOM elements
    for (const [id, el] of this.bubbleMap.entries()) {
      if (!activeIds.has(id)) {
        el.remove();
        this.bubbleMap.delete(id);
      }
    }

    // Add new bubbles
    storeGoals.forEach(g => {
      if (g.completed || g.popped) return;

      let b = this.bubbles.find(x => x.id === g.id);
      if (!b) {
        // Size mapping based on weight (scaled down for circular chamber)
        const radius = g.weight === 1 ? 36 : g.weight === 2 ? 50 : 64;
        
        // Spawn randomly near the middle
        b = {
          id: g.id,
          x: this.width / 2 + (Math.random() - 0.5) * 50,
          y: this.height / 2 + (Math.random() - 0.5) * 50,
          vx: (Math.random() - 0.5) * 2,
          vy: -2 - Math.random() * 2,
          r: radius,
          weight: g.weight,
          // Float height targets (Giants stay low, smalls float high)
          targetY: this.height * (g.weight === 3 ? 0.65 : g.weight === 2 ? 0.48 : 0.3)
        };
        
        this.bubbles.push(b);
      }

      // Create DOM element if not exist
      if (!this.bubbleMap.has(g.id)) {
        const bubbleEl = document.createElement('button');
        bubbleEl.className = `goal-bubble bubble-${g.flavor}`;
        bubbleEl.id = g.id;
        bubbleEl.style.width = `${b.r * 2}px`;
        bubbleEl.style.height = `${b.r * 2}px`;
        bubbleEl.style.left = '0';
        bubbleEl.style.top = '0';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'bubble-title';
        titleSpan.innerText = g.title;
        bubbleEl.appendChild(titleSpan);

        const psiSpan = document.createElement('span');
        psiSpan.className = 'bubble-psi';
        psiSpan.innerText = `${g.pressure || 0} PSI`;
        bubbleEl.appendChild(psiSpan);

        this.bubbleLayer.appendChild(bubbleEl);
        this.bubbleMap.set(g.id, bubbleEl);

        // Click handler to open details
        bubbleEl.addEventListener('click', () => {
          if (window.openGoalDetails) {
            window.openGoalDetails(g.id);
          }
        });
      }

      // Update styling tags based on store pressure updates
      const el = this.bubbleMap.get(g.id);
      if (el) {
        // Update pressure index
        const psiSpan = el.querySelector('.bubble-psi');
        if (psiSpan) psiSpan.innerText = `${g.pressure || 0} PSI`;

        // Update classes
        el.classList.remove('bubble-warning', 'bubble-panic');
        if (g.pressure > 75) {
          el.classList.add('bubble-panic');
        } else if (g.pressure > 45) {
          el.classList.add('bubble-warning');
        }
      }
    });
  }

  // Main Loop
  animate() {
    this.updatePhysics();
    this.drawCanvas();
    requestAnimationFrame(() => this.animate());
  }

  updatePhysics() {
    const now = Date.now();

    // 1. Update background fizz particles
    this.fizzParticles.forEach(p => {
      p.y -= p.speed;
      p.wiggle += p.wiggleSpeed;
      p.x += Math.sin(p.wiggle) * 0.4;

      // recycle at the top
      if (p.y < -20) {
        p.y = this.height + 20;
        p.x = Math.random() * this.width;
      }
    });

    // 2. Resolve bubble-bubble collisions, mouse pushes, bounds
    const length = this.bubbles.length;
    for (let i = 0; i < length; i++) {
      const b1 = this.bubbles[i];

      // Add buoyancy/equilibrium restorative forces
      const forceY = (b1.targetY - b1.y) * 0.015;
      b1.vy += forceY;

      // Drag
      b1.vx *= this.friction;
      b1.vy *= this.friction;

      // Mouse repulsion
      if (this.mouseX !== null && this.mouseY !== null) {
        const dx = b1.x - this.mouseX;
        const dy = b1.y - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.repelRadius) {
          const force = (this.repelRadius - dist) / this.repelRadius * this.repelForce;
          b1.vx += (dx / dist) * force * 5;
          b1.vy += (dy / dist) * force * 5;
        }
      }

      // Physics integration
      b1.x += b1.vx;
      b1.y += b1.vy;

      // Circular Reactor Core bounds
      const centerX = this.width / 2;
      const centerY = this.height / 2;
      const coreRadius = (this.width / 2) - 16; // account for borders

      const distFromCenter = Math.sqrt((b1.x - centerX) ** 2 + (b1.y - centerY) ** 2);
      const maxDist = coreRadius - b1.r;

      if (distFromCenter > maxDist) {
        const nx = (b1.x - centerX) / distFromCenter;
        const ny = (b1.y - centerY) / distFromCenter;

        // Move bubble to constraint boundary
        b1.x = centerX + nx * maxDist;
        b1.y = centerY + ny * maxDist;

        // Reflect velocity across normal vector (elastic bounce)
        const dot = b1.vx * nx + b1.vy * ny;
        if (dot > 0) { // moving outwards
          b1.vx = (b1.vx - 2 * dot * nx) * this.bounce;
          b1.vy = (b1.vy - 2 * dot * ny) * this.bounce;
        }
      }

      // Bubble collisions (resolve overlaps)
      for (let j = i + 1; j < length; j++) {
        const b2 = this.bubbles[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = b1.r + b2.r - 5; // allow a tiny overlap for bubbly soft feel

        if (dist < minDist) {
          const overlap = minDist - dist;
          const forceDirectionX = dx / dist;
          const forceDirectionY = dy / dist;

          // Push them apart
          b1.x -= forceDirectionX * overlap * 0.5;
          b1.y -= forceDirectionY * overlap * 0.5;
          b2.x += forceDirectionX * overlap * 0.5;
          b2.y += forceDirectionY * overlap * 0.5;

          // Swap simple velocities
          const tempVx = b1.vx;
          const tempVy = b1.vy;
          b1.vx = b2.vx * this.bounce;
          b1.vy = b2.vy * this.bounce;
          b2.vx = tempVx * this.bounce;
          b2.vy = tempVy * this.bounce;
        }
      }
    }

    // 3. Update DOM positions of elements mapping to physics representation with 3D effects
    this.bubbles.forEach(b => {
      const el = this.bubbleMap.get(b.id);
      if (el) {
        // Calculate 3D tilt and squish based on speed & velocity
        const tiltX = Math.min(20, Math.max(-20, b.vy * 2.2));
        const tiltY = Math.min(20, Math.max(-20, b.vx * -2.2));
        
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const squish = Math.min(0.12, speed * 0.015);
        const scaleX = 1 + squish;
        const scaleY = 1 - squish;

        // Position using hardware-accelerated 3D transforms
        el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${scaleX}, ${scaleY}, 1)`;
      }
    });
  }

  drawCanvas() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw rising fizz carbonation bubbles
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    this.fizzParticles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 2. Draw glass highlights on the side of beaker body (internal glossy glass look)
    const grad = this.ctx.createLinearGradient(0, 0, this.width, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(0.08, 'rgba(255, 255, 255, 0.01)');
    grad.addColorStop(0.92, 'rgba(0, 0, 0, 0.02)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
    
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
window.FizzyReactor = FizzyReactor;
