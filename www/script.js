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
      entry.completed=true;state.pointLevels[cat][idx]=entry;
      const type=currentLevel.size===4?'easy':currentLevel.size===6?'medium':'hard';
      const earned=getLevelRewards(type)[stars-1];state.points+=earned;
      const types=['shuffle','magnet','freeze'];const ra=types[Math.floor(Math.random()*3)];state.assists[ra]=(state.assists[ra]||0)+1;saveState();
      const nm=ra==='shuffle'?'🔀 خلط':ra==='magnet'?'🧲 مغناطيس':'❄️ تجميد';
      showModal(`<h2 class="success">أحسنت!</h2><p>حصلت على ${earned}💎 ومساعدة ${nm}</p><button class="modal-btn" onclick="closeModal();backToHome()">متابعة</button>`);
    }else showModal('<h2>لقد أكملت هذا المستوى بالفعل</h2><button class="modal-btn" onclick="closeModal();backToHome()">حسنًا</button>');
    return;
  }
  const key=currentLevel.key;const old=state.levels[key]||{stars:0,completed:false};const type=getLevelType(currentLevel.index);const rewards=getLevelRewards(type);const first=!old.completed;const replayCount=old.replayCount||0;let reward=0;
  if(first)reward=rewards[stars-1];else if(replayCount===0){if(stars===3)reward=rewards[2];else reward=Math.floor(rewards[stars-1]/2)}else reward=5;
  state.points+=reward;old.completed=true;old.stars=Math.max(old.stars,stars);old.replayCount=(old.replayCount||0)+1;state.levels[key]=old;
  state.stats.completed+=(first?1:0);if(stars===3&&first)state.stats.threeStars++;state.stats.fastest=Math.min(state.stats.fastest,currentLevel.time-currentTimeRemaining);checkAchievements();saveState();renderMainGrid();
  const currentImage=old.imageUrl||getImageUrl(key);showWinPopup(currentImage,stars,reward);
}
function showWinPopup(imageUrl,stars,reward){
  const html=`<h2 class="success">أحسنت!</h2><div style="font-size:2em">${'⭐'.repeat(stars)}</div><p>حصلت على <b>${reward}💎</b></p><img class="preview-img" src="${imageUrl}" style="width:75%;aspect-ratio:3/4;object-fit:cover;margin:10px 0"><button class="modal-btn" onclick="downloadImage('${imageUrl}',${stars})">💾 حفظ الصورة</button><button class="modal-btn" onclick="nextLevel()">➡️ الانتقال للمستوى التالي</button><button class="modal-btn secondary" onclick="restartCurrentLevel()">🔄 إعادة المستوى</button>`;
  showModal(html);
}
function nextLevel(){
  closeModal();
  const currentIndex=currentLevel.index;const nextIndex=currentIndex+1;
  if(nextIndex<25){
    const nextKey=getLevelKey(currentPage,nextIndex);const nextLevelData=state.levels[nextKey];
    if(nextLevelData&&nextLevelData.unlocked){const type=getLevelType(nextIndex);startLevel({type:'normal',page:currentPage,index:nextIndex,size:getGridSizeByType(type),time:getLevelTime(type),key:nextKey,imageUrl:nextLevelData.imageUrl})}
    else backToHome();
  } else {
    if(state.levels[getLevelKey(currentPage+1,0)]?.unlocked){currentPage++;renderMainGrid();backToHome()}
    else backToHome();
  }
}
function restartCurrentLevel(){const c={...currentLevel};startLevel(c)}
function showPreview(key){
  let imgUrl,stars;
  if(key.includes('-star')){const p=parseInt(key.split('-')[1]);imgUrl=getImageUrl(`star${p}`);stars=state.starLevels[p]?.stars||0}
  else{const l=state.levels[key];imgUrl=l.imageUrl;stars=l.stars||0}
  showModal(`<h2>معاينة المرحلة</h2><img class="preview-img" src="${imgUrl}" style="width:75%;aspect-ratio:3/4;object-fit:cover"><p>أفضل نتيجة: ${'⭐'.repeat(stars)}</p><div class="toggle-container"><span>حفظ مع الإحصائيات</span><label class="switch"><input type="checkbox" id="withStatsCheckbox" checked><span class="slider"></span></label></div><button class="modal-btn" onclick="downloadImage('${imgUrl}',${stars})">⬇️ تحميل</button><button class="modal-btn secondary" onclick="closeModal()">إغلاق</button>`);
}
function downloadImage(url,stars){
  const withStats=document.getElementById('withStatsCheckbox')?.checked;
  if(withStats){
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      canvas.width=img.width;
      canvas.height=img.height+100;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0);
      ctx.fillStyle='rgba(0,0,0,.7)';
      ctx.fillRect(0,img.height,canvas.width,100);
      ctx.fillStyle='white';
      ctx.font='30px Cairo';
      ctx.fillText(`النجوم: ${'⭐'.repeat(stars)}`,20,img.height+50);
      const link=document.createElement('a');
      link.download='puzzle_preview.png';
      link.href=canvas.toDataURL();
      link.click();
      showShareAlert();
    };
    img.onerror=()=>{
      alert('تعذر تحميل الصورة مع الإحصائيات، جاري التحميل بدونها.');
      downloadImageWithoutStats(url);
    };
    img.src=url;
  } else {
    downloadImageWithoutStats(url);
  }
}
function downloadImageWithoutStats(url){
  const link=document.createElement('a');
  link.download='puzzle_preview.jpg';
  link.href=url;
  link.target='_blank';
  link.click();
  showShareAlert();
}
function showShareAlert(){
  alert('تم التحميل! لا تنسى مشاركة الصورة على السوشيال ميديا 📱');
}
function useShuffle(){
  if(!currentLevel)return;
  if(state.assists.shuffle<=0)return showBuyAssist('shuffle');
  state.assists.shuffle--;
  const free=[...document.querySelectorAll('.tile:not(.locked)')];const positions=free.map(t=>Number(t.dataset.pos));
  if(positions.length<2)return;
  const values=positions.map(p=>puzzleArr[p]);
  for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]]}
  positions.forEach((pos,i)=>puzzleArr[pos]=values[i]);
  document.querySelectorAll('.tile').forEach(t=>positionTile(t,puzzleArr[Number(t.dataset.pos)]));
  updateWrongDisplay();lockCorrectTiles();saveState();updateAssistButtons();
}
function useMagnet(){
  if(!currentLevel)return;
  if(state.assists.magnet<=0)return showBuyAssist('magnet');
  state.assists.magnet--;
  const wrongs=[...document.querySelectorAll('.tile:not(.locked)')];
  if(wrongs.length===0)return;
  const randomWrong=wrongs[Math.floor(Math.random()*wrongs.length)];
  const targetPos=Number(randomWrong.dataset.correctIndex);
  const targetTile=document.querySelector(`.tile[data-pos="${targetPos}"]`);
  if(targetTile){
    const sourcePos=Number(randomWrong.dataset.pos);
    [puzzleArr[sourcePos],puzzleArr[targetPos]]=[puzzleArr[targetPos],puzzleArr[sourcePos]];
    randomWrong.dataset.pos=String(targetPos);targetTile.dataset.pos=String(sourcePos);
    positionTile(randomWrong,puzzleArr[targetPos]);positionTile(targetTile,puzzleArr[sourcePos]);
    moveCount++;updateMovesDisplay();updateWrongDisplay();lockCorrectTiles();saveState();updateAssistButtons();
  }
}
function useFreeze(){
  if(!currentLevel)return;
  if(currentLevel.isBonus||currentLevel.noTimer||currentLevel.isPointLevel)return;
  if(state.assists.freeze<=0)return showBuyAssist('freeze');
  state.assists.freeze--;botPaused=true;setTimeout(()=>botPaused=false,20000);saveState();updateAssistButtons();
  showModal('<h3>❄️ تم التجميد</h3><p>تم إيقاف الخصم لمدة 20 ثانية.</p><button class="modal-btn" onclick="closeModal()">تمام</button>');
}
function openExtraLevels(){renderExtraLevels();showScreen('extraLevelsScreen')}
function switchExtraTab(tab){
  extraTab=tab;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(tab==='stars'?'tabStars':'tabPoints').classList.add('active');
  renderExtraLevels();
}
function getTotalStars(){
  let total=0;
  for(const k in state.levels)total+=state.levels[k].stars||0;
  for(const p in state.starLevels)total+=state.starLevels[p].stars||0;
  return total;
}
function renderExtraLevels(){
  const container=document.getElementById('extraContent');
  container.innerHTML='';
  if(extraTab==='stars'){
    const totalStars=getTotalStars();
    const header=document.createElement('div');
    header.className='list-item';
    header.innerHTML=`<b>⭐ إجمالي النجوم: ${totalStars}</b>`;
    container.appendChild(header);
    for(let p=0;p<10;p++){
      const req=60*(p+1);
      const entry=state.starLevels[p]||{unlocked:false,stars:0,completed:false};
      const unlocked=totalStars>=req;
      entry.unlocked=unlocked;
      state.starLevels[p]=entry;
      const card=document.createElement('div');
      card.className='card';
      card.style.width='100%';
      card.style.padding='15px';
      card.style.textAlign='right';
      if(!unlocked){
        card.classList.add('locked');
        card.innerHTML=`🔒 مستوى صفحة ${p+1} - يتطلب ${req} ⭐`;
      } else if(entry.completed && entry.stars===3){
        card.classList.add('completed');
        card.innerHTML=`صفحة ${p+1} - ⭐${entry.stars} - معاينة`;
        card.onclick=()=>showStarPreview(p);
      } else {
        card.innerHTML=`صفحة ${p+1} - ⭐${entry.stars||0} - ابدأ`;
        card.onclick=()=>startStarLevel(p);
      }
      container.appendChild(card);
    }
  } else {
    const header=document.createElement('div');
    header.className='list-item';
    header.innerHTML=`<b>💎 النقاط: ${state.points}</b>`;
    container.appendChild(header);
    const cats=[
      {key:'easy',name:'سهل',size:4,cost:500},
      {key:'medium',name:'متوسط',size:6,cost:1000},
      {key:'hard',name:'صعب',size:8,cost:1500}
    ];
    cats.forEach(cat=>{
      const catHeader=document.createElement('div');
      catHeader.className='list-item';
      catHeader.innerHTML=`<b>${cat.name} - ${cat.cost}💎</b>`;
      container.appendChild(catHeader);
      for(let i=0;i<20;i++){
        const entry=state.pointLevels[cat.key][i]||{purchased:false,completed:false};
        const card=document.createElement('div');
        card.className='card';
        card.style.width='100%';
        card.style.padding='10px';
        card.style.textAlign='right';
        if(!entry.purchased){
          card.innerHTML=`${cat.name} ${i+1} (${cat.size}×${cat.size}) - ${cat.cost}💎`;
          card.onclick=()=>buyPointLevel(cat.key,i,cat.cost,cat.size);
        } else if(entry.completed){
          card.classList.add('completed');
          card.innerHTML=`${cat.name} ${i+1} - ✅ مكتمل`;
          card.onclick=()=>startPointLevel(cat.key,i,cat.size);
        } else {
          card.innerHTML=`${cat.name} ${i+1} - ابدأ`;
          card.onclick=()=>startPointLevel(cat.key,i,cat.size);
        }
        container.appendChild(card);
      }
    });
  }
  saveState();
  gsap.fromTo('#extraContent .card',{opacity:0,y:20},{opacity:1,y:0,duration:0.3,stagger:0.03,ease:'power2.out'});
}
function startStarLevel(page){
  const entry=state.starLevels[page];
  if(!entry || !entry.unlocked)return;
  startLevel({type:'normal',isStarLevel:true,page,index:-1,size:8,time:180,key:`star-${page}`,imageUrl:getImageUrl(`star${page}`)});
}
function showStarPreview(page){
  showModal(`<h2>معاينة مستوى النجوم صفحة ${page+1}</h2><img class="preview-img" src="${getImageUrl('star'+page)}" style="width:75%;aspect-ratio:3/4;object-fit:cover"><button class="modal-btn secondary" onclick="closeModal()">إغلاق</button>`);
}
function buyPointLevel(category,index,cost,size){
  if(state.points>=cost){
    state.points-=cost;
    if(!state.pointLevels[category][index])state.pointLevels[category][index]={};
    state.pointLevels[category][index].purchased=true;
    saveState();updatePointsDisplay();renderExtraLevels();
  } else {
    showModal('<h3>لا يوجد نقاط كافية</h3><button class="modal-btn" onclick="closeModal()">موافق</button>');
  }
}
function startPointLevel(category,index,size){
  startLevel({type:'normal',isPointLevel:true,noTimer:true,pointCategory:category,pointIndex:index,size,key:`point-${category}-${index}`,imageUrl:getImageUrl(`point${category}${index}`)});
}
function openCumulativeBonus(){renderBonus();showScreen('bonusScreen')}
function renderBonus(){
  const levels=[5,10,20,35,55,80,110,150];
  document.getElementById('bonusList').innerHTML=levels.map((need,i)=>{
    const done=state.bonusLevels[i];
    return `<div class="list-item"><b>💰 بونص ${i+1}</b><div>أكمل ${need} مرحلة إجمالاً</div><div>${done?'✅ تم الاستلام':'🎁 مكافأة '+(50+i*50)+'💎'}</div>${!done&&state.stats.completed>=need?`<button class="modal-btn" onclick="claimBonus(${i},${50+i*50})">استلام</button>`:''}</div>`;
  }).join('');
  gsap.fromTo('#bonusList .list-item',{opacity:0,y:15},{opacity:1,y:0,duration:0.3,stagger:0.05,ease:'power2.out'});
}
function claimBonus(i,reward){
  if(state.bonusLevels[i] || state.stats.completed<[5,10,20,35,55,80,110,150][i])return;
  state.bonusLevels[i]=true;
  state.points+=reward;
  state.stats.bonusCompleted++;
  checkAchievements();saveState();renderBonus();updatePointsDisplay();
}
function checkAchievements(){
  const done=state.achievements||{};
  if(state.stats.completed>=1)done.first=true;
  if(state.stats.threeStars>=10)done.stars=true;
  if(state.stats.fastest<15)done.speed=true;
  if(state.stats.challengesWon>=3)done.warrior=true;
  if(state.stats.bonusCompleted>=3)done.bonus=true;
  state.achievements=done;
}
const challengeData=[
  {name:'هاو',size:5,timeRange:[30,60],entryFee:2,winCoins:5,loseCoins:2,botSpeed:0.8},
  {name:'مبتدأ',size:6,timeRange:[45,90],entryFee:5,winCoins:10,loseCoins:5,botSpeed:0.9},
  {name:'ماهر',size:8,timeRange:[60,120],entryFee:10,winCoins:20,loseCoins:10,botSpeed:1.0},
  {name:'ممتاز',size:10,timeRange:[90,150],entryFee:20,winCoins:40,loseCoins:20,botSpeed:1.1},
  {name:'خبير',size:12,timeRange:[120,180],entryFee:40,winCoins:80,loseCoins:40,botSpeed:1.2},
  {name:'اسطوري',size:15,timeRange:[150,240],entryFee:80,winCoins:160,loseCoins:80,botSpeed:1.3}
];
function openChallenges(){updateDailyTickets();renderChallenges();showScreen('challengesScreen')}
function renderChallenges(){
  document.getElementById('challengeList').innerHTML=challengeData.map((ch,i)=>`<div class="list-item"><b>⚔️ ${ch.name} (${ch.size}×${ch.size})</b><div class="muted">رسوم: ${ch.entryFee} عملات - فوز: ${ch.winCoins} عملات</div><button class="modal-btn" onclick="startChallengeLevel(${i})">ابدأ</button></div>`).join('');
  gsap.fromTo('#challengeList .list-item',{opacity:0,x:-20},{opacity:1,x:0,duration:0.3,stagger:0.05,ease:'power2.out'});
}
function startChallengeLevel(index){
  updateDailyTickets();
  const ch=challengeData[index];
  const hasTicket=state.dailyTickets.count>0;
  if(hasTicket){
    if(confirm(`استخدام تذكرة للدخول؟ (لديك ${state.dailyTickets.count})`)){
      state.dailyTickets.count--;saveState();startChallengeGame(ch,true);
    }
  } else if(state.challengeCoins>=ch.entryFee){
    if(confirm(`دفع ${ch.entryFee} عملات منافسة؟`)){
      state.challengeCoins-=ch.entryFee;saveState();startChallengeGame(ch,false);
    }
  } else {
    showModal('<h3>لا توجد تذاكر أو عملات كافية</h3><p>يمكنك شراء تذكرة أو عملات من الأسفل.</p><button class="modal-btn secondary" onclick="closeModal()">إغلاق</button>');
  }
}
function startChallengeGame(ch,usedTicket){
  currentChallenge={...ch,usedTicket};
  const min=ch.timeRange[0],max=ch.timeRange[1];
  let time=Math.floor(Math.random()*(max-min+1))+min;
  time=Math.ceil(time/3)*3;
  startLevel({type:'challenge',isChallenge:true,size:ch.size,time,reward:ch.winCoins,imageUrl:getImageUrl(`challenge-${ch.name}`)});
}
function startBot(){
  botPaused=false;botWrongCount=countWrongTilesFromArr(botPuzzleArr);clearInterval(botInterval);
  const ch=currentChallenge;
  if(ch.name==='هاو'){
    let step=0;
    botInterval=setInterval(()=>{
      if(botPaused||modalPause||!currentLevel)return;
      const total=botPuzzleArr.length,targetPos=(total-1)-(step%total),pieceValue=1,currentPos=botPuzzleArr.indexOf(pieceValue);
      if(currentPos!==targetPos&&botPuzzleArr[targetPos]!==pieceValue){
        [botPuzzleArr[currentPos],botPuzzleArr[targetPos]]=[botPuzzleArr[targetPos],botPuzzleArr[currentPos]];
        botWrongCount=countWrongTilesFromArr(botPuzzleArr);updateChallengeDisplay();
        if(isSolved(botPuzzleArr)){clearIntervals();finishChallenge(false);}
      }
      step++;
    },2000);
  } else {
    botInterval=setInterval(()=>{
      if(botPaused||modalPause||!currentLevel)return;
      const candidates=[];
      for(let i=0;i<botPuzzleArr.length;i++)if(botPuzzleArr[i]!==i)candidates.push(i);
      if(!candidates.length)return;
      const pos=candidates[Math.floor(Math.random()*candidates.length)],want=botPuzzleArr[pos],target=botPuzzleArr.indexOf(pos);
      if(target>=0)[botPuzzleArr[pos],botPuzzleArr[target]]=[botPuzzleArr[target],botPuzzleArr[pos]];
      botWrongCount=countWrongTilesFromArr(botPuzzleArr);updateChallengeDisplay();
      if(isSolved(botPuzzleArr)){clearIntervals();finishChallenge(false);}
    },Math.max(1000,Math.floor((currentLevel.time*1000)/(puzzleArr.length*1.5))));
  }
}
function updateChallengeDisplay(){updateWrongDisplay()}
function useStopOpponent(){
  if(!currentLevel?.isChallenge)return;
  if(state.assists.freeze<=0)return showBuyAssist('freeze');
  state.assists.freeze--;botPaused=true;setTimeout(()=>botPaused=false,7000);saveState();updateAssistButtons();
  showModal('<h3>🚫 تم إيقاف الخصم</h3><p>الخصم متوقف 7 ثوانٍ.</p><button class="modal-btn" onclick="closeModal()">تمام</button>');
}
function finishChallenge(playerWon){
  clearIntervals();
  if(playerWon){
    state.challengeCoins+=currentChallenge.winCoins;
    state.stats.challengesWon++;checkAchievements();saveState();
    showModal(`<h2 class="success">فوز!</h2><p>حصلت على ${currentChallenge.winCoins} عملة منافسة.</p><button class="modal-btn" onclick="closeModal();backToHome()">متابعة</button>`);
  } else {
    if(currentChallenge.usedTicket){
      showModal('<h2 class="danger">الخصم سبقك!</h2><p>لكن التذكرة حمتك من خسارة العملات.</p><button class="modal-btn" onclick="closeModal();backToHome()">رجوع</button>');
    } else {
      state.challengeCoins=Math.max(0,state.challengeCoins-currentChallenge.loseCoins);
      saveState();
      showModal(`<h2 class="danger">الخصم سبقك!</h2><p>خسرت ${currentChallenge.loseCoins} عملات منافسة.</p><button class="modal-btn" onclick="closeModal();backToHome()">رجوع</button>`);
    }
  }
}
function buyTickets(){
  if(state.points<200)return showModal('<h3>النقاط غير كافية</h3><button class="modal-btn secondary" onclick="closeModal()">إغلاق</button>');
  state.points-=200;state.dailyTickets.count++;saveState();updatePointsDisplay();renderChallenges();
}
function buyChallengeCoins(){
  if(state.points<50)return showModal('<h3>النقاط غير كافية</h3><button class="modal-btn secondary" onclick="closeModal()">إغلاق</button>');
  state.points-=50;state.challengeCoins+=10;saveState();updatePointsDisplay();
}
function openStore(){renderStore();showScreen('storeScreen')}
function renderStore(){
  const items=[
    ['shuffle','🔀 خلط إضافي',5,'shuffle'],
    ['magnet','🧲 مغناطيس إضافي',15,'magnet'],
    ['freeze','❄️ تجميد إضافي',10,'freeze'],
    ['tickets','🎫 تذكرة تحدي',200,'tickets']
  ];
  document.getElementById('storeItems').innerHTML=items.map(x=>{
    const count=(x[3]==='tickets')?state.dailyTickets.count:(state.assists[x[3]]||0);
    return `<div class="store-item"><div><b>${x[1]}</b><div class="muted">${x[2]}💎</div></div><span class="count-badge">${count}</span><button class="action-btn" onclick="confirmPurchase('${x[3]}',${x[2]})">شراء</button></div>`;
  }).join('');
  gsap.fromTo('#storeItems .store-item',{opacity:0,y:15},{opacity:1,y:0,duration:0.3,stagger:0.05,ease:'power2.out'});
}
function confirmPurchase(type,cost){
  showModal(`<h3>في المتجر فقط، لإتمام عملية الشراء</h3><p>شراء ${type} مقابل ${cost}💎؟</p><button class="modal-btn" onclick="buyItem('${type}',${cost})">تأكيد</button><button class="modal-btn secondary" onclick="closeModal()">إلغاء</button>`);
}
function buyItem(type,cost){
  if(state.points<cost)return showModal('<h3>النقاط غير كافية</h3><button class="modal-btn secondary" onclick="closeModal()">إغلاق</button>');
  state.points-=cost;
  if(type==='tickets')state.dailyTickets.count++;else state.assists[type]++;
  saveState();updatePointsDisplay();renderStore();updateAssistButtons();closeModal();
}

