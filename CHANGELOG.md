# Changelog

All notable changes to Timeline App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2025-05-11

### Added
- 🎯 Floating timeline window with multi-line support
- 🎨 Glassmorphism design with adjustable transparency (0–100%)
- ⏱ Timeline rendering with date-proportional node placement
- 📍 "Today" yellow vertical line marker
- ✅ Click-to-toggle completion state on nodes
- 📝 Modal editor for node title, date, color, and notes
- 🎨 5 color themes (default / pink / green / yellow / purple)
- 🪟 Always-on-top toggle (📌 button)
- 🖱 Drag anywhere when not pinned
- 💾 Local persistence via `data.json` (no cloud)
- 📦 One-click `.command` installer with auto-backup
- 📐 Auto-arrange overlapping nodes (alternating up/down labels)
- 🎬 Hover tooltips for full node names (300ms delay)
- 🗑 Inline delete with 4-second auto-cancel confirmation

### Technical
- Built with Electron 28
- Zero build step — vanilla HTML/CSS/JS
- IPC via `contextBridge` for security
- macOS-optimized: `transparent`, `frame: false`, `vibrancy`

<!-- ## [Unreleased] -->
<!-- ### Added -->
<!-- ### Changed -->
<!-- ### Fixed -->
