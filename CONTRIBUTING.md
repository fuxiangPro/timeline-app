# Contributing to Timeline App

First off, thanks for taking the time to contribute! 💖

The following is a set of guidelines for contributing to Timeline App. These are mostly guidelines, not rules — use your best judgment.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/fuxiangPro/timeline-app/issues) — your bug may already be reported.

Use the [Bug Report template](https://github.com/fuxiangPro/timeline-app/issues/new?template=bug_report.yml) and include:

- Clear and descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots / screen recordings
- macOS version and Node.js version

### ✨ Suggesting Features

Open a [Feature Request issue](https://github.com/fuxiangPro/timeline-app/issues/new?template=feature_request.yml). Describe:

- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered
- Mockups or examples if applicable

### 🔧 Pull Requests

1. **Fork** the repo
2. **Create** a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make** your changes
4. **Test** thoroughly — run `npm start` and verify the app works
5. **Commit** with [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation only
   - `style:` formatting (no code change)
   - `refactor:` code change that's neither a fix nor a feature
   - `perf:` performance improvement
   - `test:` adding tests
   - `chore:` maintenance
6. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open** a Pull Request against `main`

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/timeline-app.git
cd timeline-app

# Install dependencies
npm install

# Start in dev mode
npm run dev
```

### Code Style

- 2-space indentation (enforced by `.editorconfig`)
- Use `const` / `let`, never `var`
- Prefer arrow functions
- Use template literals over string concatenation
- Comment complex logic in **English** for international contributors

### Known Pitfalls

See the bottom of `CONTRIBUTING.md` and `style.css` comments for known macOS Electron pitfalls:

- **滚动残影**: `#content` must have non-transparent background
- **backdrop-filter**: Keep on `#blur-bg`, not on `#app`
- **Enter key**: Modal buttons must have `type="button"`
- **Window layering**: macOS doesn't support always-on-bottom interactive windows

## Code of Conduct

This project adheres to the [Contributor Covenant](./CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## Questions?

Open a [Discussion](https://github.com/fuxiangPro/timeline-app/discussions) — we're happy to help!
