// نجوم البازل - نسخة مستقرة قبل حركة المجموعات
const STORAGE_KEY='puzzleGameState';
let state=loadState()||createInitialState();
ensureStateStructure();

let currentPage=0,currentLevel=null,puzzleGridSize=3,puzzleArr=[],timerInterval=null,botInterval=null,moveCount=0,currentTimeRemaining=0;
let botPaused=false,timerPaused=false,modalPause=false,botPuzzleArr=[],botWrongCount=0,currentChallenge=null,dragSource=null,extraTab='stars';
let boardWidth=0, boardHeight=0;

function vibrate(ms){if(navigator.vibrate)navigator.vibrate(ms)}

function createInitialState(){
  return{
    points:0,levels:{},starLevels:{},pointLevels:{easy:{},medium:{},hard:{}},bonusLevels:{},achievements:{},
    challengeCoins:0,dailyTickets:{date:new Date().toISOString().slice(0,10),count:5},theme:'dark',
    assists:{shuffle:1,magnet:1,freeze:1},stats:{completed:0,threeStars:0,fastest:999999,challengesWon:0,bonusCompleted:0}
  };
}
function ensureStateStructure(){
  if(!state.starLevels) state.starLevels={};
  if(!state.pointLevels) state.pointLevels={};
  if(!state.pointLevels.easy) state.pointLevels.easy={};
  if(!state.pointLevels.medium) state.pointLevels.medium={};
  if(!state.pointLevels.hard) state.pointLevels.hard={};
  if(!state.bonusLevels) state.bonusLevels={};
  if(!state.achievements) state.achievements={};
  if(!state.stats) state.stats={completed:0,threeStars:0,fastest:999999,challengesWon:0,bonusCompleted:0};
  if(!state.assists) state.assists={shuffle:1,magnet:1,freeze:1};
}
function loadState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch(e){return null}}
function saveState(){
  state.lastSaved=Date.now();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
function saveCurrentLevelProgress(){
  if(!currentLevel || !currentLevel.key) return;
  const progress = {
    puzzleArr: [...puzzleArr],
    moveCount: moveCount,
    timeRemaining: currentTimeRemaining,
    timestamp: Date.now()
  };
  state.levelProgress = state.levelProgress || {};
  state.levelProgress[currentLevel.key] = progress;
  saveState();
}
function loadCurrentLevelProgress(){
  if(!currentLevel || !currentLevel.key) return null;
  state.levelProgress = state.levelProgress || {};
  return state.levelProgress[currentLevel.key] || null;
}
function clearCurrentLevelProgress(){
  if(!currentLevel || !currentLevel.key) return;
  state.levelProgress = state.levelProgress || {};
  delete state.levelProgress[currentLevel.key];
  saveState();
}
function updateDailyTickets(){const d=new Date().toISOString().slice(0,10);if(!state.dailyTickets||state.dailyTickets.date!==d){state.dailyTickets={date:d,count:5};saveState()}}
function toggleTheme(){document.body.classList.toggle('light-mode');state.theme=document.body.classList.contains('light-mode')?'light':'dark';saveState()}
function updatePointsDisplay(){const p=state.points,c=state.challengeCoins;['homePoints','extraPoints','bonusPoints','storePoints'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=`💎 ${p}`});document.getElementById('challengePoints').textContent=`💰 ${c}`;document.getElementById('ticketCount').textContent=state.dailyTickets.count}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');updatePointsDisplay();if(id==='gameScreen')updateAssistButtons()}
function clearIntervals(){if(timerInterval)clearInterval(timerInterval);if(botInterval)clearInterval(botInterval);timerInterval=botInterval=null}
function backToHome(){
  clearIntervals();
  if(currentLevel) saveCurrentLevelProgress();
  currentLevel=null;
  showScreen('homeScreen');
  renderMainGrid();
}
function exitGame(){
  clearIntervals();
  if(currentLevel) saveCurrentLevelProgress();
  showModal(`<h2>الخروج من المرحلة؟</h2><p>التقدم الحالي في المرحلة سيضيع.</p><button class="modal-btn" onclick="closeModal();backToHome()">نعم، خروج</button><button class="modal-btn secondary" onclick="closeModal()">إلغاء</button>`);
}
function closeModal(){const modal=document.getElementById('modal');if(!modal)return;gsap.to(modal,{opacity:0,duration:0.2,onComplete:()=>{modal.classList.add('hidden');modal.style.opacity=1;const pc=document.getElementById('puzzleContainer');if(pc)pc.classList.remove('blurred');modalPause=false}})}
function showModal(html){const pc=document.getElementById('puzzleContainer'),gs=document.getElementById('gameScreen');if(pc&&currentLevel&&gs&&!gs.classList.contains('hidden')){pc.classList.add('blurred');modalPause=true}const modal=document.getElementById('modal');const content=document.getElementById('modalContent');if(!modal||!content)return;content.innerHTML=`<button class="modal-close" onclick="closeModal()">✕</button>${html}`;modal.classList.remove('hidden');modal.style.opacity=0;gsap.to(modal,{opacity:1,duration:0.25,ease:'power2.out'});gsap.from(content,{scale:0.85,y:20,opacity:0,duration:0.3,ease:'back.out(1.4)'})}
function updateAssistButtons(){document.getElementById('shuffleCount').textContent=state.assists.shuffle||0;document.getElementById('magnetCount').textContent=state.assists.magnet||0;document.getElementById('freezeCount').textContent=state.assists.freeze||0;const st=document.getElementById('stopCount');if(st)st.textContent=state.assists.freeze||0}
function showBuyAssist(type){if(!currentLevel)return;const items={shuffle:{icon:'🔀',name:'خلط',cost:5},magnet:{icon:'🧲',name:'مغناطيس',cost:15},freeze:{icon:'❄️',name:'تجميد',cost:10}};const item=items[type];showModal(`<h3>${item.icon} ${item.name}</h3><p>لا تملك ${item.name}.</p><p>السعر: ${item.cost}💎</p><button class="modal-btn" onclick="buyAssist('${type}',${item.cost})">شراء</button><button class="modal-btn secondary" onclick="closeModal()">إلغاء</button>`)}
function buyAssist(type,cost){if(state.points>=cost){state.points-=cost;state.assists[type]=(state.assists[type]||0)+1;saveState();updatePointsDisplay();updateAssistButtons();closeModal()}else showModal('<h3>لا يوجد مال كفاية</h3><button class="modal-btn" onclick="closeModal()">موافق</button>')}

