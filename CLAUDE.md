# Theminal - Hugo Theme

A terminal-inspired Hugo theme for developer blogs. Mimics a terminal window with interactive command-line navigation.

## Project Structure

```
/
├── content/
│   ├── articles/          # Blog posts
│   └── resume/            # Resume page (_index.md)
├── themes/theminal/
│   ├── assets/
│   │   ├── css/main.css   # All styles (1000+ lines, CSS variables)
│   │   └── js/terminal.js # Search, theme toggle, terminal widget
│   ├── layouts/
│   │   ├── _default/
│   │   │   └── index.json # Search index generator
│   │   ├── _partials/
│   │   │   ├── mini-terminal.html  # Command input widget
│   │   │   ├── tabs.html           # Navigation tabs
│   │   │   ├── head.html           # Meta, OG, RSS
│   │   │   └── scripts.html        # JS loading
│   │   ├── articles/      # Article templates
│   │   ├── resume/        # Resume template
│   │   ├── baseof.html    # Base wrapper (terminal window)
│   │   └── home.html      # Homepage
│   └── archetypes/        # Content templates
├── hugo.toml              # Site configuration
└── .github/workflows/deploy.yml  # GitHub Pages deployment
```

## Key Features

- **Terminal Window UI**: Terminal-style window with title bar, controls, tabs
- **Mini Terminal Widget**: Interactive command input with autocomplete
- **Client-side Search**: JSON index, searches title/content/tags/description
- **Theme Toggle**: Dark/light themes, `t` key shortcut, localStorage persistence
- **Keyboard Navigation**: `/` to focus terminal, arrows for suggestions, Tab to complete

## Built-in Commands

- `/home`, `/articles`, `/resume` - Navigation
- `/search <query>` - Search articles
- `/theme` - Toggle dark/light
- `/github`, `/x`, `/linkedin`, `/email` - Social links (if configured)

## Configuration (hugo.toml)

Key params:
```toml
[params]
  defaultTheme = "dark"
  author = "Name"
  role = "Title"
  promptUser = "visitor"
  promptHost = "blog"
  welcome = "Welcome message"
  asciiArt = '''ASCII banner'''
  recentArticlesCount = 5
  syntaxHighlighting = true

  [params.social]
    github = "username"
    x = "username"

  # Custom commands
  [[params.commands]]
    name = "portfolio"
    url = "https://..."
    description = "Description"
    external = true

  # Custom tabs
  [[params.tabs]]
    name = "projects"
    url = "/projects/"
    icon = "*"
```

## Development

```bash
hugo server              # Local dev at localhost:1313
hugo new articles/post.md  # New article
```

## Important Technical Details

1. **Search Index**: Generated at `/index.json` via `layouts/_default/index.json`
2. **Base URL Handling**: Use `document.baseURI` or Hugo's `absURL` for paths (subdirectory deployment support)
3. **CSS Theming**: CSS variables in `:root` (dark) and `[data-theme="light"]`
4. **No Build Tools**: Pure HTML/CSS/JS, no npm/webpack
5. **Asset Pipeline**: Hugo handles minification and fingerprinting

## Common Tasks

### Adding a new command
Edit `themes/theminal/layouts/_partials/mini-terminal.html` or use `[[params.commands]]` in hugo.toml

### Modifying styles
Edit `themes/theminal/assets/css/main.css` - variables at top, organized by component

### Changing terminal behavior
Edit `themes/theminal/assets/js/terminal.js`:
- Search: `loadSearchIndex()`, `performSearch()`, `renderSearchResults()`
- Theme toggle: `getCurrentTheme()`, `setTheme()`, `toggleTheme()`
- Terminal widget: `filterSuggestions()`, `executeCommand()`, event listeners

### Adding a new content type
1. Create archetype in `themes/theminal/archetypes/`
2. Create layout in `themes/theminal/layouts/<type>/`
3. Add content in `content/<type>/`

## Deployment

GitHub Actions workflow deploys to GitHub Pages on push to `main`. Hugo version: 0.152.2 extended.

## Gotchas

- Paths must respect `baseURL` for subdirectory deployments (use `absURL` in templates, `document.baseURI` in JS)
- Search loads `/index.json` - ensure JSON output is enabled in hugo.toml
- Theme preference stored in `localStorage` key `theminal-theme`
