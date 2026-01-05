# Particle-Simulator

**Particle-Simulator** is a real-time particle simulation and visualization engine built with **React** and **Three.js**. It allows users to define complex trajectories through the dynamic evaluation of mathematical formulas, visualizing force vectors and kinetic trails in a high-performance 3D environment.

---

## Project Motivation (The Lore)

This simulator was not born out of a pure love for science, but as a tool for **academic self-defense**.

**Professor Sánchez is to blame for all this code.** His Physics 2 exams are so absurdly difficult and he crossed the line so many times that there was no other choice but to program this engine to visualize what he expected us to calculate by hand in 90 minutes.

If the exam was a torture, this simulator is the answer. **Thanks for nothing, Sánchez!**

---

## How to use

1. **Define the body:** Set the initial position and the mass of your particle.
2. **Add the chaos:** Assign forces in the form of functions or use the kinematic mode to define position equations directly.
3. **Simulate:** Click **START** and watch physics finally make sense.

---

## Syntax and Functions Guide

The engine uses a dynamic evaluation system that supports the following variables and a wide array of mathematical functions from the JavaScript `Math` library. You can use them in the **Forces (N)** or **Functions f(t)** fields.

### Available Variables

| Variable | Description |
| --- | --- |
| `t` | Elapsed time in seconds. |
| `x`, `y`, `z` | Current position of the particle on that axis. |

### Mathematical Functions

The simulator now supports the full standard `Math` library suite. All functions must be written in lowercase:

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

### Pro Formula Examples:

* **Lissajous Resonance:** `Fx: -x`, `Fy: -2.25 * y`, `Fz: sin(t * 0.5) * 5`.
* **Hyperbolic Damping:** `Fz: -z * 0.5 + 20 * tanh(sin(t))`.
* **Pulsing Vortex:** `Fx: -x * abs(cos(t*0.2))`, `Fy: -y * abs(cos(t*0.2))`.
* **Inverse-square Gravity:** `-x / (sqrt(x^2 + y^2 + z^2)^3)`.

---

## Technical Optimization

Unlike other simulators that suffer from memory leaks and performance drops, this engine implements:

* **Advanced Function Caching:** Mathematical strings are transformed into executable functions once and cached to avoid the overhead of constant re-parsing.
* **Math Object Injection:** The engine automatically injects the entire JavaScript `Math` context into your formulas, allowing for complex scientific calculations without syntax errors.
* **Direct-Ref Manipulation:** Real-time position updates are performed directly on the Three.js mesh references. This bypasses the React render cycle, maintaining stable RAM usage and high FPS even with 100+ particles.

