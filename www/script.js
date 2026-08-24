// نجوم البازل - نسخة موحدة تحتوي على جميع الأنظمة (مستويات عادية، نجوم، نقاط، تحديات، متجر، مكافآت)
const STORAGE_KEY = 'puzzleGameState';

// ========== حالة اللعبة ==========
let state = loadState() || createInitialState();
let currentPage = 0;
let currentLevel = null;
let puzzleGridSize = 3;
let puzzleArr = [];
let timerInterval = null;
let botInterval = null;
let moveCount = 0;
let boardSize = 0;
let currentTimeRemaining = 0;
let botPaused = false;
let timerPaused = false;
let modalPause = false;
let botPuzzleArr = [];
let botWrongCount = 0;
let currentChallenge = null;
let dragSource = null;
let extraTab = 'stars';

// ========== دالة الاهتزاز ==========
function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

// ========== الحالة الابتدائية ==========
function createInitialState() {
    return {
        points: 0,
        levels: {},                     // المستويات العادية
        starLevels: {},                 // مستويات النجوم (لكل صفحة)
        pointLevels: { easy: {}, medium: {}, hard: {} }, // مستويات النقاط المشتراة
        bonusLevels: {},                // المكافآت التراكمية
        achievements: {},               // الإنجازات
        challengeCoins: 0,
        dailyTickets: { date: new Date().toISOString().slice(0, 10), count: 5 },
        theme: 'dark',
        assists: { shuffle: 1, magnet: 1, freeze: 1 },
        stats: { completed: 0, threeStars: 0, fastest: 999999, challengesWon: 0, bonusCompleted: 0 }
    };
}

// ========== الحفظ والتحميل ==========
function loadState() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
        return null;
    }
}

function saveState() {
    state.lastSaved = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateDailyTickets() {
    const today = new Date().toISOString().slice(0, 10);
    if (!state.dailyTickets || state.dailyTickets.date !== today) {
        state.dailyTickets = { date: today, count: 5 };
        saveState();
    }
}

// ========== الثيم ==========
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    state.theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    saveState();
}

// ========== عرض النقاط ==========
function updatePointsDisplay() {
    const p = state.points;
    const c = state.challengeCoins;
    ['homePoints', 'extraPoints', 'bonusPoints', 'storePoints'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = `💎 ${p}`;
    });
    document.getElementById('challengePoints').textContent = `💰 ${c}`;
    document.getElementById('ticketCount').textContent = state.dailyTickets.count;
}

// ========== عرض الشاشات ==========
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    updatePointsDisplay();
    if (id === 'gameScreen') updateAssistButtons();
}

function backToHome() {
    clearIntervals();
    currentLevel = null;
    showScreen('homeScreen');
    renderMainGrid();
}

function exitGame() {
    clearIntervals();
    showModal(`
        <h2>الخروج من المرحلة؟</h2>
        <p>التقدم الحالي في المرحلة سيضيع.</p>
        <button class="modal-btn" onclick="closeModal();backToHome()">نعم، خروج</button>
        <button class="modal-btn secondary" onclick="closeModal()">إلغاء</button>
    `);
}

// ========== إدارة النوافذ ==========
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    const pc = document.getElementById('puzzleContainer');
    if (pc) pc.classList.remove('blurred');
    modalPause = false;
}

