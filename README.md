# Fake Ads Arcade (Pixel Edition)

Welcome to the **Fake Ads Arcade**! This project takes those misleading "playable ads" you see on mobile apps and makes them **actually playable**, complete with a retro 8-bit aesthetic.

## 🕹️ Games

### 1. Pull The Pin
A physics-based puzzle game where you must guide balls into a bucket.
*   **Infinite Levels**: Procedurally generated layouts that never repeat.
*   **High Stakes**: Watch out for **Red Bombs**! If they touch your gold or the goal, it's instant Game Over.
*   **Mechanics**: Mix Grey balls with Gold balls to convert them before collecting.

### 2. Math Runner (Action Mode)
An endless runner where you control a crowd of "bonecos" (pixel heroes).
*   **Math Gates**: Pass through gates to Multiply, Add, or Divide your crowd.
*   **Action**: Your crowd automatically shoots projectiles to destroy penalties.
*   **Enemies**:
    *   **Red Chasers**: Active enemies that hunt you down.
    *   **Boss Walls**: Massive health barriers you must destroy.
    *   **Traps**: Spikes and blocks that deplete your crowd count.

## 🎨 Tech Stack
*   **Vite**: Fast build tool and dev server.
*   **Vanilla JS**: No heavy frameworks, just pure game logic.
*   **Pixel Art**: Custom procedural rendering (no external image assets required).

## 🚀 How to Run Locally

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the server**:
    ```bash
    npm run dev
    ```
4.  **Open in Browser**:
    Usually at `http://localhost:5173`

## 📦 Build for Production

To create a static production build (for Netlify, Vercel, etc.):

```bash
npm run build
```

This will generate a `dist` folder containing the optimized game files.

---
*Created by Gabriel Steffens with AI Assistance*
