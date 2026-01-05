# Particle-Simulator
**Particle-Simulator** is a real-time particle simulation and visualization engine built with **React** and **Three.js**. It allows users to define complex trajectories through the dynamic evaluation of mathematical formulas , visualizing force vectors and kinetic trails in a high-performance 3D environment.

---

## Project Motivation (The Lore)

This simulator was not born out of a pure love for science, but as a tool for **academic self-defense**.

**Professor Sánchez is to blame for all this code.** His Physics 2 exams are so absurdly difficult and he crossed the line so many times that there was no other choice but to program this engine to visualize what he expected us to calculate by hand in 90 minutes.

If the exam was a torture, this simulator is the answer. **Thanks for nothing, Sánchez!**

---

## How to use

1. **Define the body:** Set the initial position  and the mass of your particle.
2. **Add the chaos:** Assign forces in the form of functions (e.g., `-x * cos(t)`) or use the kinematic mode to define position equations directly.
3. **Simulate:** Click **START** and watch physics finally make sense.

---

## Syntax and Functions Guide

The engine uses a dynamic evaluation system that supports the following variables and mathematical functions. You can use them in the **Forces (N)** or **Functions f(t)** fields.

### Available Variables

| Variable | Description |
| --- | --- |
| `t` | Elapsed time in seconds. |
| `x`, `y`, `z` | Current position of the particle on that axis. |

### Mathematical Functions

Functions must be written in lowercase:

| Function | Syntax | Example |
| --- | --- | --- |
| **Sine** | `sin(n)` | `10 * sin(t)` |
| **Cosine** | `cos(n)` | `-x * cos(t)` |
| **Tangent** | `tan(n)` | `tan(t * 0.5)` |
| **Square Root** | `sqrt(n)` | `sqrt(x^2 + y^2)` |
| **Power** | `^` or `**` | `x^2` or `x**2` |
| **Exponential** | `exp(n)` | `exp(-t)` |
| **Pi** | `PI` | `sin(t * PI)` |

### Pro Formula Examples:

* **Central Attraction:** `Fx: -x`, `Fy: -y`
* **Spiral Vortex:** `Fx: -y * 2`, `Fy: x * 2`
* **Damped Wave:** `sin(t) * exp(-t * 0.1)`
* **Inverse-square Gravity:** `-x / (sqrt(x^2 + y^2)^3)`

---

## Technical Optimization

Unlike other simulators that suffer from memory leaks, this engine implements:

* **Function Caching:** Formulas are compiled only once into executable functions.
* **Direct-Ref Manipulation:** Real-time position updates are performed directly on the Three.js mesh references, bypassing the React render cycle to maintain stable RAM usage and high FPS.

