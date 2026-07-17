// STATE MANAGEMENT AND BUSINESS LOGIC (STORE)

const STORAGE_KEY = 'fizzy_reactor_state';

const initialStore = {
  goals: [],
  xp: 0,
  level: 1,
  tokens: 50,
  stability: 100,
  streak: 0,
  streakHighscore: 0,
  lastActiveDate: '',
  inventory: {
    streakShields: 0,
    pressureRegulators: 0,
    goldCarbonators: 0
  },
  activeModifiers: {
    pressureRegulatorUntil: 0,
    goldCarbonatorUntil: 0
  },
  lastUpdate: Date.now()
};

class FizzyStoreClass {
  constructor() {
    this.state = this.loadState();
    this.checkStreakBreak();
    this.listeners = [];
  }

  loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Clean up parsed dates back to integers
        if (parsed && Array.isArray(parsed.goals)) {
          parsed.goals = parsed.goals.map(g => ({
            ...g,
            createdAt: Number(g.createdAt),
            deadline: Number(g.deadline)
          }));
        } else {
          if (parsed) parsed.goals = [];
        }
        const merged = { ...initialStore, ...parsed };
        merged.inventory = { ...initialStore.inventory, ...parsed.inventory };
        merged.activeModifiers = { ...initialStore.activeModifiers, ...parsed.activeModifiers };
        return merged;
      }
    } catch (e) {
      console.error("Could not load state from localStorage:", e);
    }
    return { ...initialStore };
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      console.error("Could not save state to localStorage:", e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // --- ACTIONS ---

  addGoal(title, flavor, deadlineStr, weight) {
    const deadline = new Date(deadlineStr).getTime();
    const createdAt = Date.now();

    const newGoal = {
      id: 'goal_' + Math.random().toString(36).substr(2, 9),
      title,
      flavor,
      createdAt,
      deadline,
      weight: Number(weight),
      subtasks: [],
      popped: false,
      completed: false
    };

    this.state.goals.push(newGoal);
    this.saveState();
    return newGoal;
  }

  addSubtask(goalId, text) {
    const goal = this.state.goals.find(g => g.id === goalId);
    if (!goal) return;

    goal.subtasks.push({
      id: 'sub_' + Math.random().toString(36).substr(2, 9),
      text,
      completed: false
    });

    goal.completed = false; // Reset complete state if subtask added
    this.saveState();
  }

  toggleSubtask(goalId, subtaskId) {
    const goal = this.state.goals.find(g => g.id === goalId);
    if (!goal) return;

    const subtask = goal.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

    subtask.completed = !subtask.completed;

    // Check if entire goal is complete
    const total = goal.subtasks.length;
    const completed = goal.subtasks.filter(s => s.completed).length;
    
    let xpGained = 0;
    let tokensGained = 0;

    if (subtask.completed) {
      // Subtask completion reward
      xpGained += 15 * goal.weight;
      tokensGained += 2 * goal.weight;
      this.recordDailyProgress(); // Reward daily streak
    }

    if (total > 0 && completed === total) {
      goal.completed = true;
      // Goal completion bonus
      const baseReward = goal.weight === 1 ? 100 : goal.weight === 2 ? 250 : 500;
      xpGained += baseReward;
      tokensGained += Math.round(baseReward / 10);
      this.recordDailyProgress(); // Reward daily streak
      if (window.showFizzyToast) {
        window.showFizzyToast("Goal Completed! 🏆", `"${goal.title}" fully defused!`, "success");
      }
    } else {
      goal.completed = false;
    }

    this.addXp(xpGained);
    this.addTokens(tokensGained);
    this.saveState();

    return { completed: goal.completed, xpGained, tokensGained };
  }

  deleteGoal(goalId) {
    this.state.goals = this.state.goals.filter(g => g.id !== goalId);
    this.saveState();
  }

  addXp(amount) {
    this.state.xp += amount;
    // Level up logic
    let xpNeeded = this.state.level * 100;
    let leveledUp = false;
    while (this.state.xp >= xpNeeded) {
      this.state.xp -= xpNeeded;
      this.state.level += 1;
      xpNeeded = this.state.level * 100;
      leveledUp = true;
      this.state.tokens += this.state.level * 10; // Level up gold reward
      if (window.showFizzyToast) {
        window.showFizzyToast("Rank Level Up! 🧪", `Reached Level ${this.state.level}! +${this.state.level * 10} Gold!`, "info");
      }
    }
    return leveledUp;
  }

  addTokens(amount) {
    if (amount <= 0) return;
    
    // Apply Gold Carbonator Modifier (2x multiplier)
    const isCarbonatorActive = this.state.activeModifiers && this.state.activeModifiers.goldCarbonatorUntil > Date.now();
    const finalAmount = isCarbonatorActive ? amount * 2 : amount;
    
    this.state.tokens += finalAmount;
    if (window.showFizzyToast) {
      const msg = isCarbonatorActive 
        ? `+${finalAmount} Gold credited (2x Carbonator Active! 🧪🔥)` 
        : `+${finalAmount} Gold credited to your vault.`;
      window.showFizzyToast("Fizzy Gold Added! 🪙", msg, "gold");
    }
  }

  useTokens(amount) {
    if (this.state.tokens >= amount) {
      this.state.tokens -= amount;
      this.saveState();
      return true;
    }
    return false;
  }

  // Coolant Flush: cost tokens, cool down a bubble
  flushValve(goalId) {
    const goal = this.state.goals.find(g => g.id === goalId);
    if (!goal || goal.completed || goal.popped) return false;

    if (this.useTokens(10)) {
      // Extend deadline by 15% of the total duration or 4 hours (whichever is larger) to relieve pressure
      const duration = goal.deadline - goal.createdAt;
      const extension = Math.max(duration * 0.15, 4 * 60 * 60 * 1000);
      goal.deadline += extension;
      this.saveState();
      return true;
    }
    return false;
  }

  // Pomodoro Coolant Pump: cool down ALL bubbles
  injectPomodoroCoolant() {
    const now = Date.now();
    let cooled = false;
    this.state.goals.forEach(goal => {
      if (!goal.completed && !goal.popped) {
        // Extend deadline of all goals by 45 minutes
        goal.deadline += 45 * 60 * 1000;
        cooled = true;
      }
    });

    if (cooled) {
      this.addXp(30); // XP reward for focus session
      this.addTokens(5);
      this.recordDailyProgress(); // Reward daily streak
      this.saveState();
    }
    return cooled;
  }

  cleanFoamStain() {
    // Clean-up increases stability by 5% up to 100%
    this.state.stability = Math.min(100, this.state.stability + 5);
    this.saveState();
  }

  // Periodic Calculation Loop
  calculatePressures() {
    const now = Date.now();
    let totalDangerDamage = 0;
    let anyPoppedThisTick = [];

    this.state.goals.forEach(goal => {
      if (goal.completed) {
        goal.pressure = 0;
        return;
      }

      if (goal.popped) {
        goal.pressure = 100;
        return;
      }

      const totalTime = goal.deadline - goal.createdAt;
      const timeLeft = goal.deadline - now;

      if (timeLeft <= 0) {
        if (!goal.isExploding) {
          goal.isExploding = true;
          goal.explosionStartTime = now;
          goal.pressure = 100;
        }

        // Wait 2.5 seconds (2500ms) for the bubble to rise to the top center and shake violently before popping
        if (now - goal.explosionStartTime >= 2500) {
          goal.popped = true;
          goal.isExploding = false;
          anyPoppedThisTick.push(goal);
          // Stability hit
          this.state.stability = Math.max(0, this.state.stability - (15 * goal.weight));
        }
        return;
      }

      const timeRatio = 1 - (timeLeft / totalTime); // 0 to 1
      
      let progressRatio = 0;
      if (goal.subtasks.length > 0) {
        const completed = goal.subtasks.filter(s => s.completed).length;
        progressRatio = completed / goal.subtasks.length;
      }

      // Pressure calculations (increases with time elapsed, decreases with progress)
      const lag = Math.max(0, timeRatio - progressRatio);
      // Base pressure rises with time, progress lag exacerbates it
      let rawPressure = (timeRatio * 40) + (lag * 60);

      // Apply Pressure Regulator Modifier (20% slower buildup)
      const isRegulatorActive = this.state.activeModifiers && this.state.activeModifiers.pressureRegulatorUntil > Date.now();
      if (isRegulatorActive) {
        rawPressure *= 0.8;
      }

      goal.pressure = Math.min(100, Math.max(0, Math.round(rawPressure)));

      // Ambient heat damage: goals with PSI > 75 slowly leak damage to overall stability
      if (goal.pressure > 75) {
        totalDangerDamage += 0.05 * goal.weight; // very small decay per tick
      }
    });

    // Decay stability if there are dangerously pressurized bubbles
    if (totalDangerDamage > 0) {
      this.state.stability = Math.max(0, Math.round((this.state.stability - totalDangerDamage) * 10) / 10);
    }

    // Save only if changes made or to keep timestamps active
    this.saveState();
    return anyPoppedThisTick;
  }

  checkStreakBreak() {
    if (!this.state.lastActiveDate || this.state.streak === 0) return;
    
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    
    const lastDateStr = this.state.lastActiveDate;
    if (lastDateStr !== todayStr && lastDateStr !== yesterdayStr) {
      if (this.state.inventory && this.state.inventory.streakShields > 0) {
        // Auto consume shield!
        this.state.inventory.streakShields--;
        this.state.lastActiveDate = yesterdayStr; // Reset active date to maintain streak
        this.saveState();
        if (window.showFizzyToast) {
          window.showFizzyToast("Streak Shield Active! 🛡️", "A daily streak shield was consumed to protect your streak!", "streak");
        }
      } else {
        // Streak broken! Reset to 0
        this.state.streak = 0;
        this.saveState();
      }
    }
  }

  recordDailyProgress() {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    if (typeof this.state.streak === 'undefined') this.state.streak = 0;
    if (typeof this.state.streakHighscore === 'undefined') this.state.streakHighscore = 0;
    
    const lastDateStr = this.state.lastActiveDate;
    
    if (!lastDateStr) {
      // First progress ever!
      this.state.streak = 1;
      this.state.tokens += 20; // 20 gold reward (stored as tokens)
      this.state.lastActiveDate = todayStr;
      this.state.streakHighscore = Math.max(this.state.streakHighscore, this.state.streak);
      this.saveState();
      if (window.showFizzyToast) {
        window.showFizzyToast("Streak Started! 🚀", "Day 1 active! Keep the fire burning!", "streak");
      }
      return { streakIncreased: true, newStreak: 1, reward: 20 };
    }
    
    if (lastDateStr === todayStr) {
      // Already recorded today, maintain streak but don't increment
      return { streakIncreased: false, newStreak: this.state.streak, reward: 0 };
    }
    
    // Check if consecutive
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    
    let rewardGold = 0;
    let streakIncreased = false;
    
    if (lastDateStr === yesterdayStr) {
      // Consecutive day!
      this.state.streak += 1;
      rewardGold = 10 + (this.state.streak * 5); // scales up! E.g. Day 2 = 20g, Day 3 = 25g...
      rewardGold = Math.min(50, rewardGold); // cap at 50g per day
      this.state.tokens += rewardGold;
      streakIncreased = true;
      if (window.showFizzyToast) {
        window.showFizzyToast("Streak Maintained! 🔥", `Day ${this.state.streak} consecutive! Keep it up!`, "streak");
      }
    } else {
      // Broken streak! Restart at 1
      this.state.streak = 1;
      rewardGold = 20;
      this.state.tokens += rewardGold;
      streakIncreased = true;
      if (window.showFizzyToast) {
        window.showFizzyToast("Streak Restarted! 🚀", "Day 1 active! Don't let it break again!", "streak");
      }
    }
    
    this.state.lastActiveDate = todayStr;
    this.state.streakHighscore = Math.max(this.state.streakHighscore, this.state.streak);
    this.saveState();
    return { streakIncreased, newStreak: this.state.streak, reward: rewardGold };
  }

  buyItem(itemType) {
    let cost = 0;
    let stateKey = "";
    let itemName = "";
    
    if (itemType === 'streakShield') {
      cost = 150;
      stateKey = "streakShields";
      itemName = "Streak Shield 🛡️";
    } else if (itemType === 'pressureRegulator') {
      cost = 100;
      stateKey = "pressureRegulators";
      itemName = "Pressure Regulator ⚙️";
    } else if (itemType === 'goldCarbonator') {
      cost = 200;
      stateKey = "goldCarbonators";
      itemName = "Gold Carbonator 🧪";
    } else {
      return false;
    }
    
    if (this.state.tokens >= cost) {
      this.state.tokens -= cost;
      if (!this.state.inventory) {
        this.state.inventory = { streakShields: 0, pressureRegulators: 0, goldCarbonators: 0 };
      }
      this.state.inventory[stateKey] = (this.state.inventory[stateKey] || 0) + 1;
      this.saveState();
      
      if (window.showFizzyToast) {
        window.showFizzyToast("Item Purchased! 🛒", `Bought ${itemName} for ${cost} Gold.`, "gold");
      }
      return true;
    }
    
    if (window.showFizzyToast) {
      window.showFizzyToast("Insufficient Gold! 🪙", `Need ${cost} Gold to purchase ${itemName}.`, "info");
    }
    return false;
  }

  activateItem(itemType) {
    if (!this.state.inventory) return false;
    
    let stateKey = "";
    let itemName = "";
    let duration = 0;
    let activeKey = "";
    
    if (itemType === 'pressureRegulator') {
      stateKey = "pressureRegulators";
      itemName = "Pressure Regulator ⚙️";
      duration = 24 * 60 * 60 * 1000; // 24 hours
      activeKey = "pressureRegulatorUntil";
    } else if (itemType === 'goldCarbonator') {
      stateKey = "goldCarbonators";
      itemName = "Gold Carbonator 🧪";
      duration = 12 * 60 * 60 * 1000; // 12 hours
      activeKey = "goldCarbonatorUntil";
    } else {
      return false;
    }
    
    if (this.state.inventory[stateKey] > 0) {
      this.state.inventory[stateKey]--;
      if (!this.state.activeModifiers) {
        this.state.activeModifiers = { pressureRegulatorUntil: 0, goldCarbonatorUntil: 0 };
      }
      const currentUntil = this.state.activeModifiers[activeKey] || 0;
      const baseTime = currentUntil > Date.now() ? currentUntil : Date.now();
      this.state.activeModifiers[activeKey] = baseTime + duration;
      
      this.saveState();
      
      if (window.showFizzyToast) {
        const hours = duration / (60 * 60 * 1000);
        window.showFizzyToast("Modifier Activated! ⚡", `${itemName} is now active for ${hours} hours!`, "info");
      }
      return true;
    }
    return false;
  }
}

// Export a global store instance
const FizzyStore = new FizzyStoreClass();
window.FizzyStore = FizzyStore;
