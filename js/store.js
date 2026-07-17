// STATE MANAGEMENT AND BUSINESS LOGIC (STORE)

const STORAGE_KEY = 'fizzy_reactor_state';

const initialStore = {
  goals: [],
  xp: 0,
  level: 1,
  tokens: 50,
  stability: 100,
  lastUpdate: Date.now()
};

class FizzyStoreClass {
  constructor() {
    this.state = this.loadState();
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
        return { ...initialStore, ...parsed };
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
    }

    if (total > 0 && completed === total) {
      goal.completed = true;
      // Goal completion bonus
      const baseReward = goal.weight === 1 ? 100 : goal.weight === 2 ? 250 : 500;
      xpGained += baseReward;
      tokensGained += Math.round(baseReward / 10);
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
    }
    return leveledUp;
  }

  addTokens(amount) {
    this.state.tokens += amount;
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
      const rawPressure = (timeRatio * 40) + (lag * 60);
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
}

// Export a global store instance
const FizzyStore = new FizzyStoreClass();
window.FizzyStore = FizzyStore;
