/**
 * GameManager - Centralized game state and logic manager
 * Replaces ~15+ scattered global variables with organized structure
 */

const GameManager = {
  // ============ CORE STATE ============
  state: null,
  
  // ============ LEVEL DATA ============
  level: {
    current: null,
    puzzleArr: [],
    moveCount: 0,
    timeRemaining: 0,
  },

  // ============ BOT/CHALLENGE ============
  challenge: {
    current: null,
    botPuzzleArr: [],
    botWrongCount: 0,
    botPaused: false,
  },

  // ============ TIMERS ============
  timers: {
    main: null,
    bot: null,
    cleanup() {
      if (this.main) clearInterval(this.main);
      if (this.bot) clearInterval(this.bot);
      this.main = null;
      this.bot = null;
    }
  },

  // ============ UI STATE ============
  ui: {
    currentPage: 0,
    currentScreen: 'homeScreen',
    dragSource: null,
    boardWidth: 0,
    boardHeight: 0,
    extraTab: 'stars',
    puzzleGridSize: 3,
    timerPaused: false,
    modalPause: false,
  },

  // ============ INITIALIZATION ============
  init() {
    this.state = this.loadState() || this.createInitialState();
    this.ensureStateStructure();
    this.initializeDailyTickets();
  },

  // ============ STATE MANAGEMENT ============
  createInitialState() {
    return {
      points: 0,
      levels: {},
      starLevels: {},
      pointLevels: { easy: {}, medium: {}, hard: {} },
      bonusLevels: {},
      achievements: {},
      challengeCoins: 0,
      dailyTickets: {
        date: new Date().toISOString().slice(0, 10),
        count: 5
      },
      theme: 'dark',
      assists: { shuffle: 1, magnet: 1, freeze: 1 },
      stats: {
        completed: 0,
        threeStars: 0,
        fastest: 999999,
        challengesWon: 0,
        bonusCompleted: 0
      },
      levelProgress: {}
    };
  },

  ensureStateStructure() {
    const defaults = {
      starLevels: {},
      pointLevels: { easy: {}, medium: {}, hard: {} },
      bonusLevels: {},
      achievements: {},
      stats: {
        completed: 0,
        threeStars: 0,
        fastest: 999999,
        challengesWon: 0,
        bonusCompleted: 0
      },
      assists: { shuffle: 1, magnet: 1, freeze: 1 },
      levelProgress: {}
    };

    Object.keys(defaults).forEach(key => {
      if (!this.state[key]) this.state[key] = defaults[key];
    });
  },

  loadState() {
    try {
      return JSON.parse(localStorage.getItem('puzzleGameState') || 'null');
    } catch (e) {
      console.error('Failed to load state:', e);
      return null;
    }
  },

  saveState() {
    try {
      this.state.lastSaved = Date.now();
      localStorage.setItem('puzzleGameState', JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  },

  // ============ LEVEL PROGRESS ============
  saveLevelProgress() {
    if (!this.level.current || !this.level.current.key) return;
    
    const progress = {
      puzzleArr: [...this.level.puzzleArr],
      moveCount: this.level.moveCount,
      timeRemaining: this.level.timeRemaining,
      timestamp: Date.now()
    };
    
    this.state.levelProgress = this.state.levelProgress || {};
    this.state.levelProgress[this.level.current.key] = progress;
    this.saveState();
  },

  loadLevelProgress() {
    if (!this.level.current || !this.level.current.key) return null;
    this.state.levelProgress = this.state.levelProgress || {};
    return this.state.levelProgress[this.level.current.key] || null;
  },

  clearLevelProgress() {
    if (!this.level.current || !this.level.current.key) return;
    this.state.levelProgress = this.state.levelProgress || {};
    delete this.state.levelProgress[this.level.current.key];
    this.saveState();
  },

  // ============ DAILY TICKETS ============
  initializeDailyTickets() {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.state.dailyTickets || this.state.dailyTickets.date !== today) {
      this.state.dailyTickets = { date: today, count: 5 };
      this.saveState();
    }
  },

  // ============ POINTS & COINS ============
  addPoints(amount) {
    this.state.points += Math.max(0, amount);
    this.saveState();
  },

  subtractPoints(amount) {
    this.state.points = Math.max(0, this.state.points - amount);
    this.saveState();
  },

  addChallengeCoins(amount) {
    this.state.challengeCoins += Math.max(0, amount);
    this.saveState();
  },

  subtractChallengeCoins(amount) {
    this.state.challengeCoins = Math.max(0, this.state.challengeCoins - amount);
    this.saveState();
  },

  // ============ ASSISTS ============
  getAssistCount(type) {
    return this.state.assists[type] || 0;
  },

  useAssist(type) {
    if (this.state.assists[type] > 0) {
      this.state.assists[type]--;
      this.saveState();
      return true;
    }
    return false;
  },

  addAssist(type, count = 1) {
    this.state.assists[type] = (this.state.assists[type] || 0) + count;
    this.saveState();
  },

  // ============ LEVEL MANAGEMENT ============
  startLevel(config) {
    this.timers.cleanup();
    
    this.level.current = config;
    this.level.puzzleArr = [];
    this.level.moveCount = 0;
    this.level.timeRemaining = config.time || 0;
    
    this.ui.puzzleGridSize = config.size;
    this.ui.timerPaused = false;
    this.ui.modalPause = false;
    
    this.challenge.botPaused = false;
  },

  resetLevel() {
    this.level.current = null;
    this.level.puzzleArr = [];
    this.level.moveCount = 0;
    this.level.timeRemaining = 0;
    this.timers.cleanup();
  },

  // ============ STATS ============
  incrementStat(stat, amount = 1) {
    if (this.state.stats[stat] !== undefined) {
      this.state.stats[stat] += amount;
      this.saveState();
    }
  },

  updateFastestTime(time) {
    if (time < this.state.stats.fastest) {
      this.state.stats.fastest = time;
      this.saveState();
    }
  },

  // ============ ACHIEVEMENTS ============
  checkAchievements() {
    const done = this.state.achievements || {};
    
    if (this.state.stats.completed >= 1) done.first = true;
    if (this.state.stats.threeStars >= 10) done.stars = true;
    if (this.state.stats.fastest < 15) done.speed = true;
    if (this.state.stats.challengesWon >= 3) done.warrior = true;
    if (this.state.stats.bonusCompleted >= 3) done.bonus = true;
    
    this.state.achievements = done;
    this.saveState();
  },

  // ============ RESET ============
  resetAllData() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟')) {
      localStorage.removeItem('puzzleGameState');
      this.state = this.createInitialState();
      this.ensureStateStructure();
      this.saveState();
      return true;
    }
    return false;
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  GameManager.init();
});
