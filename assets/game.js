const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = {
  attempt: document.getElementById("attempt"), progress: document.getElementById("progress"),
  coins: document.getElementById("coins"), totalCoins: document.getElementById("totalCoins"), best: document.getElementById("best"),
  levelSelect: document.getElementById("levelSelect"), attemptFlash: document.getElementById("attemptFlash"),
  countdown: document.getElementById("countdown"), modal: document.getElementById("knowledgeModal"),
  modalType: document.getElementById("modalType"), modalTitle: document.getElementById("modalTitle"),
  modalText: document.getElementById("modalText"), answers: document.getElementById("answers"),
  modalContinue: document.getElementById("modalContinue"), complete: document.getElementById("completeModal"),
  completeTitle: document.getElementById("completeTitle"), results: document.getElementById("results"),
  next: document.getElementById("nextLevelBtn"), replay: document.getElementById("replayBtn")
};

const saveKey = "knowledgeDashSave";
const save = JSON.parse(localStorage.getItem(saveKey) || '{"totalCoins":0,"best":{},"artifacts":[]}');
const W = 1280, H = 720, groundY = 586;
const themes = [
  {name:"Birth of Computing", sub:"retro monitors", c:"#2cff7a", c2:"#ffbd45", bg:"#071421", speed:5.1},
  {name:"Personal Computers", sub:"garage hardware", c:"#ff8a2b", c2:"#24c8ff", bg:"#11131c", speed:5.7},
  {name:"Internet Revolution", sub:"server city", c:"#24f6ff", c2:"#ffffff", bg:"#050b17", speed:6.35},
  {name:"Mobile World", sub:"notification maze", c:"#a6ff3b", c2:"#ff385c", bg:"#090b10", speed:6.75},
  {name:"AI Era", sub:"neural skyline", c:"#50ffd5", c2:"#b8e5ff", bg:"#030610", speed:7.15}
];

let levelIndex = 0, level, state, last = performance.now(), keys = {};

function buildLevel(i){
  const t = themes[i], p = [], spikes = [], coins = [], orbs = [], portals = [], artifacts = [], questions = [], deco = [];
  let x = 0;
  const addP=(w,y=groundY,h=28,type="platform")=>{p.push({x,w,y,h,type}); x += w;};
  const gap=(w)=>{x += w;};
  const coin=(dx,y)=>coins.push({x:x+dx,y,r:12,taken:false});
  const spike=(dx,y=groundY-28,flip=false)=>spikes.push({x:x+dx,y,w:34,h:32,flip});
  const orb=(dx,y)=>orbs.push({x:x+dx,y,r:18,used:false});
  const portal=(dx,kind,value)=>portals.push({x:x+dx,y:groundY-88,w:34,h:92,kind,value,used:false});
  const art=(dx,y,title,text)=>artifacts.push({x:x+dx,y,r:20,title,text,taken:false});
  const q=(dx,y)=>questions.push({x:x+dx,y,r:20,taken:false,question:"Что означает WWW?", answers:["World Wide Web","Wild Wire Window","Web Work Wave"], correct:0});
  for(let s=0;s<8;s++) deco.push({x:s*650+180,y:70+(s%3)*60,w:90+s*6,h:30+(s%2)*35,kind:s%4});
  addP(420); coin(230,groundY-90); gap(70); addP(220,groundY-20); spike(120); gap(110);
  addP(150,groundY-70); coin(60,groundY-145); gap(80); addP(150,groundY-120); orb(70,groundY-205); gap(100); addP(220,groundY-70);
  portal(120,"speed",.82); addP(260); gap(170); addP(90,groundY-110); coin(40,groundY-185); gap(90); addP(110,groundY-160); spike(68,groundY-188,true);
  gap(80); addP(170,groundY-95); art(70,groundY-150,`${t.name} artifact`,`Факт мира: ${t.sub} стал важной ступенью цифровой культуры.`);
  gap(160); addP(360,groundY-10); spike(60); spike(105); coin(210,groundY-86); portal(285,"speed",1.18);
  gap(120); addP(120,groundY-150); gap(80); addP(120,groundY-210); coin(45,groundY-285); gap(120); addP(180,groundY-145);
  q(75,groundY-210); gap(140); addP(260,groundY-70); spike(50); spike(92); spike(134);
  gap(210); addP(115,groundY-125); coin(50,groundY-202); gap(100); addP(115,groundY-80); orb(50,groundY-165); gap(90); addP(260,groundY-35);
  portal(180,"gravity", i>=2 ? -1 : 1); gap(130); addP(190, i>=2 ? groundY-210 : groundY-95); coin(85, i>=2 ? groundY-285 : groundY-170);
  gap(160); addP(360,groundY-5); spike(110); spike(155); spike(200); gap(120); addP(500,groundY-80); art(300,groundY-150,"Secret memory","Ты нашёл скрытую ветку маршрута и получил Knowledge Points.");
  gap(180); addP(260,groundY-150); orb(140,groundY-235); gap(120); addP(260,groundY-80); coin(110,groundY-152);
  gap(150); addP(620,groundY-20); portal(140,"speed",1.35); spike(230); spike(278); coin(420,groundY-92); art(520,groundY-100,"Final unlock","Финишная зона открывает новый фрагмент коллекции.");
  addP(420,groundY-20,28,"finish");
  return {theme:t, platforms:p, spikes, coins, orbs, portals, artifacts, questions, deco, length:x+300, index:i};
}

