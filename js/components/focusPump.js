// FOCUS COOLANT PUMP (POMODORO TIMER COMPONENT)

class FocusCoolantPump {
  constructor(buttonId, timerTextId, timerSubId) {
    this.btn = document.getElementById(buttonId);
    this.textEl = document.getElementById(timerTextId);
    this.subEl = document.getElementById(timerSubId);
    
    this.timer = null;
    this.duration = 25 * 60; // 25 minutes in seconds
    this.timeLeft = this.duration;
    this.isActive = false;

    this.init();
  }

  init() {
    this.btn.addEventListener('click', () => {
      this.togglePump();
    });
  }

  togglePump() {
    // Initialize audio context on first click
    window.FizzyAudio.init();

    if (this.isActive) {
      // Pause pump option
      const abort = confirm("Do you want to shut down the Coolant Pump? (Progress will be lost)");
      if (abort) {
        this.stop();
      }
    } else {
      this.start();
    }
  }

  start() {
    this.isActive = true;
    this.btn.classList.add('timer-active');
    this.timeLeft = this.duration;
    
    // Play starting suction pump sound
    window.FizzyAudio.playGlug();

    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  stop() {
    this.isActive = false;
    clearInterval(this.timer);
    this.btn.classList.remove('timer-active');
    this.textEl.innerText = "Focus Coolant Pump";
    this.subEl.innerText = "Pump to lower bubble pressure";
    window.FizzyAudio.playFail();
  }

  complete() {
    this.isActive = false;
    clearInterval(this.timer);
    this.btn.classList.remove('timer-active');
    
    this.textEl.innerText = "COOLANT FLOODED! 🟢";
    this.subEl.innerText = "Goals cooled! +30 XP, +5 Gold";
    
    // Play completion fanfares
    window.FizzyAudio.playSuccess();
    
    // Push rewards to store
    const success = window.FizzyStore.injectPomodoroCoolant();
    
    // Shake reactor to simulate coolant flood
    if (window.reactorInstance) {
      window.reactorInstance.shakeReactor();
    }

    setTimeout(() => {
      if (!this.isActive) {
        this.textEl.innerText = "Focus Coolant Pump";
        this.subEl.innerText = "Pump to lower bubble pressure";
      }
    }, 5000);
  }

  tick() {
    this.timeLeft--;

    if (this.timeLeft <= 0) {
      this.complete();
      return;
    }

    // Format minutes and seconds
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    this.textEl.innerText = `PUMPING: ${formatted} 💨`;
    this.subEl.innerText = "Focusing... releases pressure on completion";

    // Play visual small bubble streams and small sizzle tick every minute/10s
    if (this.timeLeft % 10 === 0) {
      window.FizzyAudio.playFizz();
      if (window.reactorInstance) {
        // Release valve steam at the top center of Beaker
        window.reactorInstance.createValveReleaseVisual(
          window.reactorInstance.width / 2,
          50
        );
      }
    }
  }

  // Debug tool to fast-forward timer (extremely helpful for hackathons/judges!)
  fastForward() {
    if (this.isActive) {
      this.timeLeft = 5; // skip to last 5 seconds
      this.textEl.innerText = "PUMPING: 00:05 💨";
    }
  }
}

window.FocusCoolantPump = FocusCoolantPump;