function getImageUrl(seed){return `https://picsum.photos/seed/${encodeURIComponent(seed)}/720/960`}
function getLevelKey(page,index){return `${page}-${index}`}
function getLevelType(index){return index%5===4?'medium':'easy'}
function getGridSizeByType(type){return type==='easy'?4:type==='medium'?6:type==='hard'?8:3}
function getLevelTime(type){return type==='easy'?60:type==='medium'?120:type==='hard'?180:45}
function getLevelRewards(type){return type==='easy'?[20,15,10,5]:type==='medium'?[40,30,20,10]:[80,60,40,20]}
function renderMainGrid(){
  const grid=document.getElementById('mainGrid');
  if(!grid)return;
  grid.innerHTML='';
  for(let i=0;i<25;i++){
    const key=getLevelKey(currentPage,i);
    if(!state.levels[key])state.levels[key]={stars:0,completed:false,unlocked:false,imageUrl:getImageUrl(`page${currentPage}level${i}`)};
    const level=state.levels[key];
    const unlocked=(currentPage===0&&i===0)||(i>0&&!!state.levels[getLevelKey(currentPage,i-1)]?.completed)||(i===0&&!!state.levels[getLevelKey(currentPage-1,24)]?.completed);
    level.unlocked=unlocked;
    const card=document.createElement('div');
    card.className='card'+(unlocked?'':' locked')+(level.completed?' completed':'');
    card.innerHTML=!unlocked?'🔒':level.completed?'⭐'.repeat(level.stars):getLevelType(i)==='easy'?'4×4':'6×6';
    card.onclick=()=>onLevelClick(i);
    let lp;card.addEventListener('touchstart',()=>{if(level.completed)lp=setTimeout(()=>showPreview(key),500)},{passive:true});
    card.addEventListener('touchend',()=>clearTimeout(lp));card.addEventListener('touchmove',()=>clearTimeout(lp));
    grid.appendChild(card);
  }
  const pageIndicator=document.getElementById('pageIndicator');
  if(pageIndicator)pageIndicator.textContent=`صفحة ${currentPage+1}`;
  saveState();
  gsap.fromTo('.grid-container .card',{scale:0.8,opacity:0},{scale:1,opacity:1,duration:0.3,stagger:0.02,ease:'back.out(2)'});
}
function changePage(delta){if(delta>0&&!state.levels[getLevelKey(currentPage,24)]?.completed){showModal('<h3>أكمل المستوى 25 أولاً</h3><button class="modal-btn" onclick="closeModal()">حسنًا</button>');return}currentPage=Math.max(0,currentPage+delta);renderMainGrid()}
function onLevelClick(index){const key=getLevelKey(currentPage,index),level=state.levels[key];if(!level.unlocked)return;if(level.completed&&level.stars===3){showPreview(key);return}const type=getLevelType(index);startLevel({type:'normal',page:currentPage,index,size:getGridSizeByType(type),time:getLevelTime(type),key,imageUrl:level.imageUrl})}