function reset(newAttempt=true){
  level = buildLevel(levelIndex);
  const attempt = newAttempt && state ? state.attempt + 1 : 1;
  state = {attempt, x:70, y:groundY-80, w:42, h:42, vx:0, vy:0, rot:0, gravity:1, cam:0, speedMul:1, slowTimer:0, jumps:0, time:0, coins:0, points:0, artifacts:0, paused:false, complete:false, coyote:0, buffer:0, safeX:70, safeY:groundY-80};
  ui.attempt.textContent = attempt;
  showAttempt();
}
function showAttempt(){ui.attemptFlash.textContent=`Attempt ${state.attempt}`;ui.attemptFlash.classList.remove("show");void ui.attemptFlash.offsetWidth;ui.attemptFlash.classList.add("show");}
function persist(){localStorage.setItem(saveKey,JSON.stringify(save));}
function buildButtons(){ui.levelSelect.innerHTML=themes.map((t,i)=>`<button class="level-button ${i===levelIndex?'active':''}" data-i="${i}"><b>${String(i+1).padStart(2,"0")} ${t.name}</b><small>${t.sub}</small></button>`).join("");ui.levelSelect.querySelectorAll("button").forEach(b=>b.onclick=()=>{levelIndex=+b.dataset.i;reset(false);buildButtons();});}
function jump(){if(!state||state.paused||state.complete)return;state.buffer=.12;}
addEventListener("keydown",e=>{if(e.code==="Space"||e.code==="ArrowUp"){e.preventDefault();jump();} if(e.code==="KeyR")reset(true);});
canvas.addEventListener("pointerdown",e=>{e.preventDefault();jump();});
document.getElementById("restartBtn").onclick=()=>reset(true);
document.getElementById("pauseBtn").onclick=()=>{state.paused=!state.paused;document.getElementById("pauseBtn").textContent=state.paused?"Resume":"Pause";};
ui.replay.onclick=()=>{ui.complete.classList.remove("open");reset(false);};
ui.next.onclick=()=>{ui.complete.classList.remove("open");levelIndex=(levelIndex+1)%themes.length;reset(false);buildButtons();};

