// Theminal - Terminal Widget & Theme Toggle
(function() {
  'use strict';

  // ============================================
  // SEARCH FUNCTIONALITY
  // ============================================
  let searchIndex = null;
  const searchResults = document.getElementById('search-results');

  async function loadSearchIndex() {
    if (searchIndex) return searchIndex;
    try {
      const response = await fetch(new URL('index.json', document.baseURI).href);
      searchIndex = await response.json();
      return searchIndex;
    } catch (error) {
      console.error('Failed to load search index:', error);
      return [];
    }
  }

  function performSearch(query) {
    if (!searchIndex || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    return searchIndex.filter(item => {
      const titleMatch = item.title && item.title.toLowerCase().includes(q);
      const contentMatch = item.content && item.content.toLowerCase().includes(q);
      const descMatch = item.description && item.description.toLowerCase().includes(q);
      const tagMatch = item.tags && item.tags.some(tag => tag.toLowerCase().includes(q));
      return titleMatch || contentMatch || descMatch || tagMatch;
    });
  }

  function renderSearchResults(results, query) {
    if (!searchResults) return;

    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="search-header">
          <span class="search-count">0 results</span>
          <span class="search-query">for "${escapeHtml(query)}"</span>
          <button class="search-close" onclick="window.clearSearch()">[x] close</button>
        </div>
        <div class="search-no-results">
          <span class="search-icon">?</span>
          No results found for "<strong>${escapeHtml(query)}</strong>"
        </div>
      `;
    } else {
      searchResults.innerHTML = `
        <div class="search-header">
          <span class="search-count">${results.length} result${results.length === 1 ? '' : 's'}</span>
          <span class="search-query">for "${escapeHtml(query)}"</span>
          <button class="search-close" onclick="window.clearSearch()">[x] close</button>
        </div>
        <div class="search-items">
          ${results.map(item => `
            <a href="${item.url}" class="search-result-item">
              <span class="search-result-title">${highlightMatch(item.title, query)}</span>
              <span class="search-result-date">${item.date || ''}</span>
              ${item.description ? `<span class="search-result-desc">${highlightMatch(item.description, query)}</span>` : ''}
              ${item.tags ? `<span class="search-result-tags">${item.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>` : ''}
            </a>
          `).join('')}
        </div>
      `;
    }
    searchResults.classList.add('visible');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text || '');
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  window.clearSearch = function() {
    if (searchResults) {
      searchResults.classList.remove('visible');
      searchResults.innerHTML = '';
    }
    const input = document.getElementById('terminal-input');
    if (input) input.value = '';
  };

  async function handleSearch(query) {
    await loadSearchIndex();
    const results = performSearch(query);
    renderSearchResults(results, query);
  }

  // ============================================
  // SNAKE GAME
  // ============================================
  const snakeGameContainer = document.getElementById('snake-game');
  let snakeGame = null;

  function createSnakeGame() {
    if (!snakeGameContainer) return null;

    const GRID_WIDTH = 20;
    const GRID_HEIGHT = 15;

    // Level definitions
    const LEVELS = {
      easy: {
        name: 'Easy',
        tickRate: 200,
        obstacles: [],
        description: 'Slow speed'
      },
      medium: {
        name: 'Medium',
        tickRate: 130,
        obstacles: [
          // Small center obstacle
          { x: 9, y: 7 }, { x: 10, y: 7 }
        ],
        description: 'Normal speed'
      },
      hard: {
        name: 'Hard',
        tickRate: 80,
        obstacles: [
          // Center cross
          { x: 10, y: 5 }, { x: 10, y: 6 }, { x: 10, y: 7 }, { x: 10, y: 8 }, { x: 10, y: 9 },
          { x: 8, y: 7 }, { x: 9, y: 7 }, { x: 11, y: 7 }, { x: 12, y: 7 },
          // Corner obstacles
          { x: 3, y: 3 }, { x: 4, y: 3 },
          { x: 16, y: 3 }, { x: 15, y: 3 },
          { x: 3, y: 11 }, { x: 4, y: 11 },
          { x: 16, y: 11 }, { x: 15, y: 11 }
        ],
        description: 'Fast + obstacles'
      }
    };

    let currentLevel = null;
    let showingLevelSelect = true;
    let snake = [];
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let food = { x: 0, y: 0 };
    let obstacles = [];
    let score = 0;
    let gameInterval = null;
    let isGameOver = false;
    let isPaused = false;

    function getHighScore(level) {
      return parseInt(localStorage.getItem('theminal-snake-highscore-' + level) || '0');
    }

    function setHighScore(level, score) {
      localStorage.setItem('theminal-snake-highscore-' + level, score.toString());
    }

    function init() {
      snake = [
        { x: 5, y: 7 },
        { x: 4, y: 7 },
        { x: 3, y: 7 }
      ];
      direction = { x: 1, y: 0 };
      nextDirection = { x: 1, y: 0 };
      score = 0;
      isGameOver = false;
      isPaused = false;
      obstacles = currentLevel ? LEVELS[currentLevel].obstacles : [];
      spawnFood();
      render();
    }

    function selectLevel(level) {
      currentLevel = level;
      showingLevelSelect = false;
      init();
      startGame();
    }

    function showLevelSelection() {
      showingLevelSelect = true;
      currentLevel = null;
      if (gameInterval) clearInterval(gameInterval);
      gameInterval = null;
      renderLevelSelect();
    }

    function renderLevelSelect() {
      let output = '';

      // Header
      output += '<div class="snake-header">';
      output += '<span class="snake-title">[SNAKE]</span>';
      output += '<span class="snake-score">Select Difficulty</span>';
      output += '<button class="snake-close" onclick="window.closeSnakeGame()">[x] close</button>';
      output += '</div>';

      // Level selection - 3 buttons
      output += '<div class="snake-level-select">';
      output += '<div class="snake-level-buttons">';

      const levelKeys = ['easy', 'medium', 'hard'];
      levelKeys.forEach((key, index) => {
        const level = LEVELS[key];
        const highScore = getHighScore(key);
        output += '<button class="snake-level-btn snake-level-' + key + '" onclick="window.snakeSelectLevel(\'' + key + '\')">';
        output += '<span class="snake-level-name">' + level.name + '</span>';
        output += '<span class="snake-level-desc">' + level.description + '</span>';
        if (highScore > 0) {
          output += '<span class="snake-level-highscore">Best: ' + highScore + '</span>';
        }
        output += '</button>';
      });

      output += '</div>';
      output += '<div class="snake-level-hint">Click to start or press [1] [2] [3]</div>';
      output += '</div>';

      snakeGameContainer.innerHTML = output;
    }

    function spawnFood() {
      do {
        food = {
          x: Math.floor(Math.random() * GRID_WIDTH),
          y: Math.floor(Math.random() * GRID_HEIGHT)
        };
      } while (
        snake.some(seg => seg.x === food.x && seg.y === food.y) ||
        obstacles.some(obs => obs.x === food.x && obs.y === food.y)
      );
    }

    function update() {
      if (isGameOver || isPaused) return;

      direction = nextDirection;
      const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
      };

      // Wall collision
      if (head.x < 0 || head.x >= GRID_WIDTH ||
          head.y < 0 || head.y >= GRID_HEIGHT) {
        gameOver();
        return;
      }

      // Self collision
      if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        gameOver();
        return;
      }

      // Obstacle collision
      if (obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
        gameOver();
        return;
      }

      snake.unshift(head);

      // Food collision
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        spawnFood();
      } else {
        snake.pop();
      }

      render();
    }

    function gameOver() {
      isGameOver = true;
      if (currentLevel && score > getHighScore(currentLevel)) {
        setHighScore(currentLevel, score);
      }
      render();
    }

    function render() {
      let output = '';
      const levelInfo = currentLevel ? LEVELS[currentLevel] : null;
      const highScore = currentLevel ? getHighScore(currentLevel) : 0;

      // Header
      output += '<div class="snake-header">';
      output += '<span class="snake-title">[SNAKE' + (levelInfo ? ' - ' + levelInfo.name : '') + ']</span>';
      output += '<span class="snake-score">Score: ' + score + ' | High: ' + highScore + '</span>';
      output += '<button class="snake-close" onclick="window.closeSnakeGame()">[x] close</button>';
      output += '</div>';

      // Game board
      output += '<div class="snake-board">';
      output += '<pre class="snake-grid">';

      // Top border
      output += '+' + '-'.repeat(GRID_WIDTH * 2) + '+\n';

      for (let y = 0; y < GRID_HEIGHT; y++) {
        output += '|';
        for (let x = 0; x < GRID_WIDTH; x++) {
          const isHead = snake[0].x === x && snake[0].y === y;
          const isBody = snake.slice(1).some(seg => seg.x === x && seg.y === y);
          const isFood = food.x === x && food.y === y;
          const isObstacle = obstacles.some(obs => obs.x === x && obs.y === y);

          if (isHead) {
            output += '<span class="snake-head">@@</span>';
          } else if (isBody) {
            output += '<span class="snake-body">[]</span>';
          } else if (isFood) {
            output += '<span class="snake-food">**</span>';
          } else if (isObstacle) {
            output += '<span class="snake-obstacle">##</span>';
          } else {
            output += '  ';
          }
        }
        output += '|\n';
      }

      // Bottom border
      output += '+' + '-'.repeat(GRID_WIDTH * 2) + '+';
      output += '</pre>';
      output += '</div>';

      // Controls/status
      output += '<div class="snake-controls">';
      if (isGameOver) {
        output += '<span class="snake-gameover">GAME OVER!</span> ';
        output += '<span class="snake-hint snake-hint-desktop">Press [R] restart | [L] levels | [ESC] exit</span>';
      } else if (isPaused) {
        output += '<span class="snake-paused">PAUSED</span> ';
        output += '<span class="snake-hint snake-hint-desktop">Press [P] to resume | [L] levels</span>';
      } else {
        output += '<span class="snake-hint snake-hint-desktop">Arrow keys/WASD | [P] Pause | [L] Levels | [ESC] Exit</span>';
        output += '<span class="snake-hint snake-hint-mobile">Swipe to move</span>';
      }
      output += '</div>';

      // Mobile action buttons only (no directional buttons - using swipe instead)
      output += '<div class="snake-mobile-controls">';
      output += '<div class="snake-btn-actions">';
      if (isGameOver) {
        output += '<button class="snake-btn-action" onclick="window.snakeAction(\'restart\')">Restart</button>';
        output += '<button class="snake-btn-action" onclick="window.snakeAction(\'levels\')">Levels</button>';
        output += '<button class="snake-btn-action" onclick="window.snakeAction(\'close\')">Close</button>';
      } else {
        output += '<button class="snake-btn-action" onclick="window.snakeAction(\'pause\')">' + (isPaused ? 'Resume' : 'Pause') + '</button>';
        output += '<button class="snake-btn-action" onclick="window.snakeAction(\'levels\')">Levels</button>';
        output += '<button class="snake-btn-action" onclick="window.snakeAction(\'close\')">Close</button>';
      }
      output += '</div>';
      output += '</div>';

      snakeGameContainer.innerHTML = output;
    }

    // Swipe gesture detection for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let swipeHandled = false;
    const MIN_SWIPE_DISTANCE = 20;

    function handleTouchStart(e) {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      swipeHandled = false;
    }

    function processSwipe(currentX, currentY) {
      if (isGameOver || isPaused || swipeHandled) return false;

      const deltaX = currentX - touchStartX;
      const deltaY = currentY - touchStartY;

      // Check if swipe distance is sufficient
      if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE && Math.abs(deltaY) < MIN_SWIPE_DISTANCE) {
        return false;
      }

      let changed = false;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0 && direction.x !== -1) {
          nextDirection = { x: 1, y: 0 }; // Right
          changed = true;
        } else if (deltaX < 0 && direction.x !== 1) {
          nextDirection = { x: -1, y: 0 }; // Left
          changed = true;
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && direction.y !== -1) {
          nextDirection = { x: 0, y: 1 }; // Down
          changed = true;
        } else if (deltaY < 0 && direction.y !== 1) {
          nextDirection = { x: 0, y: -1 }; // Up
          changed = true;
        }
      }

      if (changed) {
        swipeHandled = true;
        // Reset start position for potential chained swipes
        touchStartX = currentX;
        touchStartY = currentY;
      }

      return changed;
    }

    function handleTouchMove(e) {
      // Always prevent scrolling while game is visible and active
      if (!isGameOver) {
        e.preventDefault();
      }

      // Process swipe during move for instant response
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (processSwipe(touch.clientX, touch.clientY)) {
          swipeHandled = false; // Allow continuous swipes during drag
        }
      }
    }

    function handleTouchEnd(e) {
      // Also check on touchend in case touchmove didn't fire enough
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        processSwipe(touch.clientX, touch.clientY);
      }
    }

    function setupTouchControls() {
      snakeGameContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
      snakeGameContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
      snakeGameContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    function removeTouchControls() {
      snakeGameContainer.removeEventListener('touchstart', handleTouchStart);
      snakeGameContainer.removeEventListener('touchmove', handleTouchMove);
      snakeGameContainer.removeEventListener('touchend', handleTouchEnd);
    }

    function handleKey(e) {
      if (!snakeGameContainer.classList.contains('visible')) return;

      const key = e.key.toLowerCase();

      // Handle level selection screen
      if (showingLevelSelect) {
        if (['1', '2', '3', 'escape'].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
        }

        const levelKeys = { '1': 'easy', '2': 'medium', '3': 'hard' };
        if (levelKeys[key]) {
          selectLevel(levelKeys[key]);
          return;
        }
        if (key === 'escape') {
          closeGame();
          return;
        }
        return;
      }

      // Prevent default for game keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'p', 'r', 'l', 'escape'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (isGameOver) {
        if (key === 'r') {
          init();
          startGame();
        } else if (key === 'l') {
          showLevelSelection();
        } else if (key === 'escape') {
          closeGame();
        }
        return;
      }

      if (key === 'escape') {
        closeGame();
        return;
      }

      if (key === 'l') {
        showLevelSelection();
        return;
      }

      if (key === 'p') {
        isPaused = !isPaused;
        render();
        return;
      }

      if (isPaused) return;

      // Direction changes (prevent reversing)
      switch (key) {
        case 'arrowup':
        case 'w':
          if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
          break;
        case 'arrowdown':
        case 's':
          if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
          break;
        case 'arrowleft':
        case 'a':
          if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
          break;
        case 'arrowright':
        case 'd':
          if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
          break;
      }
    }

    function startGame() {
      if (gameInterval) clearInterval(gameInterval);
      const tickRate = currentLevel ? LEVELS[currentLevel].tickRate : 150;
      gameInterval = setInterval(update, tickRate);
    }

    function closeGame() {
      if (gameInterval) clearInterval(gameInterval);
      gameInterval = null;
      removeTouchControls();
      snakeGameContainer.classList.remove('visible');
      snakeGameContainer.innerHTML = '';
    }

    // Mobile control handlers
    function setDirection(dir) {
      if (!snakeGameContainer.classList.contains('visible')) return;
      if (isGameOver || isPaused) return;

      switch (dir) {
        case 'up':
          if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
          break;
        case 'down':
          if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
          break;
        case 'left':
          if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
          break;
        case 'right':
          if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
          break;
      }
    }

    function handleAction(action) {
      if (!snakeGameContainer.classList.contains('visible')) return;

      switch (action) {
        case 'pause':
          if (!isGameOver && !showingLevelSelect) {
            isPaused = !isPaused;
            render();
          }
          break;
        case 'restart':
          if (!showingLevelSelect) {
            init();
            startGame();
          }
          break;
        case 'levels':
          showLevelSelection();
          break;
        case 'close':
          closeGame();
          break;
      }
    }

    return {
      start: function() {
        snakeGameContainer.classList.add('visible');
        setupTouchControls();
        showLevelSelection();
      },
      close: closeGame,
      handleKey: handleKey,
      setDirection: setDirection,
      handleAction: handleAction,
      selectLevel: selectLevel,
      isVisible: function() {
        return snakeGameContainer.classList.contains('visible');
      }
    };
  }

  // Initialize snake game if container exists
  if (snakeGameContainer) {
    snakeGame = createSnakeGame();

    // Global key handler for snake game
    document.addEventListener('keydown', function(e) {
      if (snakeGame && snakeGame.isVisible()) {
        snakeGame.handleKey(e);
      }
    }, true);
  }

  // Expose functions globally for buttons
  window.closeSnakeGame = function() {
    if (snakeGame) snakeGame.close();
  };

  window.snakeMove = function(dir) {
    if (snakeGame) snakeGame.setDirection(dir);
  };

  window.snakeAction = function(action) {
    if (snakeGame) snakeGame.handleAction(action);
  };

  window.snakeSelectLevel = function(level) {
    if (snakeGame) snakeGame.selectLevel(level);
  };

  // ============================================
  // THEME TOGGLE
  // ============================================
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle ? themeToggle.querySelector('.theme-icon') : null;

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function setTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theminal-theme', theme);
    updateThemeIcon(theme);
  }

  function updateThemeIcon(theme) {
    if (themeIcon) {
      // Use @ for dark (like a moon/night), * for light (like a sun/star)
      themeIcon.textContent = theme === 'light' ? '*' : '@';
    }
  }

  function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
    // Initialize icon based on current theme
    updateThemeIcon(getCurrentTheme());
  }

  // Global keyboard shortcut for theme toggle (works on all pages)
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    if (e.key === 't' || e.key === 'T') {
      toggleTheme();
    }
  });

  // ============================================
  // MINI TERMINAL WIDGET
  // ============================================
  const input = document.getElementById('terminal-input');
  const suggestions = document.getElementById('terminal-suggestions');

  if (!input || !suggestions) return;

  const suggestionItems = suggestions.querySelectorAll('.suggestion-item');
  let selectedIndex = -1;
  let filteredItems = [];

  function filterSuggestions(query) {
    const normalizedQuery = query.toLowerCase().trim();

    filteredItems = [];
    suggestionItems.forEach((item) => {
      const cmd = item.getAttribute('data-cmd').toLowerCase();
      const desc = item.querySelector('.suggestion-desc').textContent.toLowerCase();

      if (normalizedQuery === '' ||
          cmd.includes(normalizedQuery) ||
          desc.includes(normalizedQuery)) {
        item.style.display = 'flex';
        filteredItems.push(item);
      } else {
        item.style.display = 'none';
      }
    });

    selectedIndex = -1;
    updateSelection();
  }

  function updateSelection() {
    filteredItems.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function executeCommand(item, inputValue) {
    const url = item.getAttribute('data-url');
    const isExternal = item.getAttribute('data-external') === 'true';
    const isSearch = item.getAttribute('data-search') === 'true';

    // Special command: /theme - toggle theme
    const cmd = item.getAttribute('data-cmd');
    if (cmd === '/theme') {
      toggleTheme();
      hideSuggestions();
      input.value = '';
      return;
    }

    // Special command: /snake - start snake game
    if (cmd === '/snake') {
      if (snakeGame) {
        snakeGame.start();
      }
      hideSuggestions();
      input.value = '';
      return;
    }

    // Special command: /search - search articles
    if (isSearch && inputValue) {
      const searchQuery = inputValue.replace(/^\/search\s*/i, '').trim();
      if (searchQuery) {
        handleSearch(searchQuery);
        hideSuggestions();
        return;
      }
    }

    if (isExternal) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  function showSuggestions() {
    suggestions.classList.add('visible');
  }

  function hideSuggestions() {
    suggestions.classList.remove('visible');
  }

  // Event Listeners
  input.addEventListener('focus', function() {
    showSuggestions();
    filterSuggestions(this.value);
  });

  input.addEventListener('blur', function() {
    // Delay hiding to allow click events on suggestions
    setTimeout(hideSuggestions, 150);
  });

  input.addEventListener('input', function() {
    filterSuggestions(this.value);
    showSuggestions();
  });

  input.addEventListener('keydown', function(e) {
    if (!suggestions.classList.contains('visible')) {
      if (e.key === '/' || e.key === 'ArrowDown') {
        showSuggestions();
        filterSuggestions(this.value);
        e.preventDefault();
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (filteredItems.length > 0) {
          selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
          updateSelection();
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (filteredItems.length > 0) {
          selectedIndex = Math.max(selectedIndex - 1, 0);
          updateSelection();
        }
        break;

      case 'Enter':
        e.preventDefault();
        const inputValue = this.value;

        // Check if it's a search command
        if (inputValue.toLowerCase().startsWith('/search ')) {
          const searchItem = Array.from(suggestionItems).find(
            item => item.getAttribute('data-search') === 'true'
          );
          if (searchItem) {
            executeCommand(searchItem, inputValue);
            return;
          }
        }

        if (selectedIndex >= 0 && filteredItems[selectedIndex]) {
          executeCommand(filteredItems[selectedIndex], inputValue);
        } else if (filteredItems.length === 1) {
          executeCommand(filteredItems[0], inputValue);
        } else {
          // Try to match exact command
          const value = inputValue.toLowerCase().trim();
          const exactMatch = Array.from(suggestionItems).find(
            item => item.getAttribute('data-cmd').toLowerCase() === value
          );
          if (exactMatch) {
            executeCommand(exactMatch, inputValue);
          }
        }
        break;

      case 'Escape':
        hideSuggestions();
        this.blur();
        break;

      case 'Tab':
        if (filteredItems.length > 0 && selectedIndex >= 0) {
          e.preventDefault();
          const cmd = filteredItems[selectedIndex].getAttribute('data-cmd');
          this.value = cmd;
          filterSuggestions(cmd);
        }
        break;
    }
  });

  // Click on suggestion
  suggestionItems.forEach((item) => {
    item.addEventListener('click', function() {
      executeCommand(this);
    });

    item.addEventListener('mouseenter', function() {
      selectedIndex = filteredItems.indexOf(this);
      updateSelection();
    });
  });

  // Global keyboard shortcut for terminal focus (only when terminal exists)
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Press / to focus terminal
    if (e.key === '/') {
      e.preventDefault();
      input.focus();
      input.value = '/';
      filterSuggestions('/');
      showSuggestions();
    }
  });
})();
