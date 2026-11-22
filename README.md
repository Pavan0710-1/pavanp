# Pavan Patel — Web Designer & Creative Developer

[![Website](https://img.shields.io/badge/Website-pavanp.me-ff3d2e.svg)](https://pavanp.me/)
[![Location](https://img.shields.io/badge/Location-Sydney%2C%20Australia-ffb020.svg)](https://pavanp.me/#/about)
[![Stack](https://img.shields.io/badge/Stack-Vanilla%20HTML5%20%7C%20CSS3%20%7C%20Three.js%20%7C%20Web%20Audio-55e6ff.svg)](https://pavanp.me/#/features)
[![License](https://img.shields.io/badge/License-MIT-4fe08a.svg)](neon-velocity/LICENSE)

> Hand-crafted, search-friendly websites, technical SEO, and interactive 3D web experiences designed and built in Sydney, NSW.

---

## 🌟 Overview

[pavanp.me](https://pavanp.me/) is the personal portfolio, creative laboratory, and interactive showcase of **Pavan Patel**, a web designer and developer based in Sydney, Australia.

The site is built with a commitment to **performance, accessibility, visual distinction, and client ownership**:
- **Speed First:** Lightweight budgets, zero framework overhead, and instant transitions.
- **Search-Friendly:** Semantic HTML5, structured data (Schema.org JSON-LD), per-page metadata, and generative engine discovery via `llms.txt`.
- **Sensory Craft:** Custom Three.js 3D scenes, WebGL shaders, kinetic typography, and opt-in generative Web Audio music stations that react to page scroll.
- **Client Ownership:** Hand-coded source code that clients own completely, without proprietary website builders or recurring subscription locks.

---

## 🎮 Playable Games Hub

The website features four distinct in-browser games and interactive 3D experiences:

| Game | Tech & Engine | Description | Play Mode |
| :--- | :--- | :--- | :--- |
| **Packet Run** | Three.js (WebGL) + Web Audio | A 3D cyberpunk network runner. Dodge firewalls, collect bytes, charge shields, and trigger ping dashes through data streams. | Built into `index.html` (`data-play="packet"` or `#/packet-run`) |
| **Bug Storm** | Canvas 2D + Procedural Synth | Fast-paced top-down arcade action shooter. Squash swarms of web bugs, collect experience gems, pick rogue-lite upgrade cards, and defeat the Memory Leak boss. | Built into `index.html` (`data-play="bug"` or `#/bug-storm`) |
| **NIGHTLINE** | Three.js 0.170 + PWA Cache | A GTA & Spider-Man inspired 3D open-world city. Web-swing from skyscrapers, steal cars, customize vehicles, fly choppers, and complete missions. | Standalone in `opencity/index.html` |
| **Neon Velocity** | WebGL 3D + Synthwave FX | High-speed futuristic anti-gravity street racing with hover ships, garage skin customizer, plasma missiles, and drift mechanics. | Standalone in `neon-velocity/index.html` |

---

## 🛠️ Features & Interactive Tools

- **Explore 3D Mode (`#/explore`):** A first-person fly-through 3D world with WASD / touch controls, searching for five hidden design signals.
- **The Lab (`#/lab`):** Five free browser-based developer & designer utilities:
  1. *Google SERP Snippet Previewer* — Live visual search result simulator.
  2. *WCAG Contrast Checker* — Real-time AA/AAA color ratio evaluator.
  3. *Type Scale Generator* — Modular typographic scale and CSS export.
  4. *Palette Harmony Maker* — Dynamic palette generator based on color theory.
  5. *Pocket Synthesizer* — Playable Web Audio keyboard with multiple waveforms and scales.
- **Scope Planner (`#/plan`):** Interactive project scope estimator for clients to outline page counts, feature complexity, and design goals.
- **Interactive Pre-Launch Checklist (`#/process`):** 15-point launch audit with persistent browser progress tracking.
- **Theme Switcher & Accessibility:** Five color skins (Obsidian, Cyberpunk, Forest, Amber, Neon), readable font options, reduced-motion controls, and sound preferences.
- **Command Palette (`Ctrl + K` or `/`):** Instant search, quick navigation, sound toggling, and secret cheat codes.
- **Typing Commands:** Type `run`, `packet`, `bug`, `storm`, `race`, `city`, `explore`, or `theme` anywhere on the site outside text fields.

---

## 📁 Repository Structure

```text
pavanp-main/
├── index.html              # Main single-file portfolio, pages, Packet Run 3D & Bug Storm 2D
├── assets/
│   └── commands.js         # Secret keypress commands & mobile quick-palette handler
├── opencity/               # NIGHTLINE: 3D open-world city game (Three.js PWA)
│   ├── index.html          # Game launcher & start screen with back navigation
│   ├── js/                 # Modular game engines: physics, vehicles, weapons, missions
│   └── manifest.json       # Progressive Web App manifest & offline service worker
├── neon-velocity/          # Neon Velocity: Futuristic WebGL racing game
│   ├── index.html          # Racing game interface & garage
│   ├── nv-items.js         # Garage, skins, weapons (EMP, Plasma, Warp)
│   ├── nv-fx.js            # Particle systems, synthwave audio, camera dynamics
│   └── bkcore/             # Core 3D engine and shaders
├── robots.txt              # Search engine & AI crawler access rules
├── sitemap.xml             # Complete sitemap with all core pages and games
├── llms.txt                # AI Engine & Generative Engine Optimization (GEO) spec
├── og-image.png            # 1200x630 Open Graph preview card for social sharing
├── favicon.png             # 512x512 high-res brand icon
├── favicon.svg             # Scalable SVG brand icon
├── favicon.ico             # Multi-size Windows & browser icon
└── apple-touch-icon.png    # 180x180 iOS home screen icon
```

---

## 🚀 Local Development

To run the site and games locally:

```bash
# Clone the repository
git clone https://github.com/Pavan0710-1/pavanp.git
cd pavanp

# Start a local static file server using Python 3
python3 -m http.server 8080
```

Open **`http://localhost:8080`** in your browser.

- Visit **`http://localhost:8080/#/games`** to view all four games.
- Direct game links:
  - `http://localhost:8080/#/packet-run`
  - `http://localhost:8080/#/bug-storm`
  - `http://localhost:8080/opencity/index.html`
  - `http://localhost:8080/neon-velocity/index.html`

---

## 📬 Contact & Inquiries

- **Author:** Pavan Patel
- **Website:** [https://pavanp.me](https://pavanp.me)
- **Email:** [hello@pavanp.me](mailto:hello@pavanp.me)
- **Location:** Sydney, New South Wales, Australia