function update(dt){
  if(state.paused||state.complete)return;
  state.time+=dt; state.buffer=Math.max(0,state.buffer-dt); state.coyote=Math.max(0,state.coyote-dt);
  if(state.slowTimer>0){state.slowTimer-=dt; state.speedMul += (1-state.speedMul)*Math.min(1,dt*1.7);}
  const targetSpeed=level.theme.speed*state.speedMul; state.x+=targetSpeed*60*dt;
  state.vy += 1850*state.gravity*dt; state.y += state.vy*dt; state.rot += (Math.abs(state.vy)>30?5.5:1.4)*dt;
  let grounded=false;
  for(const p of level.platforms){
    const insideX=state.x+state.w>p.x&&state.x<p.x+p.w;
    if(!insideX)continue;
    if(state.gravity>0 && state.y+state.h>=p.y && state.y+state.h<=p.y+p.h+Math.max(22,Math.abs(state.vy)*dt+2)&&state.vy>=0){state.y=p.y-state.h;state.vy=0;grounded=true;state.safeX=state.x-35;state.safeY=state.y;}
    if(state.gravity<0 && state.y<=p.y+p.h && state.y>=p.y-Math.max(22,Math.abs(state.vy)*dt+2)&&state.vy<=0){state.y=p.y+p.h;state.vy=0;grounded=true;state.safeX=state.x-35;state.safeY=state.y;}
  }
  if(grounded)state.coyote=.11;
  if(state.buffer>0&&state.coyote>0){state.vy=-720*state.gravity;state.buffer=0;state.coyote=0;state.jumps++;}
  if(state.y>H+220||state.y<-260)die();
  for(const s of level.spikes) if(rectHit(state,{x:s.x,y:s.y,w:s.w,h:s.h})) die();
  for(const c of level.coins) if(!c.taken&&circleHit(state,c)){c.taken=true;state.coins++;save.totalCoins=(save.totalCoins||0)+1;burst(c.x,c.y,level.theme.c);persist();}
  for(const o of level.orbs) if(!o.used&&circleHit(state,o)&&state.buffer>0){o.used=true;state.vy=-760*state.gravity;state.buffer=0;burst(o.x,o.y,level.theme.c2);}
  for(const p of level.portals) if(!p.used&&rectHit(state,p)){p.used=true;if(p.kind==="speed"){state.speedMul=p.value;state.slowTimer=1.5}else{state.gravity*=p.value;burst(p.x,p.y,level.theme.c2);}}
  for(const a of level.artifacts) if(!a.taken&&circleHit(state,a)){a.taken=true;state.artifacts++;state.points+=100;openKnowledge("Artifact",a.title,a.text,null);}
  for(const q of level.questions) if(!q.taken&&circleHit(state,q)){q.taken=true;openKnowledge("Question","Knowledge checkpoint",q.question,q);}
  state.cam += ((state.x-220)-state.cam)*Math.min(1,dt*4);
  const prog=Math.min(100,(state.x/level.length)*100); save.best[levelIndex]=Math.max(save.best[levelIndex]||0,prog); persist();
  if(state.x>level.length-520)complete();
}
function die(){reset(true);}
function rectHit(a,b){return a.x+a.w>b.x&&a.x<b.x+b.w&&a.y+a.h>b.y&&a.y<b.y+b.h;}
function circleHit(a,c){const px=Math.max(a.x,Math.min(c.x,a.x+a.w)), py=Math.max(a.y,Math.min(c.y,a.y+a.h));return Math.hypot(px-c.x,py-c.y)<c.r+3;}
let particles=[];function burst(x,y,color){for(let i=0;i<18;i++)particles.push({x,y,vx:(Math.random()-.5)*260,vy:(Math.random()-.5)*260,life:.7,color});}
function openKnowledge(type,title,text,q){
  state.paused=true; ui.modal.classList.add("open"); ui.modalType.textContent=type; ui.modalTitle.textContent=title; ui.modalText.textContent=text; ui.answers.innerHTML="";
  if(q){q.answers.forEach((a,i)=>{const b=document.createElement("button");b.textContent=a;b.onclick=()=>{b.classList.add(i===q.correct?"good":"bad"); if(i!==q.correct){state.x=state.safeX;state.y=state.safeY;} state.points+=i===q.correct?150:35; setTimeout(()=>resumeCountdown(),650)};ui.answers.appendChild(b);}); ui.modalContinue.style.display="none";}
  else{ui.modalContinue.style.display="inline-block";ui.modalContinue.onclick=()=>{if(!save.artifacts.includes(title))save.artifacts.push(title);persist();resumeCountdown();};}
}
function resumeCountdown(){ui.modal.classList.remove("open");let n=3;ui.countdown.classList.add("show");const tick=()=>{ui.countdown.textContent=n>0?n:"GO";if(n-->=0)setTimeout(tick,650);else{ui.countdown.classList.remove("show");state.paused=false;state.speedMul=.62;state.slowTimer=1.7;}};tick();}
function complete(){state.complete=true;save.best[levelIndex]=100;persist();ui.completeTitle.textContent=`${level.theme.name} complete`;ui.results.innerHTML=[
  ["Attempt",state.attempt],["Jumps",state.jumps],["Time",state.time.toFixed(1)+"s"],["Coins Collected",`${state.coins}/${level.coins.length}`],["Knowledge Points",state.points],["Artifacts Found",state.artifacts],["Progress","100%"],["New Unlocks",state.artifacts?"Artifact memory":"Best route"]
].map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join("");ui.complete.classList.add("open");}