function showModal(html) {
    const pc = document.getElementById('puzzleContainer');
    const gameActive = document.getElementById('gameScreen') && !document.getElementById('gameScreen').classList.contains('hidden');
    if (pc && currentLevel && gameActive) {
        pc.classList.add('blurred');
        modalPause = true;
    }
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

// ========== المساعدات ==========
function updateAssistButtons() {
    document.getElementById('shuffleCount').textContent = state.assists.shuffle || 0;
    document.getElementById('magnetCount').textContent = state.assists.magnet || 0;
    document.getElementById('freezeCount').textContent = state.assists.freeze || 0;
    const stopBtn = document.getElementById('stopCount');
    if (stopBtn) stopBtn.textContent = state.assists.freeze || 0;
}

function showBuyAssist(type) {
    if (!currentLevel) return;
    const items = {
        shuffle: { icon: '🔀', name: 'خلط', cost: 5 },
        magnet: { icon: '🧲', name: 'مغناطيس', cost: 15 },
        freeze: { icon: '❄️', name: 'تجميد', cost: 10 }
    };
    const item = items[type];
    showModal(`
        <h3>${item.icon} ${item.name}</h3>
        <p>لا تملك ${item.name}.</p>
        <p>السعر: ${item.cost}💎</p>
        <button class="modal-btn" onclick="buyAssist('${type}',${item.cost})">شراء</button>
        <button class="modal-btn secondary" onclick="closeModal()">إلغاء</button>
    `);
}

function buyAssist(type, cost) {
    if (state.points >= cost) {
        state.points -= cost;
        state.assists[type] = (state.assists[type] || 0) + 1;
        saveState();
        updatePointsDisplay();
        updateAssistButtons();
        closeModal();
    } else {
        showModal(`
            <h3>لا يوجد مال كفاية</h3>
            <button class="modal-btn" onclick="closeModal()">موافق</button>
        `);
    }
}

// ========== الصور والمستويات ==========
function getImageUrl(seed) {
    return `https://picsum.photos/seed/${encodeURIComponent(seed)}/720/960`;
}

function getLevelKey(page, index) {
    return `${page}-${index}`;
}

function getLevelType(index) {
    return index % 5 === 4 ? 'medium' : 'easy';
}

function getGridSizeByType(type) {
    return type === 'easy' ? 4 : type === 'medium' ? 6 : type === 'hard' ? 8 : 3;
}

function getLevelTime(type) {
    return type === 'easy' ? 60 : type === 'medium' ? 120 : type === 'hard' ? 180 : 45;
}

function getLevelRewards(type) {
    return type === 'easy' ? [20, 15, 10, 5] : type === 'medium' ? [40, 30, 20, 10] : [80, 60, 40, 20];
}

// ========== عرض شبكة المستويات الرئيسية ==========
function renderMainGrid() {
    const grid = document.getElementById('mainGrid');
    grid.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const key = getLevelKey(currentPage, i);
        if (!state.levels[key]) {
            state.levels[key] = {
                stars: 0,
                completed: false,
                unlocked: false,
                imageUrl: getImageUrl(`page${currentPage}level${i}`)
            };
        }
        const level = state.levels[key];
        const unlocked = (currentPage === 0 && i === 0) ||
            (i > 0 && !!state.levels[getLevelKey(currentPage, i - 1)]?.completed) ||
            (i === 0 && !!state.levels[getLevelKey(currentPage - 1, 24)]?.completed);
        level.unlocked = unlocked;

        const card = document.createElement('div');
        card.className = 'card' + (!unlocked ? ' locked' : '') + (level.completed ? ' completed' : '');
        if (!unlocked) {
            card.innerHTML = '🔒';
        } else if (level.completed) {
            card.innerHTML = '⭐'.repeat(level.stars);
        } else {
            card.textContent = getLevelType(i) === 'easy' ? '4×4' : '6×6';
        }
        card.onclick = () => onLevelClick(i);

        let longPressTimer;
        card.addEventListener('touchstart', () => {
            if (level.completed) {
                longPressTimer = setTimeout(() => showPreview(key), 500);
            }
        }, { passive: true });
        card.addEventListener('touchend', () => clearTimeout(longPressTimer));
        card.addEventListener('touchmove', () => clearTimeout(longPressTimer));

        grid.appendChild(card);
    }
    document.getElementById('pageIndicator').textContent = `صفحة ${currentPage + 1}`;
    saveState();
}