function openSettings(){
  const totalStars=getTotalStars();
  const completedLevels=Object.values(state.levels).filter(l=>l.completed).length;
  const fastest=state.stats.fastest===999999?'—':state.stats.fastest+' ثانية';
  const html=`<h2>⚙️ الإعدادات والإحصائيات</h2>
  <div style="text-align:right;margin:10px 0">
  <p><b>⭐ إجمالي النجوم:</b> ${totalStars}</p>
  <p><b>💎 النقاط:</b> ${state.points}</p>
  <p><b>💰 عملات المنافسة:</b> ${state.challengeCoins}</p>
  <p><b>✅ المستويات المكتملة:</b> ${completedLevels}</p>
  <p><b>⚡ أسرع وقت:</b> ${fastest}</p>
  <p><b>⚔️ تحديات مكسبوة:</b> ${state.stats.challengesWon}</p>
  </div>
  <button class="modal-btn secondary" onclick="resetData()">🗑️ مسح البيانات وإعادة التعيين</button>
  <button class="modal-btn" onclick="closeModal()">إغلاق</button>`;
  showModal(html);
}
function resetData(){
  if(confirm('هل أنت متأكد من مسح جميع البيانات؟')){
    localStorage.removeItem(STORAGE_KEY);
    state=createInitialState();
    ensureStateStructure();
    saveState();
    closeModal();backToHome();
    alert('تم مسح البيانات وإعادة التعيين.');
  }
}
let titleTapCount=0,titleTapTimer=null;
function onTitleClick(){
  titleTapCount++;
  clearTimeout(titleTapTimer);
  titleTapTimer=setTimeout(()=>{titleTapCount=0},2000);
  if(titleTapCount>=5){
    titleTapCount=0;clearTimeout(titleTapTimer);showCheatMenu();
  }
}
function showCheatMenu(){
  const currentPoints=state.points,currentCoins=state.challengeCoins,currentTickets=state.dailyTickets.count;
  const currentShuffle=state.assists.shuffle||0,currentMagnet=state.assists.magnet||0,currentFreeze=state.assists.freeze||0;
  const totalStars=getTotalStars();
  const html=`<h2>🧪 قائمة الغش</h2>
  <div style="text-align:right;margin:10px 0">
  <div><b>💎 النقاط</b> <input type="text" id="cheatPoints" value="${currentPoints}" style="width:100px;padding:5px;border-radius:8px;border:1px solid #ccc"></div>
  <div><b>💰 عملات المنافسة</b> <input type="text" id="cheatCoins" value="${currentCoins}" style="width:100px;padding:5px;border-radius:8px;border:1px solid #ccc"></div>
  <div><b>🎫 التذاكر</b> <input type="text" id="cheatTickets" value="${currentTickets}" style="width:100px;padding:5px;border-radius:8px;border:1px solid #ccc"></div>
  <div><b>🔀 خلط</b> <input type="text" id="cheatShuffle" value="${currentShuffle}" style="width:100px;padding:5px;border-radius:8px;border:1px solid #ccc"></div>
  <div><b>🧲 مغناطيس</b> <input type="text" id="cheatMagnet" value="${currentMagnet}" style="width:100px;padding:5px;border-radius:8px;border:1px solid #ccc"></div>
  <div><b>❄️ تجميد</b> <input type="text" id="cheatFreeze" value="${currentFreeze}" style="width:100px;padding:5px;border-radius:8px;border:1px solid #ccc"></div>
  <div><b>⭐ إجمالي النجوم</b> <input type="text" value="${totalStars}" disabled style="width:100px;padding:5px;border-radius:8px;border:1px solid #ccc"></div>
  </div>
  <button class="modal-btn" onclick="applyCheat()">تطبيق التعديلات</button>
  <button class="modal-btn" onclick="cheatUnlockAll()">فتح كل المستويات</button>
  <button class="modal-btn secondary" onclick="closeModal()">إغلاق</button>`;
  showModal(html);
}
function applyCheat(){
  const parseMod=(id,current)=>{
    const val=document.getElementById(id).value.trim();
    if(val.startsWith('+')||val.startsWith('-'))return Math.max(0,current+parseInt(val));
    return Math.max(0,parseInt(val)||0);
  };
  state.points=parseMod('cheatPoints',state.points);
  state.challengeCoins=parseMod('cheatCoins',state.challengeCoins);
  state.dailyTickets.count=parseMod('cheatTickets',state.dailyTickets.count);
  state.assists.shuffle=parseMod('cheatShuffle',state.assists.shuffle||0);
  state.assists.magnet=parseMod('cheatMagnet',state.assists.magnet||0);
  state.assists.freeze=parseMod('cheatFreeze',state.assists.freeze||0);
  saveState();updatePointsDisplay();updateAssistButtons();closeModal();
  alert('تم تطبيق التعديلات');
}
function cheatUnlockAll(){
  for(let i=0;i<25;i++){
    const key=getLevelKey(currentPage,i);
    if(!state.levels[key])state.levels[key]={};
    state.levels[key].unlocked=true;state.levels[key].completed=true;state.levels[key].stars=3;
  }
  for(let p=0;p<10;p++){
    state.starLevels[p]={unlocked:true,stars:3,completed:true};
  }
  ['easy','medium','hard'].forEach(cat=>{
    for(let i=0;i<20;i++){
      state.pointLevels[cat][i]={purchased:true,completed:true};
    }
  });
  saveState();renderMainGrid();closeModal();
  alert('تم فتح جميع المستويات');
}

function init(){
  updateDailyTickets();
  document.body.classList.toggle('light-mode',state.theme==='light');
  renderMainGrid();updatePointsDisplay();updateAssistButtons();
  const titleEl=document.querySelector('.game-title');
  if(titleEl)titleEl.addEventListener('click',onTitleClick);
}
window.addEventListener('resize',()=>{
  if(currentLevel){
    boardWidth=Math.min(window.innerWidth*.9,450);
    boardHeight=Math.min(window.innerHeight*.65,boardWidth*4/3);
    const c=document.getElementById('puzzleContainer');
    c.style.width=boardWidth+'px';
    c.style.height=boardHeight+'px';
    document.querySelectorAll('.tile').forEach(t=>positionTile(t,puzzleArr[Number(t.dataset.pos)]));
  }
});
init();