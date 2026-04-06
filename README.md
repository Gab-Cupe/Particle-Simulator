
---
# Particle-Simulator

<div align="center">

![react](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![threejs](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)

![typescript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)


**Particle-Simulator** is a real-time particle simulation and visualization engine built with **React** and **Three.js**.

[![Live Demo](https://img.shields.io/badge/Live_Demo-00C853?style=for-the-badge&logo=vercel&logoColor=white)](https://particle-simulator-psy.netlify.app/)

[![Buy me a coffee](https://img.shields.io/badge/Buy_me_a_coffe-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/gabcupe)

</div>

---

## Project Motivation (The Lore)

> This simulator was not born out of a pure love for science, but as a tool for **academic self-defense**.
>
> **Professor Sánchez is to blame for all this code.** His Physics 2 exams are so absurdly difficult and he crossed the line so many times that there was no other choice but to program this engine to visualize what he expected us to calculate by hand in 90 minutes.
>
> If the exam was a torture, this simulator is the answer. **Thanks for nothing, Sánchez!**

---

## How to use

<ol>
  <li><b>Define the body:</b> Set the initial position and the mass of your particle.</li>
  <li><b>Add the chaos:</b> Assign forces in the form of functions or use the kinematic mode to define position equations directly.</li>
  <li><b>Simulate:</b> Click <b>START</b> and watch physics finally make sense.</li>
</ol>

---

## Syntax and Functions Guide

<div align="center">

<img src="https://img.shields.io/badge/Math%20Library-JS%20Math-00BFFF?style=flat-square&logo=javascript&logoColor=white" />
<img src="https://img.shields.io/badge/3D%20Engine-Three.js-000000?style=flat-square&logo=three.js&logoColor=white" />
<img src="https://img.shields.io/badge/Physics%20Mode-Kinematic%20%26%20Dynamic-FFCB87?style=flat-square" />

</div>

### Available Variables

| Variable | Description |
| --- | --- |
| `t` | Elapsed time in seconds. |
| `x`, `y`, `z` | Current position of the particle on that axis. |

### Mathematical Functions

| Category | Functions | Example |
| --- | --- | --- |
| **Trigonometry** | `sin(n)`, `cos(n)`, `tan(n)`, `atan2(y, x)` | `10 * sin(t)` |
| **Hyperbolic** | `sinh(n)`, `cosh(n)`, `tanh(n)` | `20 * tanh(sin(t))` |
| **Logs & Power** | `sqrt(n)`, `log(n)`, `log10(n)`, `^` or `**` | `log(t + 1)` |
| **Utility** | `abs(n)`, `floor(n)`, `ceil(n)`, `round(n)` | `abs(x)` |
| **Advanced** | `min(a, b)`, `max(a, b)`, `random()`, `sign(n)` | `max(x, y)` |

### Mathematical Constants

| Constant | Description | Value (Approx) |
| --- | --- | --- |
| `PI` | Ratio of circle circumference to diameter | **3.14159** |
| `E` | Base of natural logarithms | **2.718** |
| `SQRT2` | Square root of 2 | **1.414** |

### Pro Formula Examples

* **Lissajous Resonance:** `Fx: -x`, `Fy: -2.25 * y`, `Fz: sin(t * 0.5) * 5`
* **Hyperbolic Damping:** `Fz: -z * 0.5 + 20 * tanh(sin(t))`
* **Pulsing Vortex:** `Fx: -x * abs(cos(t*0.2))`, `Fy: -y * abs(cos(t*0.2))`
* **Inverse-square Gravity:** `-x / (sqrt(x^2 + y^2 + z^2)^3)`

---

## Technical Optimization

<div align="center">
<img src="https://img.shields.io/badge/Performance-Optimized-00C853?style=flat-square&logo=threedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/Memory%20Leaks-None-FF5252?style=flat-square" />
<img src="https://img.shields.io/badge/Particles-100%2B%20Stable-FFD600?style=flat-square" />
</div>

* **Advanced Function Caching:** Mathematical strings are transformed into executable functions once and cached to avoid the overhead of constant re-parsing.
* **Math Object Injection:** The engine automatically injects the entire JavaScript `Math` context into your formulas, allowing for complex scientific calculations without syntax errors.
* **Direct-Ref Manipulation:** Real-time position updates are performed directly on the Three.js mesh references. This bypasses the React render cycle, maintaining stable RAM usage and high FPS even with 100+ particles.

---

## Directory Architecture

```text
src/
├── App.tsx            # Main app entry
├── gui/               # User interface components
│   ├── GUI.tsx        # Main GUI panel
│   ├── InfoPanel.tsx  # Info and stats
│   └── ParticleEditor.tsx # Particle editor
├── Particula/         # Physics logic
│   ├── Escenario.tsx  # Scenario setup
│   ├── Movimiento.ts  # Movement engine
│   └── Particula.tsx  # Particle definition
├── Utils/             # Visualization and helpers
│   ├── Axes.tsx       # 3D axes
│   ├── ForceArrow.tsx # Force vector rendering
│   └── PhysicsUpdate.tsx # Physics update loop
```

---

## Official Color Palette

| Purpose | Color | Hexadecimal |
| --- | --- | --- |
| Primary |  | `#20232A` |
| Accent |  | `#FFD600` |
| Force Vector |  | `#00C853` |
| Particle Trail |  | `#FF5252` |

---

## License

This project is distributed as open source software. It can be used for educational purposes and personal projects. Enjoy ❤️

---
