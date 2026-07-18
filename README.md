# 🫧 Fizzy Goal Reactor
> **Gamifying Productivity & Accountability with 3D Bubbly Urgency**

Fizzy Goal Reactor is a tactile, physics-driven focus console that translates abstract deadlines into live, pressurized bubbles floating inside a glass beaker reactor. Built for the **HackHers** hackathon, this project addresses the root psychological causes of procrastination through visual feedback, physical mechanics, and habit loop gamification.

👉 **[Live App Link](https://fizzy-goal-reactor.vercel.app/)** *(Replace with your actual Vercel domain if different)*

---

## 🚀 Key Features

*   **🔮 Tactile Physics Engine:** Custom circular boundary collision algorithms and bubble-to-bubble repulsion physics calculated from scratch in pure Javascript (no heavy engines).
*   **⚠️ Visual Urgency (PSI System):** As deadlines draw near, bubbles scale up, shake violently, and transition from blue to warning-yellow, and panic-red.
*   **🌋 Screen Spill Disaster:** Procrastinating causes bubbles to explode, splattering interactive foam stains across your viewport that lock your interface until you wipe them clean.
*   **⚙️ Mechanical Focus Coolant Pump:** Pull the 3D spring handle Pomodoro lever to vent steam particles and flood the reactor with cooling gas, extending deadlines.
*   **📊 Station Core Stability Chart:** Real-time 7-day SVG line graph logging your daily reactor health with interactive hover nodes to track consistency trends.
*   **🔊 Procedural Web Audio Synthesis:** Procedural clicks, popping sparks, sirens, and boiling loop arpeggios generated dynamically in real-time (zero-audio asset footprint).
*   **🪙 Flavor Lab Shop & Customizer:** Earn Fizzy Gold to buy Streak Shields, Pressure Regulators, or unlock glowing fluid wave aesthetics (Peach, Lime, Royal Purple, Cherry).

---

## 🧠 The Science of Procrastination

Fizzy Goal Reactor is engineered around core principles of behavioral psychology:

1.  **Present Bias (Temporal Discounting):** We make deadlines feel immediate through visual **PSI pressure** that expands and alarms as time slips away.
2.  **Task Paralysis:** Users must divide goals into small checklist subtasks before injecting them into the beaker, replacing overwhelm with small milestones.
3.  **Delayed Gratification:** Checking off milestones immediately awards **XP and Fizzy Gold** with satisfying physical bubble pops and toast alerts.
4.  **Habit Momentum:** A Duolingo-style streak system combined with buyable **Streak Shields** keeps you coming back without frustration.

---

## 🛠️ Tech Stack & Architecture

*   **Frontend:** Pure HTML5, Vanilla CSS3 (Claymorphic / Glassmorphic UI design tokens).
*   **Logic & Physics Engine:** JavaScript (ES6+), HTML5 Canvas 2D Context, CSS 3D Matrix Transforms.
*   **Sound Engine:** Web Audio API (Procedural Oscillator Synthesizer).
*   **Vector Charts:** Responsive inline SVG with dynamic DOM nodes and custom hover event listeners.
*   **CI/CD & Deployment:** GitHub & Vercel.

---

## 💻 Local Setup & Installation

Since the app is built without heavy node packages or complex bundler tools, it runs immediately out-of-the-box:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/aayushidas-21/fizzy-goal-reactor.git
    cd fizzy-goal-reactor
    ```

2.  **Run a Local Server:**
    Because the app utilizes local storage and module calls, it is best run using a simple local server.
    
    Using Node (`npx`):
    ```bash
    npx serve
    ```
    Or Python:
    ```bash
    python -m http.server 8000
    ```

3.  **Open in Browser:** Open `http://localhost:3000` (or `http://localhost:8000`) in your web browser.

---

## 👩‍💻 The Team - Team HackHers
*   **Aayushi Das**
*   **Atriya Das**

*Stay Consistent. Stay Fizzy. 🫧*