function changePage(delta) {
    if (delta > 0) {
        const lastKey = getLevelKey(currentPage, 24);
        if (!state.levels[lastKey]?.completed) {
            showModal(`
                <h3>أكمل المستوى 25 أولاً</h3>
                <button class="modal-btn" onclick="closeModal()">حسنًا</button>
            `);
            return;
        }
    }
    currentPage = Math.max(0, currentPage + delta);
    renderMainGrid();
}

function onLevelClick(index) {
    const key = getLevelKey(currentPage, index);
    const level = state.levels[key];
    if (!level.unlocked) return;
    if (level.completed && level.stars === 3) {
        showPreview(key);
        return;
    }
    const type = getLevelType(index);
    startLevel({
        type: 'normal',
        page: currentPage,
        index: index,
        size: getGridSizeByType(type),
        time: getLevelTime(type),
        key: key,
        imageUrl: level.imageUrl
    });
}

// ========== بدء المستوى ==========
function startLevel(config) {
    clearIntervals();
    currentLevel = config;
    puzzleGridSize = config.size;
    moveCount = 0;
    currentTimeRemaining = config.time || 0;
    botPaused = false;
    timerPaused = false;
    modalPause = false;

    document.getElementById('gameMoves').style.display = config.isBonus ? 'inline' : 'none';
    document.getElementById('gameTimer').style.display = (config.isBonus || config.noTimer) ? 'none' : 'inline';
    document.getElementById('freezeBtn').style.display = (config.isBonus || config.noTimer || config.isPointLevel) ? 'none' : 'inline-flex';
    document.getElementById('stopOpponentBtn').style.display = config.isChallenge ? 'inline-flex' : 'none';
    document.getElementById('challengeStats').innerHTML = config.isChallenge ? `
        <div>أنت: <span id="playerWrong">0</span> قطع خاطئة</div>
        <div>الخصم: <span id="botWrong">0</span> قطع خاطئة</div>
    ` : '';

    boardSize = Math.min(window.innerWidth * 0.9, 500);
    const c = document.getElementById('puzzleContainer');
    c.style.width = boardSize + 'px';
    c.style.height = boardSize + 'px';
    setupPuzzle(config.size, config.imageUrl);
    showScreen('gameScreen');
    updateMovesDisplay();

    if (config.isChallenge) {
        botPuzzleArr = [...puzzleArr];
        botWrongCount = countWrongTilesFromArr(botPuzzleArr);
        startTimer(config.time);
        startBot();
        updateChallengeDisplay();
    } else if (!config.isBonus && !config.noTimer) {
        startTimer(config.time);
    }
    renderStars(3);
}

// ========== إعداد اللغز ==========
function setupPuzzle(gridSize, imageUrl) {
    const container = document.getElementById('puzzleContainer');
    container.innerHTML = '';
    const total = gridSize * gridSize;
    const tileSize = boardSize / gridSize;
    const correct = Array.from({ length: total }, (_, i) => i);
    do {
        puzzleArr = [...correct];
        for (let i = puzzleArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [puzzleArr[i], puzzleArr[j]] = [puzzleArr[j], puzzleArr[i]];
        }
    } while (isSolved(puzzleArr));

    for (let pos = 0; pos < total; pos++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.style.width = tileSize + 'px';
        tile.style.height = tileSize + 'px';
        tile.style.backgroundImage = `url('${imageUrl}')`;
        tile.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
        tile.dataset.correctIndex = String(puzzleArr[pos]);
        tile.dataset.pos = String(pos);
        positionTile(tile, puzzleArr[pos]);
        addTileEvents(tile);
        container.appendChild(tile);
    }
    updateWrongDisplay();
    lockCorrectTiles();
}

