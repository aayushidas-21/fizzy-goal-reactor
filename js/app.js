// APPLICATION ORCHESTRATION AND CONTROLLERS (APP)

// Global Toast Notification Helper (3D effects)
window.showFizzyToast = function(title, desc, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `fizzy-toast toast-${type}`;
  
  let icon = '🫧';
  if (type === 'gold') icon = '🪙';
  else if (type === 'success') icon = '🏆';
  else if (type === 'streak') icon = '🔥';
  else if (type === 'info') icon = '🧪';
  
  toast.innerHTML = `
    <div class="toast-icon-wrapper">${icon}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-desc">${desc}</div>
    </div>
  `;
  
  container.appendChild(toast);
  
  // Auto dismiss after 4 seconds
  setTimeout(() => {
    toast.classList.add('toast-fadeout');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
};

function initApp() {
  const FizzyStore = window.FizzyStore;
  const FizzyAudio = window.FizzyAudio;

  // Initialize instances
  const reactor = new window.FizzyReactor('fluidCanvas', 'reactorChamber', 'bubbleLayer');
  window.reactorInstance = reactor;

  const focusPump = new window.FocusCoolantPump('focusPumpBtn', 'focusTimerText', 'focusTimerSub');
  window.focusPumpInstance = focusPump;

  // Cache DOM Elements
  const playerLevel = document.getElementById('playerLevel');
  const playerXpFill = document.getElementById('playerXpFill');
  const playerXpText = document.getElementById('playerXpText');
  const playerTokens = document.getElementById('playerTokens');
  const playerStreak = document.getElementById('playerStreak');
  const reactorStabilityText = document.getElementById('reactorStabilityText');
  const reactorStabilityFill = document.getElementById('reactorStabilityFill');
  const activeBubbleCount = document.getElementById('activeBubbleCount');
  const bubbleFeedList = document.getElementById('bubbleFeedList');
  const feedEmptyState = document.getElementById('feedEmptyState');
  
  // Modals
  const createModal = document.getElementById('createModal');
  const openCreateModalBtn = document.getElementById('openCreateModalBtn');
  const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
  const createGoalForm = document.getElementById('createGoalForm');
  
  const detailModal = document.getElementById('detailModal');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
  const detailGoalTitle = document.getElementById('detailGoalTitle');
  const detailPressureText = document.getElementById('detailPressureText');
  const detailPressureFill = document.getElementById('detailPressureFill');
  const detailTimeRemaining = document.getElementById('detailTimeRemaining');
  const detailWeightText = document.getElementById('detailWeightText');
  const detailPressureAlert = document.getElementById('detailPressureAlert');
  const detailSubtaskChecklist = document.getElementById('detailSubtaskChecklist');
  const valveReleaseBtn = document.getElementById('valveReleaseBtn');
  const deleteGoalBtn = document.getElementById('deleteGoalBtn');
  
  // Subtask Builder (in create modal)
  const subtaskTempInput = document.getElementById('subtaskTempInput');
  const addSubtaskBtn = document.getElementById('addSubtaskBtn');
  const subtaskListPreview = document.getElementById('subtaskListPreview');
  
  // Splash Disaster Overlay
  const splashOverlay = document.getElementById('splashOverlay');
  const foamStainsContainer = document.getElementById('foamStainsContainer');
  const splashCaption = document.getElementById('splashCaption');
  const wipingCloth = document.getElementById('wipingCloth');
  let disasterTimeout = null;

  // Internal state for modal operations
  let activeGoalId = null;
  let tempSubtasks = [];

  // --- ATMOSPHERIC BACKGROUND BUBBLES ---
  const bgBubblesContainer = document.getElementById('bgBubbles');
  function spawnBgBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'bg-bubble';
    
    const size = 10 + Math.random() * 50;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    
    // Random animation duration
    bubble.style.animationDuration = `${10 + Math.random() * 15}s`;
    
    bgBubblesContainer.appendChild(bubble);
    setTimeout(() => bubble.remove(), 25000);
  }
  
  // Start atmospheric bubble loop
  setInterval(spawnBgBubble, 2000);
  for (let i = 0; i < 8; i++) spawnBgBubble(); // initial spawn

  // --- LOCAL STORE SYNCHRONIZATION ---
  function updateUI(state) {
    // Ambient boiling loop when chamber is empty
    const hasActiveGoals = state.goals.some(g => !g.completed && !g.popped);
    if (!hasActiveGoals) {
      FizzyAudio.startBoiling();
    } else {
      FizzyAudio.stopBoiling();
    }

    // 1. Level & XP
    playerLevel.innerText = `LV ${state.level}`;
    const xpNeeded = state.level * 100;
    const xpPercent = Math.min(100, (state.xp / xpNeeded) * 100);
    playerXpFill.style.width = `${xpPercent}%`;
    playerXpText.innerText = `${state.xp}/${xpNeeded} XP`;

    // 2. Soda Tokens & Streak
    playerTokens.innerText = state.tokens;
    if (playerStreak) {
      playerStreak.innerText = `${state.streak || 0} ${state.streak === 1 ? 'Day' : 'Days'}`;
    }

    // 3. Stability Index
    const stability = state.stability;
    reactorStabilityText.innerText = `${Math.round(stability)}%`;
    reactorStabilityFill.style.width = `${stability}%`;
    
    // Stability color ranges
    if (stability > 70) {
      reactorStabilityFill.style.background = 'linear-gradient(90deg, var(--color-secondary), #00e5ff)';
      reactorStabilityText.style.color = 'var(--color-secondary)';
      document.body.style.animation = 'none'; // reset body panic pulse
    } else if (stability > 35) {
      reactorStabilityFill.style.background = 'linear-gradient(90deg, var(--color-warning), #ffd166)';
      reactorStabilityText.style.color = 'var(--color-warning)';
      document.body.style.animation = 'none';
    } else {
      reactorStabilityFill.style.background = 'linear-gradient(90deg, var(--color-cherry), #ff8fa3)';
      reactorStabilityText.style.color = 'var(--color-cherry)';
      // Pulse background during low stability panic state
      document.body.style.animation = 'panicVignette 2s infinite ease-in-out';
    }

    // 4. Sync goals to physics engine
    reactor.syncGoals(state.goals);

    // 5. Populate Active Bubbles list
    const activeGoals = state.goals.filter(g => !g.completed && !g.popped);
    activeBubbleCount.innerText = `${activeGoals.length} Active`;
    
    if (activeGoals.length === 0) {
      feedEmptyState.classList.remove('hidden');
      // Clear feed children except empty state
      Array.from(bubbleFeedList.children).forEach(child => {
        if (child !== feedEmptyState) child.remove();
      });
    } else {
      feedEmptyState.classList.add('hidden');
      
      // Sync list
      const existingFeedIds = new Set();
      Array.from(bubbleFeedList.children).forEach(child => {
        if (child !== feedEmptyState) {
          const id = child.getAttribute('data-id');
          if (activeGoals.some(g => g.id === id)) {
            existingFeedIds.add(id);
          } else {
            child.remove();
          }
        }
      });

      activeGoals.forEach(g => {
        let item = bubbleFeedList.querySelector(`[data-id="${g.id}"]`);
        if (!item) {
          item = document.createElement('div');
          item.className = 'feed-item';
          item.setAttribute('data-id', g.id);
          item.addEventListener('click', () => openGoalDetails(g.id));
          
          const left = document.createElement('div');
          left.className = 'feed-item-left';
          
          const dot = document.createElement('div');
          dot.className = 'feed-flavor-dot';
          dot.style.background = `var(--color-${g.flavor})`;
          
          const title = document.createElement('span');
          title.className = 'feed-title';
          title.innerText = g.title;
          
          left.appendChild(dot);
          left.appendChild(title);
          item.appendChild(left);
          
          const right = document.createElement('div');
          right.className = 'feed-item-right';
          
          const badge = document.createElement('span');
          badge.className = 'feed-psi-badge';
          right.appendChild(badge);
          item.appendChild(right);
          
          bubbleFeedList.appendChild(item);
        }

        // Update pressure status badge
        const badge = item.querySelector('.feed-psi-badge');
        badge.innerText = `${g.pressure || 0} PSI`;
        badge.className = 'feed-psi-badge';
        
        if (g.pressure > 75) {
          badge.classList.add('feed-psi-panic');
        } else if (g.pressure > 45) {
          badge.classList.add('feed-psi-warning');
        } else {
          badge.classList.add('feed-psi-stable');
        }
      });
    }

    // 6. Update Detail Modal if open
    if (activeGoalId && detailModal.classList.contains('hidden') === false) {
      const activeGoal = state.goals.find(g => g.id === activeGoalId);
      if (activeGoal) {
        renderDetailModal(activeGoal);
      } else {
        closeDetailModal();
      }
    }
  }

  // Bind store listener
  FizzyStore.subscribe(updateUI);
  updateUI(FizzyStore.state); // first draw

  // --- TIME TICK LOOP (1 Second) ---
  setInterval(() => {
    // 1. Identify goals that are about to complete their explosion countdown and pop this tick
    const now = Date.now();
    const explodingThisTick = FizzyStore.state.goals.filter(g => {
      if (g.completed || g.popped) return false;
      const timeLeft = g.deadline - now;
      if (timeLeft <= 0 && g.isExploding && (now - g.explosionStartTime >= 2500)) {
        return true;
      }
      return false;
    });

    // 2. Query and capture their exact coordinate position in the physics engine BEFORE calculatePressures modifies/deletes them
    const popCoordinates = new Map();
    explodingThisTick.forEach(g => {
      if (reactor) {
        const b = reactor.bubbles.find(x => x.id === g.id);
        if (b) {
          popCoordinates.set(g.id, { x: b.x, y: b.y });
        }
      }
    });

    // 3. Update store states and check pressures
    const poppedList = FizzyStore.calculatePressures();
    
    // Play warning sound if there are panic bubbles
    const anyPanic = FizzyStore.state.goals.some(g => !g.completed && !g.popped && g.pressure > 75);
    if (anyPanic && Math.random() < 0.25) { // periodic random alarm sound
      FizzyAudio.playSiren();
    }

    // 4. Trigger pop visuals at the captured coordinates where they were vibrating!
    if (poppedList && poppedList.length > 0) {
      poppedList.forEach(g => {
        if (reactor) {
          const coords = popCoordinates.get(g.id);
          const rx = coords ? coords.x : reactor.width / 2;
          const ry = coords ? coords.y : reactor.height / 2;
          
          // Spawn multiple layers of particles and steam
          reactor.createPopVisual(rx, ry, g.flavor);
          reactor.createPopVisual(rx, ry, g.flavor); // double layer for drama
          reactor.createPopVisual(rx, ry, 'white');  // extra highlight sparks
          reactor.createValveReleaseVisual(rx, ry);
          reactor.shakeReactor();
        }
      });
      triggerSodaDisaster(poppedList);
    }
  }, 1000);

  // Wiping cloth movement tracker
  splashOverlay.addEventListener('mousemove', (e) => {
    wipingCloth.classList.remove('hidden');
    wipingCloth.style.left = `${e.clientX}px`;
    wipingCloth.style.top = `${e.clientY}px`;
  });
  
  splashOverlay.addEventListener('mouseleave', () => {
    wipingCloth.classList.add('hidden');
  });

  // --- DISASTER POP MANAGEMENT ---
  function triggerSodaDisaster(poppedList) {
    FizzyAudio.playSiren();
    FizzyAudio.playFail();

    // Trigger screen shake animation on document body
    document.body.style.animation = 'screenShake 0.4s ease-in-out 3';
    setTimeout(() => {
      document.body.style.animation = FizzyStore.state.stability <= 35 ? 'panicVignette 2s infinite ease-in-out' : 'none';
    }, 1200);

    splashOverlay.classList.remove('hidden');
    
    // Clear old stains and hide instruction caption immediately
    if (disasterTimeout) clearTimeout(disasterTimeout);
    foamStainsContainer.innerHTML = '';
    splashCaption.classList.add('hidden');
    
    // Hide wiping cloth initially until mouse moves
    wipingCloth.classList.add('hidden');
    
    // Wait 3 seconds showing only the glitch title, then show caption and spawn stains
    disasterTimeout = setTimeout(() => {
      splashCaption.classList.remove('hidden');
      
      // Spawn interactive foam stains on the screen
      const stainCount = 10 * poppedList.length;
      for (let i = 0; i < stainCount; i++) {
        const stain = document.createElement('div');
        stain.className = 'foam-stain';
        
        const size = 60 + Math.random() * 100;
        stain.style.width = `${size}px`;
        stain.style.height = `${size}px`;
        
        // Random coordinates (ensuring clickability)
        stain.style.left = `${Math.random() * (window.innerWidth - size)}px`;
        stain.style.top = `${Math.random() * (window.innerHeight - size)}px`;
        
        // Drifting float animation with random duration and phase offset
        stain.style.animation = `foamFloat ${8 + Math.random() * 8}s infinite ease-in-out`;
        stain.style.animationDelay = `${Math.random() * -10}s`;
  
        // Sweep/wipe mechanics: trigger cleanup on hover (mouseenter)
        stain.addEventListener('mouseenter', () => {
          if (stain.classList.contains('wiping')) return;
          stain.classList.add('wiping');
          
          FizzyAudio.playPop(); // play wiping sound
          
          // Spawn miniature pop bubbles
          const rect = stain.getBoundingClientRect();
          if (reactor) {
            reactor.createPopVisual(rect.left + size/2, rect.top + size/2, poppedList[0].flavor);
          }
          
          // Shrink and fade away
          stain.style.transform = 'scale(0) rotate(180deg)';
          stain.style.opacity = '0';
          stain.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
          
          setTimeout(() => {
            stain.remove();
            FizzyStore.cleanFoamStain(); // Restores stability by 5%
            
            // If all stains are wiped away, close disaster overlay
            const activeStains = Array.from(foamStainsContainer.children).filter(el => !el.classList.contains('wiping'));
            if (activeStains.length === 0) {
              splashOverlay.classList.add('hidden');
              wipingCloth.classList.add('hidden');
              poppedList.forEach(g => FizzyStore.deleteGoal(g.id));
              FizzyAudio.playSuccess();
            }
          }, 400);
        });
        
        foamStainsContainer.appendChild(stain);
      }
    }, 3000);
  }

  // --- GOAL CREATION ---
  openCreateModalBtn.addEventListener('click', () => {
    // Default deadline: 30 days from now (monthly goal tracker)
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    // Format to yyyy-MM-ddThh:mm
    const year = thirtyDays.getFullYear();
    const month = String(thirtyDays.getMonth() + 1).padStart(2, '0');
    const day = String(thirtyDays.getDate()).padStart(2, '0');
    document.getElementById('goalDeadline').value = `${year}-${month}-${day}T12:00`;

    tempSubtasks = [];
    renderSubtaskPreview();
    createModal.classList.remove('hidden');
  });

  closeCreateModalBtn.addEventListener('click', () => {
    createModal.classList.add('hidden');
  });

  // Adding subtasks to preview log
  function renderSubtaskPreview() {
    subtaskListPreview.innerHTML = '';
    tempSubtasks.forEach((st, idx) => {
      const li = document.createElement('li');
      li.innerText = st;
      
      const rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'remove-subtask-btn';
      rmBtn.innerHTML = '&times;';
      rmBtn.addEventListener('click', () => {
        tempSubtasks.splice(idx, 1);
        renderSubtaskPreview();
      });
      
      li.appendChild(rmBtn);
      subtaskListPreview.appendChild(li);
    });
  }

  addSubtaskBtn.addEventListener('click', () => {
    const val = subtaskTempInput.value.trim();
    if (val) {
      tempSubtasks.push(val);
      subtaskTempInput.value = '';
      renderSubtaskPreview();
      FizzyAudio.playGlug();
    }
  });

  subtaskTempInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtaskBtn.click();
    }
  });

  // Dynamic Soda Flavor Description Toggler
  const flavorRadios = document.querySelectorAll('input[name="goalFlavor"]');
  const flavorDescItems = document.querySelectorAll('.flavor-desc-item');
  
  flavorRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedFlavor = e.target.value;
      flavorDescItems.forEach(item => {
        if (item.id === `desc-${selectedFlavor}`) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  createGoalForm.addEventListener('reset', () => {
    flavorDescItems.forEach(item => {
      if (item.id === 'desc-peach') {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
  });

  createGoalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('goalTitle').value.trim();
    const flavor = document.querySelector('input[name="goalFlavor"]:checked').value;
    const deadline = document.getElementById('goalDeadline').value;
    const weight = document.getElementById('goalWeight').value;

    const newGoal = FizzyStore.addGoal(title, flavor, deadline, weight);
    
    // Add subtasks
    tempSubtasks.forEach(st => {
      FizzyStore.addSubtask(newGoal.id, st);
    });

    // Close and reset
    createModal.classList.add('hidden');
    createGoalForm.reset();
    tempSubtasks = [];
    
    FizzyAudio.playGlug();
    reactor.shakeReactor();
  });

  // --- GOAL DETAILS MODAL (BOTTLE CAP) ---
  window.openGoalDetails = function(goalId) {
    const goal = FizzyStore.state.goals.find(g => g.id === goalId);
    if (!goal) return;

    activeGoalId = goalId;
    renderDetailModal(goal);
    detailModal.classList.remove('hidden');
    FizzyAudio.playGlug();
  };

  function closeDetailModal() {
    detailModal.classList.add('hidden');
    activeGoalId = null;
  }

  closeDetailModalBtn.addEventListener('click', closeDetailModal);

  function renderDetailModal(goal) {
    detailGoalTitle.innerText = goal.title;
    detailGoalTitle.style.color = `var(--color-${goal.flavor})`;
    detailPressureText.innerText = `${goal.pressure || 0} PSI`;
    detailPressureFill.style.width = `${goal.pressure || 0}%`;

    // Density Text
    const density = goal.weight === 1 ? 'Small Density' : goal.weight === 2 ? 'Medium Density' : 'Epic Density';
    detailWeightText.innerText = density;

    // Warning Alert UI
    detailPressureAlert.className = 'pressure-warning-alert';
    if (goal.pressure > 75) {
      detailPressureAlert.classList.add('panic');
      detailPressureAlert.innerText = '⚠️ CRITICAL PRESSURE! REACTOR AT RISK OF EXPLOSION!';
    } else if (goal.pressure > 45) {
      detailPressureAlert.classList.add('warning');
      detailPressureAlert.innerText = '⚠️ Warning: Pressure swelling. Release soon.';
    } else {
      detailPressureAlert.innerText = '🟢 Bubble is stable. Carbonation flow is normal.';
    }

    // Countdown details
    const now = Date.now();
    const diff = goal.deadline - now;
    if (diff <= 0) {
      detailTimeRemaining.innerText = '00:00:00 (EXPIRED)';
      detailTimeRemaining.style.color = 'var(--color-cherry)';
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      detailTimeRemaining.innerText = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      detailTimeRemaining.style.color = 'white';
    }

    // Render Checklist
    detailSubtaskChecklist.innerHTML = '';
    
    // If no subtasks, add a mock single checkoff
    if (goal.subtasks.length === 0) {
      const mockItem = document.createElement('div');
      mockItem.className = 'checklist-item';
      
      const chk = document.createElement('div');
      chk.className = 'checklist-checkbox';
      
      const txt = document.createElement('span');
      txt.className = 'checklist-text';
      txt.innerText = "Complete entire goal";
      
      mockItem.appendChild(chk);
      mockItem.appendChild(txt);
      
      mockItem.addEventListener('click', () => {
        // Toggle entire goal complete
        FizzyStore.addGoalSubtaskMockComplete(goal.id);
      });
      
      detailSubtaskChecklist.appendChild(mockItem);
    } else {
      goal.subtasks.forEach(s => {
        const item = document.createElement('div');
        item.className = 'checklist-item';
        if (s.completed) item.classList.add('checked');

        const chk = document.createElement('div');
        chk.className = 'checklist-checkbox';
        
        const txt = document.createElement('span');
        txt.className = 'checklist-text';
        txt.innerText = s.text;

        item.appendChild(chk);
        item.appendChild(txt);

        item.addEventListener('click', () => {
          // Play pop sound
          FizzyAudio.playPop();
          
          // Toggle subtask in store
          const result = FizzyStore.toggleSubtask(goal.id, s.id);
          
          // physics particle pop inside beaker
          const physicsBubble = reactor.bubbles.find(b => b.id === goal.id);
          if (physicsBubble) {
            reactor.createPopVisual(physicsBubble.x, physicsBubble.y, goal.flavor);
            reactor.shakeReactor();
          }

          if (result && result.completed) {
            // Whole goal is complete! Close details and play massive success audio
            FizzyAudio.playSuccess();
            closeDetailModal();
          }
        });

        detailSubtaskChecklist.appendChild(item);
      });
    }

    // Valve release button status (costs 10 tokens)
    valveReleaseBtn.disabled = FizzyStore.state.tokens < 10;
  }

  // Manually release pressure valve
  valveReleaseBtn.addEventListener('click', () => {
    if (activeGoalId) {
      const success = FizzyStore.flushValve(activeGoalId);
      if (success) {
        FizzyAudio.playFizz();
        
        // Show steam visual in physics chamber
        const physicsBubble = reactor.bubbles.find(b => b.id === activeGoalId);
        if (physicsBubble) {
          reactor.createValveReleaseVisual(physicsBubble.x, physicsBubble.y);
          physicsBubble.vy -= 8; // pop bubble upwards slightly
        }
      }
    }
  });

  // Dissolve/Abort Goal
  deleteGoalBtn.addEventListener('click', () => {
    if (activeGoalId) {
      const confirmed = confirm("Are you sure you want to dissolve this bubble? You will lose all current progress on it!");
      if (confirmed) {
        FizzyStore.deleteGoal(activeGoalId);
        closeDetailModal();
        FizzyAudio.playFail();
      }
    }
  });

  // Supporting single goal completion when subtasks are empty
  FizzyStore.addGoalSubtaskMockComplete = function(goalId) {
    const goal = this.state.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    // Add a single complete subtask so normal checklists handle it
    this.addSubtask(goalId, "Complete entire goal");
    const sub = goal.subtasks[0];
    const result = this.toggleSubtask(goalId, sub.id);
    
    const physicsBubble = reactor.bubbles.find(b => b.id === goalId);
    if (physicsBubble) {
      reactor.createPopVisual(physicsBubble.x, physicsBubble.y, goal.flavor);
    }
    
    if (result && result.completed) {
      FizzyAudio.playSuccess();
      closeDetailModal();
    }
  };

  // --- DEVELOPER / JUDGE DEMO MODE CHEAT CONSOLE ---
  // Double-clicking the logo icon spawns a small debug tray to help speed up time
  const logoIcon = document.querySelector('.logo-icon-container') || document.querySelector('.logo-icon');
  if (logoIcon) {
    logoIcon.style.cursor = 'help';
    logoIcon.title = 'Double-click for Developer Console';
    
    logoIcon.addEventListener('dblclick', () => {
      let devPanel = document.getElementById('devPanel');
      if (devPanel) {
        devPanel.classList.toggle('hidden');
        return;
      }

      // Create dev panel element
      devPanel = document.createElement('div');
      devPanel.id = 'devPanel';
      devPanel.style.position = 'fixed';
      devPanel.style.bottom = '20px';
      devPanel.style.left = '20px';
      devPanel.style.background = '#1e293b';
      devPanel.style.border = '3px solid #ff9f43';
      devPanel.style.borderRadius = '16px';
      devPanel.style.padding = '14px';
      devPanel.style.zIndex = '9999';
      devPanel.style.display = 'flex';
      devPanel.style.flexDirection = 'column';
      devPanel.style.gap = '8px';
      devPanel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
      devPanel.innerHTML = `
        <h4 style="color:#ff9f43; margin-bottom:4px; font-weight:800; font-size:0.85rem;">🧪 HACKATHON DEMO TRAY</h4>
        <button id="devFastPomodoro" style="padding:6px; background:#ffd166; color:#000; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.75rem;">Fast-Forward Pomodoro (5s left)</button>
        <button id="devAddXP" style="padding:6px; background:#2ee59d; color:#000; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.75rem;">Add 50 XP</button>
        <button id="devMakeWarning" style="padding:6px; background:#ff477e; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.75rem;">Force Danger State (Shorten Goals)</button>
        <button id="devAddGold" style="padding:6px; background:#3db8ff; color:#000; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.75rem;">Get +50 Fizzy Gold</button>
      `;
      document.body.appendChild(devPanel);

      // Wire up cheats
      document.getElementById('devFastPomodoro').addEventListener('click', () => {
        focusPump.fastForward();
        FizzyAudio.playFizz();
      });

      document.getElementById('devAddXP').addEventListener('click', () => {
        const levelUp = FizzyStore.addXp(50);
        FizzyStore.saveState();
        FizzyAudio.playSuccess();
      });

      document.getElementById('devAddGold').addEventListener('click', () => {
        FizzyStore.addTokens(50);
        FizzyStore.saveState();
        FizzyAudio.playGlug();
      });

      document.getElementById('devMakeWarning').addEventListener('click', () => {
        // Artificially change all active goal deadlines to 12 seconds from now
        FizzyStore.state.goals.forEach(g => {
          if (!g.completed && !g.popped) {
            g.deadline = Date.now() + 12000; // 12 seconds remaining!
          }
        });
        FizzyStore.saveState();
        FizzyAudio.playSiren();
        reactor.shakeReactor();
      });
    });
  }

  // --- INTERACTIVE 3D CARD HOVER TILT ---
  const cards = document.querySelectorAll('.clay-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Max tilt angle of 6 degrees
      const rotateX = ((centerY - y) / centerY) * 6;
      const rotateY = ((x - centerX) / centerX) * 6;
      
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      card.style.boxShadow = `
        ${-rotateY * 1.5}px ${rotateX * 1.5 + 16}px 32px rgba(0, 0, 0, 0.65),
        inset 4px 4px 8px rgba(255, 255, 255, 0.1),
        inset -4px -4px 8px rgba(0, 0, 0, 0.45)
      `;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
      card.style.boxShadow = 'var(--clay-shadow)';
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