function draw(){
  const t=level.theme; ctx.fillStyle=t.bg; ctx.fillRect(0,0,W,H);
  const zoom=1+(Math.sin(state.time*.7)*.018)+Math.min(.04,state.speedMul*.01); ctx.save(); ctx.translate(W/2,H/2); ctx.scale(zoom,zoom); ctx.translate(-W/2,-H/2);
  drawBg(t); ctx.translate(-state.cam,0);
  level.deco.forEach(d=>{ctx.globalAlpha=.35;ctx.strokeStyle=d.kind%2?t.c:t.c2;ctx.lineWidth=2;ctx.strokeRect(d.x,d.y,d.w,d.h);ctx.globalAlpha=1;});
  level.platforms.forEach(p=>{const g=ctx.createLinearGradient(p.x,p.y,p.x+p.w,p.y+p.h);g.addColorStop(0,t.c);g.addColorStop(1,t.c2);ctx.fillStyle="rgba(255,255,255,.05)";round(p.x,p.y,p.w,p.h,8,true);ctx.strokeStyle=g;ctx.lineWidth=3;round(p.x,p.y,p.w,p.h,8,false);});
  level.spikes.forEach(s=>drawSpike(s,t)); level.coins.forEach(c=>!c.taken&&drawCoin(c,t)); level.orbs.forEach(o=>!o.used&&drawOrb(o,t)); level.portals.forEach(p=>!p.used&&drawPortal(p,t)); level.artifacts.forEach(a=>!a.taken&&drawArtifact(a,t)); level.questions.forEach(q=>!q.taken&&drawQuestion(q,t));
  particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.life-=.016;p.x+=p.vx*.016;p.y+=p.vy*.016;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,4,0,7);ctx.fill();ctx.globalAlpha=1;});
  ctx.save();ctx.translate(state.x+state.w/2,state.y+state.h/2);ctx.rotate(state.rot);ctx.fillStyle=t.c;ctx.shadowColor=t.c;ctx.shadowBlur=24;round(-state.w/2,-state.h/2,state.w,state.h,8,true);ctx.restore();
  ctx.restore(); updateUi();
}
function drawBg(t){for(let i=0;i<70;i++){const x=(i*211-state.cam*.18)%W,y=(i*89+Math.sin(state.time+i)*20)%H;ctx.fillStyle=i%3?t.c:t.c2;ctx.globalAlpha=.08;ctx.fillRect(x,y,18,18)}ctx.globalAlpha=1;}
function drawSpike(s,t){ctx.fillStyle=t.c2;ctx.shadowColor=t.c2;ctx.shadowBlur=16;ctx.beginPath();if(s.flip){ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.w/2,s.y+s.h);ctx.lineTo(s.x+s.w,s.y)}else{ctx.moveTo(s.x,s.y+s.h);ctx.lineTo(s.x+s.w/2,s.y);ctx.lineTo(s.x+s.w,s.y+s.h)}ctx.closePath();ctx.fill();ctx.shadowBlur=0;}
function drawCoin(c,t){ctx.strokeStyle=t.c;ctx.lineWidth=4;ctx.shadowColor=t.c;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(c.x,c.y,c.r+Math.sin(state.time*6)*2,0,7);ctx.stroke();ctx.shadowBlur=0;}
function drawOrb(o,t){ctx.fillStyle=t.c2;ctx.shadowColor=t.c2;ctx.shadowBlur=28;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fill();ctx.shadowBlur=0;}
function drawPortal(p,t){ctx.strokeStyle=p.kind==="gravity"?t.c2:t.c;ctx.lineWidth=5;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=24;ctx.strokeRect(p.x,p.y,p.w,p.h);ctx.shadowBlur=0;}
function drawArtifact(a,t){ctx.fillStyle=t.c;ctx.shadowColor=t.c;ctx.shadowBlur=24;ctx.beginPath();ctx.moveTo(a.x,a.y-a.r);ctx.lineTo(a.x+a.r,a.y);ctx.lineTo(a.x,a.y+a.r);ctx.lineTo(a.x-a.r,a.y);ctx.closePath();ctx.fill();ctx.shadowBlur=0;}
function drawQuestion(q,t){ctx.fillStyle=t.c2;ctx.font="900 28px Inter,Arial";ctx.shadowColor=t.c2;ctx.shadowBlur=20;ctx.fillText("?",q.x-8,q.y+9);ctx.shadowBlur=0;}
function round(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);fill?ctx.fill():ctx.stroke();}
function updateUi(){ui.attempt.textContent=state.attempt;ui.progress.textContent=Math.min(100,(state.x/level.length)*100).toFixed(0)+"%";ui.coins.textContent=`${state.coins} / ${level.coins.length}`;ui.totalCoins.textContent=save.totalCoins||0;ui.best.textContent=(save.best[levelIndex]||0).toFixed(0)+"%";}
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop);}
buildButtons();reset(false);requestAnimationFrame(loop);