function positionTile(tile, correctIndex) {
    const r = Math.floor(correctIndex / puzzleGridSize);
    const c = correctIndex % puzzleGridSize;
    const x = (c / (puzzleGridSize - 1)) * 100;
    const y = (r / (puzzleGridSize - 1)) * 100;
    tile.style.left = (Number(tile.dataset.pos) % puzzleGridSize) * (100 / puzzleGridSize) + '%';
    tile.style.top = Math.floor(Number(tile.dataset.pos) / puzzleGridSize) * (100 / puzzleGridSize) + '%';
    tile.style.backgroundPosition = `${x}% ${y}%`;
}

function addTileEvents(tile) {
    tile.addEventListener('pointerdown', e => {
        if (tile.classList.contains('locked')) return;
        e.preventDefault();
        dragSource = tile;
        tile.classList.add('dragging');
        try { tile.setPointerCapture(e.pointerId); } catch (_) {}
    });
    tile.addEventListener('pointerup', e => {
        if (!dragSource) return;
        e.preventDefault();
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
        dragSource.classList.remove('dragging');
        if (el && el !== dragSource && !el.classList.contains('locked')) {
            swapTiles(dragSource, el);
        }
        dragSource = null;
    });
    tile.addEventListener('pointercancel', () => {
        if (dragSource) dragSource.classList.remove('dragging');
        dragSource = null;
    });
}

function swapTiles(a, b) {
    if (a.classList.contains('locked') || b.classList.contains('locked')) return;
    const pa = Number(a.dataset.pos);
    const pb = Number(b.dataset.pos);
    [puzzleArr[pa], puzzleArr[pb]] = [puzzleArr[pb], puzzleArr[pa]];
    a.dataset.pos = String(pb);
    b.dataset.pos = String(pa);
    positionTile(a, puzzleArr[pb]);
    positionTile(b, puzzleArr[pa]);
    moveCount++;
    updateMovesDisplay();
    updateWrongDisplay();
    lockCorrectTiles();
    if (isSolved(puzzleArr)) finishLevel(true);
}

function lockCorrectTiles() {
    document.querySelectorAll('.tile').forEach(tile => {
        const pos = Number(tile.dataset.pos);
        const correct = Number(tile.dataset.correctIndex);
        const isCorrect = pos === correct;
        const wasLocked = tile.classList.contains('locked');
        tile.classList.toggle('locked', isCorrect);
        if (isCorrect && !wasLocked) vibrate(30);
        let isMerged = false;
        if (isCorrect) {
            const row = Math.floor(pos / puzzleGridSize);
            const col = pos % puzzleGridSize;
            const neighbors = [
                { r: row - 1, c: col }, { r: row + 1, c: col },
                { r: row, c: col - 1 }, { r: row, c: col + 1 }
            ];
            for (const n of neighbors) {
                if (n.r < 0 || n.r >= puzzleGridSize || n.c < 0 || n.c >= puzzleGridSize) continue;
                const nPos = n.r * puzzleGridSize + n.c;
                const neighborTile = document.querySelector(`.tile[data-pos="${nPos}"]`);
                if (neighborTile && Number(neighborTile.dataset.correctIndex) === nPos) {
                    isMerged = true;
                    break;
                }
            }
        }
        tile.classList.toggle('merged', isMerged);
    });
}

function isSolved(arr) {
    return arr.every((v, i) => v === i);
}

function countWrongTilesFromArr(arr) {
    return arr.reduce((n, v, i) => n + (v !== i ? 1 : 0), 0);
}

function updateWrongDisplay() {
    if (currentLevel?.isChallenge) {
        const p = countWrongTilesFromArr(puzzleArr);
        document.getElementById('playerWrong').textContent = p;
        document.getElementById('botWrong').textContent = botWrongCount;
    }
}

function updateMovesDisplay() {
    document.getElementById('gameMoves').textContent = `حركات: ${moveCount}`;
}