function startLevel(config){
  clearIntervals();currentLevel=config;puzzleGridSize=config.size;moveCount=0;currentTimeRemaining=config.time||0;botPaused=false;timerPaused=false;modalPause=false;
  const savedProgress = loadCurrentLevelProgress();
  if(savedProgress && savedProgress.puzzleArr && savedProgress.puzzleArr.length === config.size*config.size){
    puzzleArr = [...savedProgress.puzzleArr];
    moveCount = savedProgress.moveCount || 0;
    currentTimeRemaining = savedProgress.timeRemaining || config.time;
  } else {
    puzzleArr = [];
  }
  const gameMoves=document.getElementById('gameMoves');
  const gameTimer=document.getElementById('gameTimer');
  const freezeBtn=document.getElementById('freezeBtn');
  const stopOpponentBtn=document.getElementById('stopOpponentBtn');
  const challengeStats=document.getElementById('challengeStats');
  if(gameMoves)gameMoves.style.display=config.isBonus?'inline':'none';
  if(gameTimer)gameTimer.style.display=(config.isBonus||config.noTimer)?'none':'inline';
  if(freezeBtn)freezeBtn.style.display=(config.isBonus||config.noTimer||config.isPointLevel)?'none':'inline-flex';
  if(stopOpponentBtn)stopOpponentBtn.style.display=config.isChallenge?'inline-flex':'none';
  if(challengeStats)challengeStats.innerHTML=config.isChallenge?'<div>أنت: <span id="playerWrong">0</span> قطع خاطئة</div><div>الخصم: <span id="botWrong">0</span> قطع خاطئة</div>':'';
  boardWidth=Math.min(window.innerWidth*.9,450);
  boardHeight=Math.min(window.innerHeight*.65,boardWidth*4/3);
  const c=document.getElementById('puzzleContainer');
  c.style.width=boardWidth+'px';
  c.style.height=boardHeight+'px';
  setupPuzzle(config.size,config.imageUrl, puzzleArr.length? puzzleArr : null);
  showScreen('gameScreen');updateMovesDisplay();
  if(config.isChallenge){botPuzzleArr=[...puzzleArr];botWrongCount=countWrongTilesFromArr(botPuzzleArr);startTimer(config.time);startBot();updateChallengeDisplay()}
  else if(!config.isBonus&&!config.noTimer)startTimer(currentTimeRemaining);
  renderStars(3);
  gsap.from('#puzzleContainer',{opacity:0,scale:0.95,duration:0.3,ease:'power2.out'});
}
function setupPuzzle(gridSize,imageUrl,savedArr){
  const container=document.getElementById('puzzleContainer');
  container.innerHTML='';
  const total=gridSize*gridSize;
  const tileWidth=boardWidth/gridSize;
  const tileHeight=boardHeight/gridSize;
  if(savedArr && savedArr.length === total){
    puzzleArr = [...savedArr];
  } else {
    const correct=Array.from({length:total},(_,i)=>i);
    do{
      puzzleArr=[...correct];
      for(let i=puzzleArr.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [puzzleArr[i],puzzleArr[j]]=[puzzleArr[j],puzzleArr[i]];
      }
    }while(isSolved(puzzleArr));
  }
  for(let pos=0;pos<total;pos++){
    const tile=document.createElement('div');
    tile.className='tile';
    tile.style.width=tileWidth+'px';
    tile.style.height=tileHeight+'px';
    tile.style.backgroundImage=`url('${imageUrl}')`;
    tile.style.backgroundSize=`${gridSize*100}% ${gridSize*100}%`;
    tile.dataset.correctIndex=String(puzzleArr[pos]);
    tile.dataset.pos=String(pos);
    positionTile(tile,puzzleArr[pos]);
    addTileEvents(tile);
    container.appendChild(tile);
  }
  updateWrongDisplay();
  lockCorrectTiles();
  gsap.fromTo('.tile',{opacity:0,scale:0.5},{opacity:1,scale:1,duration:0.25,stagger:0.01,ease:'back.out(2)'});
}
function positionTile(tile,correctIndex){
  const r=Math.floor(correctIndex/puzzleGridSize);
  const c=correctIndex%puzzleGridSize;
  const x=(c/(puzzleGridSize-1))*100;
  const y=(r/(puzzleGridSize-1))*100;
  tile.style.left=(Number(tile.dataset.pos)%puzzleGridSize)*(boardWidth/puzzleGridSize)+'px';
  tile.style.top=Math.floor(Number(tile.dataset.pos)/puzzleGridSize)*(boardHeight/puzzleGridSize)+'px';
  tile.style.backgroundPosition=`${x}% ${y}%`;
}
function addTileEvents(tile){
  let moveTweenX = null;
  let moveTweenY = null;

  tile.addEventListener('pointerdown', e => {
    if(tile.classList.contains('locked')) return;
    e.preventDefault();
    dragSource = tile;
    tile.classList.add('dragging');
    try { tile.setPointerCapture(e.pointerId); } catch(_) {}

    gsap.to(tile, {scale:1.15, duration:0.2, ease:'power2.out'});
    gsap.set(tile, {zIndex: 1000});

    const board = document.getElementById('puzzleContainer').getBoundingClientRect();
    moveTweenX = gsap.quickTo(tile, "left", {duration:0.25, ease:"power3.out"});
    moveTweenY = gsap.quickTo(tile, "top", {duration:0.25, ease:"power3.out"});

    const onMove = (ev) => {
      const x = ev.clientX - board.left - tile.offsetWidth/2;
      const y = ev.clientY - board.top - tile.offsetHeight/2;
      moveTweenX(x);
      moveTweenY(y);
    };

    tile._onMove = onMove;
    document.addEventListener('pointermove', onMove);
  });

  tile.addEventListener('pointerup', e => {
    if(!dragSource) return;
    e.preventDefault();
    document.removeEventListener('pointermove', tile._onMove);
    gsap.to(dragSource, {scale:1, duration:0.2, ease:'power2.out'});
    gsap.set(dragSource, {zIndex: 1});

    const els = document.elementsFromPoint(e.clientX, e.clientY);
    let targetTile = null;
    for(const el of els){
      if(el.classList && el.classList.contains('tile') && el !== dragSource && !el.classList.contains('locked')){
        targetTile = el;
        break;
      }
    }

    dragSource.classList.remove('dragging');

    if(targetTile){
      swapTiles(dragSource, targetTile);
    } else {
      const pos = Number(dragSource.dataset.pos);
      const targetLeft = (pos % puzzleGridSize) * (boardWidth/puzzleGridSize) + 'px';
      const targetTop = Math.floor(pos / puzzleGridSize) * (boardHeight/puzzleGridSize) + 'px';
      gsap.to(dragSource, {left:targetLeft, top:targetTop, duration:0.25, ease:'back.out(1.5)'});
    }
    dragSource = null;
  });

  tile.addEventListener('pointercancel', () => {
    if(dragSource) {
      document.removeEventListener('pointermove', tile._onMove);
      gsap.to(dragSource, {scale:1, duration:0.2, ease:'power2.out'});
      gsap.set(dragSource, {zIndex: 1});
      dragSource = null;
    }
  });
}
function swapTiles(a,b){
  if(a.classList.contains('locked')||b.classList.contains('locked'))return;
  const pa=Number(a.dataset.pos);
  const pb=Number(b.dataset.pos);
  [puzzleArr[pa],puzzleArr[pb]]=[puzzleArr[pb],puzzleArr[pa]];
  a.dataset.pos=String(pb);
  b.dataset.pos=String(pa);
  const posA1={left:a.style.left,top:a.style.top};
  const posB1={left:b.style.left,top:b.style.top};
  positionTile(a,puzzleArr[pb]);
  positionTile(b,puzzleArr[pa]);
  const posA2={left:a.style.left,top:a.style.top};
  const posB2={left:b.style.left,top:b.style.top};
  a.style.left=posA1.left;
  a.style.top=posA1.top;
  b.style.left=posB1.left;
  b.style.top=posB1.top;
  gsap.to(a,{left:posA2.left,top:posA2.top,duration:0.25,ease:'power2.inOut'});
  gsap.to(b,{left:posB2.left,top:posB2.top,duration:0.25,ease:'power2.inOut',onComplete:()=>{
    moveCount++;
    updateMovesDisplay();
    updateWrongDisplay();
    lockCorrectTiles();
    if(isSolved(puzzleArr))finishLevel(true);
  }});
}
function lockCorrectTiles(){
  // أولاً: نحدد القطع الصحيحة ونضيف locked
  document.querySelectorAll('.tile').forEach(tile=>{
    const pos=Number(tile.dataset.pos);
    const correct=Number(tile.dataset.correctIndex);
    const isCorrect=pos===correct;
    const wasLocked=tile.classList.contains('locked');
    tile.classList.toggle('locked',isCorrect);
    tile.classList.remove('merged');
    if(isCorrect && !wasLocked){
      vibrate(30);
      gsap.fromTo(tile,
        {filter:'brightness(1.8)'},
        {filter:'brightness(1)', duration:0.4, ease:'power2.out', onComplete:()=>{
          gsap.set(tile,{clearProps:'filter'});
          tile.classList.add('locked-dim');
        }}
      );
    }
  });

  // ثانياً: فحص الجيران المقفولين وإضافة merged
  const lockedTiles = [...document.querySelectorAll('.tile.locked')];
  const lockedSet = new Set(lockedTiles.map(t=>Number(t.dataset.pos)));
  const gridSize = puzzleGridSize;

  lockedTiles.forEach(tile=>{
    const pos = Number(tile.dataset.pos);
    const row = Math.floor(pos / gridSize);
    const col = pos % gridSize;
    const neighbors = [
      {r:row-1, c:col},
      {r:row+1, c:col},
      {r:row, c:col-1},
      {r:row, c:col+1}
    ];
    let hasMergedNeighbor = false;
    for(const n of neighbors){
      if(n.r < 0 || n.r >= gridSize || n.c < 0 || n.c >= gridSize) continue;
      const nPos = n.r * gridSize + n.c;
      if(lockedSet.has(nPos)){
        hasMergedNeighbor = true;
        break;
      }
    }
    if(hasMergedNeighbor){
      tile.classList.add('merged');
    }
  });

  // ثالثاً: حفظ التقدم تلقائياً
  saveCurrentLevelProgress();
}
function isSolved(arr){return arr.every((v,i)=>v===i)}
function countWrongTilesFromArr(arr){return arr.reduce((n,v,i)=>n+(v!==i?1:0),0)}
function updateWrongDisplay(){
  if(currentLevel?.isChallenge){
    document.getElementById('playerWrong').textContent=countWrongTilesFromArr(puzzleArr);
    document.getElementById('botWrong').textContent=botWrongCount;
  }
}
function updateMovesDisplay(){document.getElementById('gameMoves').textContent=`حركات: ${moveCount}`}
function renderStars(stars){document.getElementById('gameStars').textContent='⭐'.repeat(stars)+'☆'.repeat(3-stars)}
function startTimer(seconds){
  currentTimeRemaining=seconds;
  updateTimerDisplay();
  timerInterval=setInterval(()=>{
    if(timerPaused||modalPause)return;
    currentTimeRemaining--;
    updateTimerDisplay();
    if(currentTimeRemaining<=0){clearIntervals();finishLevel(false,true);}
  },1000);
}
function updateTimerDisplay(){
  document.getElementById('gameTimer').textContent=`⏱ ${Math.max(0,currentTimeRemaining)}`;
  const ratio=currentLevel?.time?currentTimeRemaining/currentLevel.time:1;
  renderStars(ratio>.66?3:ratio>.33?2:1);
}
function calculateStars(){if(currentLevel.isBonus||currentLevel.noTimer)return 3;const ratio=currentTimeRemaining/currentLevel.time;return ratio>.66?3:ratio>.33?2:1}
function finishLevel(won,timedOut=false){
  if(!currentLevel)return;clearIntervals();
  if(currentLevel.isChallenge){finishChallenge(won);return}
  if(!won){showModal(`<h2>انتهى الوقت</h2><p>حاول مرة أخرى.</p><button class="modal-btn" onclick="closeModal();restartCurrentLevel()">إعادة المحاولة</button><button class="modal-btn secondary" onclick="closeModal();backToHome()">خروج</button>`);return}
  const stars=calculateStars();
  if(currentLevel.isStarLevel){
    const page=currentLevel.page;const entry=state.starLevels[page]||{completed:false,stars:0};
    if(!entry.completed){
      entry.completed=true;entry.stars=Math.max(entry.stars||0,stars);state.starLevels[page]=entry;
      const earned=[80,60,40,20][stars-1];state.points+=earned;saveState();
      showModal(`<h2 class="success">أحسنت!</h2><div style="font-size:2em">${'⭐'.repeat(stars)}</div><p>حصلت على ${earned}💎</p><button class="modal-btn" onclick="closeModal();backToHome()">متابعة</button>`);
    }else showModal('<h2>لقد أكملت هذا المستوى بالفعل</h2><button class="modal-btn" onclick="closeModal();backToHome()">حسنًا</button>');
    return;
  }
  if(currentLevel.isPointLevel){
    const cat=currentLevel.pointCategory,idx=currentLevel.pointIndex,entry=state.pointLevels[cat][idx]||{purchased:true,completed:false};
    if(!entry.completed){
      entry.completed=t