function renderStars(stars) {
    document.getElementById('gameStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
}

// ========== المؤقت ==========
function startTimer(seconds) {
    currentTimeRemaining = seconds;
    updateTimerDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timerPaused || modalPause) return;
        currentTimeRemaining--;
        updateTimerDisplay();
        if (currentTimeRemaining <= 0) {
            clearIntervals();
            finishLevel(false, true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById('gameTimer').textContent = `⏱ ${Math.max(0, currentTimeRemaining)}`;
    const ratio = currentLevel?.time ? currentTimeRemaining / currentLevel.time : 1;
    renderStars(ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1);
}

function calculateStars() {
    if (currentLevel.isBonus || currentLevel.noTimer) return 3;
    const ratio = currentTimeRemaining / currentLevel.time;
    return ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
}

function clearIntervals() {
    if (timerInterval) clearInterval(timerInterval);
    if (botInterval) clearInterval(botInterval);
    timerInterval = botInterval = null;
}

// ========== إنهاء المستويات ==========
function finishLevel(won, timedOut = false) {
    if (!currentLevel) return;
    clearIntervals();

    if (currentLevel.isChallenge) {
        finishChallenge(won);
        return;
    }

    if (!won) {
        showModal(`
            <h2>انتهى الوقت</h2>
            <p>حاول مرة أخرى.</p>
            <button class="modal-btn" onclick="closeModal();restartCurrentLevel()">إعادة المحاولة</button>
            <button class="modal-btn secondary" onclick="closeModal();backToHome()">خروج</button>
        `);
        return;
    }

    const stars = calculateStars();

    // مستويات النجوم
    if (currentLevel.isStarLevel) {
        const page = currentLevel.page;
        const entry = state.starLevels[page] || { completed: false, stars: 0 };
        if (!entry.completed) {
            entry.completed = true;
            entry.stars = Math.max(entry.stars || 0, stars);
            state.starLevels[page] = entry;
            const rewards = [80, 60, 40, 20];
            state.points += rewards[stars - 1];
            saveState();
            showModal(`
                <h2 class="success">أحسنت!</h2>
                <div style="font-size:2em">${'⭐'.repeat(stars)}</div>
                <p>حصلت على ${rewards[stars - 1]}💎</p>
                <button class="modal-btn" onclick="closeModal();backToHome()">متابعة</button>
            `);
        } else {
            showModal(`
                <h2>لقد أكملت هذا المستوى بالفعل</h2>
                <button class="modal-btn" onclick="closeModal();backToHome()">حسنًا</button>
            `);
        }
        return;
    }

    // مستويات النقاط
    if (currentLevel.isPointLevel) {
        const category = currentLevel.pointCategory;
        const index = currentLevel.pointIndex;
        const entry = state.pointLevels[category][index] || { purchased: true, completed: false };
        if (!entry.completed) {
            entry.completed = true;
            state.pointLevels[category][index] = entry;
            const type = currentLevel.size === 4 ? 'easy' : currentLevel.size === 6 ? 'medium' : 'hard';
            const rewards = getLevelRewards(type);
            state.points += rewards[stars - 1];
            const assistTypes = ['shuffle', 'magnet', 'freeze'];
            const randomAssist = assistTypes[Math.floor(Math.random() * 3)];
            state.assists[randomAssist] = (state.assists[randomAssist] || 0) + 1;
            saveState();
            showModal(`
                <h2 class="success">أحسنت!</h2>
                <p>حصلت على ${rewards[stars - 1]}💎 ومساعدة ${randomAssist === 'shuffle' ? '🔀 خلط' : randomAssist === 'magnet' ? '🧲 مغناطيس' : '❄️ تجميد'}</p>
                <button class="modal-btn" onclick="closeModal();backToHome()">متابعة</button>
            `);
        } else {
            showModal(`
                <h2>لقد أكملت هذا المستوى بالفعل</h2>
                <button class="modal-btn" onclick="closeModal();backToHome()">حسنًا</button>
            `);
        }
        return;
    }

    // المستويات العادية
    const key = currentLevel.key;
    const old = state.levels[key] || { st