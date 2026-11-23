(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, WORLD = 2460;
  const screen = document.getElementById('screen');
  const title = document.getElementById('screenTitle');
  const screenText = document.getElementById('screenText');
  const eyebrow = document.getElementById('screenEyebrow');
  const startBtn = document.getElementById('startBtn');
  const modePicker = document.getElementById('modePicker');
  const toast = document.getElementById('toast');
  const keys = new Set();
  const held = { p1: {}, p2: {} };
  let mode = 1, state = 'menu', score = 0, collected = 0, camera = 0, time = 0, soundOn = true, audioCtx = null;
  let players = [], platforms = [], gems = [], enemies = [], particles = [], clouds = [], portal, last = 0, toastTimer;
  const levelNames = ['BOSQUE DESPIERTO', 'RUINAS DE MUSGO', 'CIELO DE CRISTAL'];
  let level = 0;
  const palettes = [
    { sky1:'#172846',sky2:'#304c67',mount:'#304a62',ground:'#344c49',top:'#68c790',accent:'#74f5c9',tree:'#173b3b',glow:'#75f4c8' },
    { sky1:'#292346',sky2:'#57456a',mount:'#554567',ground:'#514557',top:'#b2a46d',accent:'#e5d38a',tree:'#36304e',glow:'#dbc986' },
    { sky1:'#152d50',sky2:'#347397',mount:'#315b81',ground:'#3c5777',top:'#7fd9ec',accent:'#9bf5fa',tree:'#22496c',glow:'#98f0ff' }
  ];
  const rand = (a,b) => a + Math.random()*(b-a);
  function beep(freq=520,duration=.08,type='sine') { if(!soundOn)return; try { audioCtx ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.055,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration); } catch(_){} }
  function showToast(text){toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),1700)}
  function newPlayer(x,index){return {x,y:338,vx:0,vy:0,w:27,h:36,dir:1,onGround:false,hp:3,inv:0,attack:0,dash:0,dashCd:0,anim:0,index,respawn:0}}
  function buildLevel(){
    const p=palettes[level];
    platforms=[{x:0,y:420,w:410,h:120},{x:475,y:355,w:150,h:18},{x:670,y:300,w:155,h:18},{x:875,y:363,w:155,h:18},{x:1085,y:326,w:165,h:18},{x:1310,y:275,w:145,h:18},{x:1515,y:350,w:170,h:18},{x:1755,y:300,w:160,h:18},{x:1975,y:365,w:180,h:18},{x:2210,y:420,w:250,h:120}];
    // Add safe stepping ledges through the gaps; each world keeps its own visual identity.
    platforms.push({x:365,y:453,w:115,h:80},{x:610,y:433,w:105,h:70},{x:810,y:421,w:100,h:75},{x:1015,y:444,w:100,h:70},{x:1235,y:435,w:120,h:75},{x:1440,y:424,w:110,h:75},{x:1660,y:440,w:115,h:70},{x:1890,y:433,w:110,h:75},{x:2110,y:441,w:120,h:70});
    gems=[];
    [[200,380],[525,315],[720,260],[930,323],[1150,286],[1360,235],[1580,310],[1810,260],[2030,325],[2300,380]].forEach(([x,y],i)=>gems.push({x,y,r:9,taken:false,phase:i*.8}));
    enemies=[{x:300,y:0,min:250,max:370,v:44,alive:true,t:0},{x:730,y:0,min:680,max:810,v:39,alive:true,t:2},{x:1180,y:0,min:1100,max:1230,v:47,alive:true,t:1},{x:1600,y:0,min:1530,max:1660,v:42,alive:true,t:0},{x:2040,y:0,min:1990,max:2120,v:50,alive:true,t:2}];
    portal={x:2352,y:350,w:42,h:70,open:false};
    clouds=Array.from({length:11},(_,i)=>({x:i*270+rand(-40,80),y:70+rand(0,170),s:rand(.6,1.3)}));
    players=[newPlayer(70,0)];if(mode===2)players.push(newPlayer(112,1));camera=0;collected=0;
    updateHud();
  }
  function updateHud(){
    document.getElementById('levelName').textContent=`MUNDO 0${level+1} · ${levelNames[level]}`;
    document.getElementById('collectLabel').textContent=`LUCES ${collected} / ${gems.length}`;
    document.getElementById('progressBar').style.width=`${Math.min(100,(players[0]?.x||0)/WORLD*100)}%`;
    document.getElementById('scoreLabel').textContent=String(score).padStart(4,'0');
    document.getElementById('hearts1').textContent='♥ '.repeat(Math.max(0,players[0]?.hp||0)).trim()||'—';
    document.getElementById('hearts2').textContent='♥ '.repeat(Math.max(0,players[1]?.hp||0)).trim()||'—';
    document.getElementById('playerTwoHud').classList.toggle('hidden',mode!==2);
  }
  function startGame(){mode=Number(document.querySelector('.mode.active')?.dataset.mode||1);level=0;score=0;buildLevel();state='playing';screen.classList.add('dismissed');beep(650,.13)}
  function showScreen(kind){state=kind;screen.classList.remove('dismissed');modePicker.style.display=kind==='menu'?'grid':'none';document.getElementById('screenHint').style.display=kind==='menu'?'block':'none';if(kind==='paused'){eyebrow.textContent='AVENTURA EN PAUSA';title.innerHTML='TOMA UN<br><span>RESPIRO</span>';screenText.textContent='El bosque espera. Cuando estés listo, vuelve a la aventura.';startBtn.innerHTML='CONTINUAR <span>→</span>';}
    else if(kind==='won'){eyebrow.textContent='MUNDO COMPLETADO';title.innerHTML=level<2?'¡BIEN<br><span>HECHO!</span>':'¡BOSQUE<br><span>LIBRE!</span>';screenText.textContent=level<2?`Portal encontrado. Has reunido ${collected} luces y ${score} fragmentos. ¿Listos para el siguiente mundo?`:`¡La aventura está completa! Reuniste ${score} fragmentos. El bosque vuelve a brillar gracias a ti.`;startBtn.innerHTML=level<2?'SIGUIENTE MUNDO <span>→</span>':'JUGAR DE NUEVO <span>→</span>';}
    else if(kind==='over'){eyebrow.textContent='FIN DE LA AVENTURA';title.innerHTML='¡VUELVE A<br><span>INTENTARLO!</span>';screenText.textContent='Los guardianes te han superado esta vez. Las luces te esperan para otro intento.';startBtn.innerHTML='REINTENTAR <span>→</span>';}
    else {eyebrow.textContent='UNA AVENTURA COOPERATIVA';title.innerHTML='EL BOSQUE<br><span>DESPIERTO</span>';screenText.textContent='Las luces del bosque se han dispersado. ¡Recógelas, esquiva a los guardianes y encuentra el portal!';startBtn.innerHTML='COMENZAR AVENTURA <span>→</span>';}
  }
  startBtn.addEventListener('click',()=>{if(state==='paused'){state='playing';screen.classList.add('dismissed');return}if(state==='won'&&level<2){level++;buildLevel();state='playing';screen.classList.add('dismissed');showToast(`MUNDO 0${level+1} · ${levelNames[level]}`);return}startGame()});
  modePicker.addEventListener('click',e=>{const b=e.target.closest('.mode');if(!b)return;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('active',x===b));mode=Number(b.dataset.mode);document.getElementById('playerTwoHud').classList.toggle('hidden',mode!==2)});
  document.getElementById('pauseBtn').addEventListener('click',()=>{if(state==='playing')showScreen('paused');else if(state==='paused'){state='playing';screen.classList.add('dismissed')}});
  document.getElementById('soundBtn').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♫':'♪';e.currentTarget.setAttribute('aria-label',soundOn?'Desactivar sonido':'Activar sonido');if(soundOn)beep()});
  function keyAction(e,down){const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(down)keys.add(k);else keys.delete(k);
    if(down&&!e.repeat){if(k==='escape'||k==='p'){if(state==='playing')showScreen('paused');else if(state==='paused'){state='playing';screen.classList.add('dismissed')}}if(state==='menu'&&(k==='enter'))startGame();if(state==='playing'){if(k===' '||k==='w'||k==='arrowup'||k==='enter')jumpFor(k);}}
  }
  window.addEventListener('keydown',e=>keyAction(e,true));window.addEventListener('keyup',e=>keyAction(e,false));window.addEventListener('blur',()=>keys.clear());
  function jumpFor(k){const idx=['arrowup','enter'].includes(k)?1:0;const p=players[idx];if(p&&p.onGround){p.vy=-410;p.onGround=false;beep(370,.07)}}
  const touchButtons=document.querySelectorAll('.touch-group button');
  touchButtons.forEach(btn=>{const key=btn.dataset.key;const on=e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);keys.add('touch-'+key);if(key==='jump'&&players[0]?.onGround){players[0].vy=-410;players[0].onGround=false;beep(370,.07)}};const off=e=>{e.preventDefault();keys.delete('touch-'+key)};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('lostpointercapture',off)});
  function inputFor(i){if(i===0)return {left:keys.has('a')||keys.has('arrowleft')||keys.has('touch-left'),right:keys.has('d')||keys.has('arrowright')||keys.has('touch-right'),jump:keys.has('w')||keys.has(' ')||keys.has('arrowup')||keys.has('enter')||keys.has('touch-jump'),attack:keys.has('f')||keys.has('touch-attack'),ability:keys.has('g')||keys.has('touch-ability')};return {left:keys.has('arrowleft'),right:keys.has('arrowright'),jump:keys.has('arrowup')||keys.has('enter'),attack:keys.has('l'),ability:keys.has('k')}}
  function particlesAt(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-115,115),vy:rand(-170,30),life:rand(.3,.75),max:.75,color,size:rand(2,5)})}
  function update(dt){time+=dt;if(state!=='playing')return;
    for(let i=0;i<players.length;i++){const p=players[i],inp=inputFor(i);p.anim+=dt*10;if(p.inv>0)p.inv-=dt;if(p.attack>0)p.attack-=dt;if(p.dashCd>0)p.dashCd-=dt;if(p.dash>0){p.dash-=dt;p.vx=p.dir*520}else{p.vx=(inp.right?1:0)-(inp.left?1:0);p.vx*=180;if(p.vx)p.dir=Math.sign(p.vx)}
      if(inp.jump&&p.onGround&&!(i===0&&keys.has('touch-jump'))){p.vy=-410;p.onGround=false;beep(370,.06)}
      if(inp.attack&&p.attack<=0){p.attack=.27;beep(240,.07,'square');for(const en of enemies){if(en.alive&&Math.abs((p.x+p.w/2)-en.x)<52&&Math.abs((p.y+p.h/2)-(en.y-8))<47){en.alive=false;score+=100;particlesAt(en.x,en.y-10,palettes[level].accent,13);beep(690,.12)}}}
      if(inp.ability&&p.dashCd<=0){p.dash=.16;p.dashCd=2.2;particlesAt(p.x+p.w/2,p.y+18,palettes[level].accent,5);beep(540,.1,'triangle')}
      p.vy=Math.min(560,p.vy+1050*dt);const oldY=p.y;p.x=Math.max(0,Math.min(WORLD-p.w,p.x+p.vx*dt));p.y+=p.vy*dt;p.onGround=false;
      for(const plat of platforms){if(p.x+p.w>plat.x&&p.x<plat.x+plat.w&&oldY+p.h<=plat.y+3&&p.y+p.h>=plat.y&&p.vy>=0){p.y=plat.y-p.h;p.vy=0;p.onGround=true}}
      if(p.y>H+100){p.hp--;p.x=Math.max(35,p.x-160);p.y=300;p.vy=0;p.inv=1.5;showToast('¡Cuidado con el vacío!');if(p.hp<=0){p.hp=0;if(players.every(q=>q.hp<=0))showScreen('over')}}
      if(p.inv<=0){for(const en of enemies){if(en.alive&&Math.abs(p.x+p.w/2-en.x)<24&&Math.abs(p.y+p.h/2-(en.y-8))<27){p.hp--;p.inv=1.2;p.vy=-230;p.vx=-p.dir*140;particlesAt(p.x+p.w/2,p.y+15,'#ff7789',7);beep(130,.15,'sawtooth');if(p.hp<=0){p.hp=0;if(players.every(q=>q.hp<=0))showScreen('over')}break}}}
      for(const gem of gems){if(!gem.taken&&Math.hypot(p.x+p.w/2-gem.x,p.y+p.h/2-gem.y)<26){gem.taken=true;collected++;score+=50;particlesAt(gem.x,gem.y,palettes[level].glow,10);beep(720,.09);updateHud()}}
      if(p.x+p.w>portal.x&&p.y+p.h>portal.y&&portal.open){showScreen('won')}
    }
    for(const en of enemies)if(en.alive){en.x+=en.v*dt;if(en.x<en.min||en.x>en.max){en.v*=-1;en.x=Math.max(en.min,Math.min(en.max,en.x))}const ground=platforms.find(pl=>en.x>=pl.x-5&&en.x<=pl.x+pl.w+5&&pl.y>=350);en.y=ground?ground.y:420}
    portal.open=gems.every(g=>g.taken);for(const q of particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=380*dt;q.life-=dt}particles=particles.filter(q=>q.life>0);
    const target=Math.max(0,Math.min(WORLD-W,(players[0].x+players[0].w/2)-W*.42));camera+=(target-camera)*Math.min(1,dt*5);updateHud();
  }
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
  function drawBackground(){const p=palettes[level],g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,p.sky1);g.addColorStop(1,p.sky2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // moon, pixel stars and distant layered ridges
    ctx.fillStyle=p.glow+'55';ctx.beginPath();ctx.arc(785-camera*.05,112,46,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e7f2e8';ctx.fillRect(780-camera*.05,87,7,7);ctx.fillRect(795-camera*.05,105,4,4);
    for(let i=0;i<45;i++){let x=((i*197-camera*.16)%W+W)%W,y=(i*67%230)+35;rect(x,y, i%4===0?3:2, i%4===0?3:2, i%3===0?'#d9f6e8aa':'#d9eaff55')}
    ctx.fillStyle=p.mount;for(let i=-1;i<8;i++){let x=i*390-(camera*.22%390);ctx.beginPath();ctx.moveTo(x,390);ctx.lineTo(x+190,175+(i%3)*28);ctx.lineTo(x+390,390);ctx.fill()}
    // silhouettes/parallax trees
    for(let i=0;i<14;i++){let x=((i*205-camera*.38)%W+W)%W;rect(x+15,250+(i%4)*25,12,120,p.tree);rect(x,235+(i%4)*25,42,38,p.tree);rect(x+7,215+(i%3)*26,27,34,p.tree);rect(x+5,245+(i%4)*25,32,4,p.accent+'55')}
    clouds.forEach(c=>{const x=(c.x-camera*.1)%W;ctx.fillStyle='#d5efff12';rect(x,c.y,68*c.s,9*c.s,'#d5efff12');rect(x+13*c.s,c.y-8*c.s,30*c.s,10*c.s,'#d5efff10')});
  }
  function draw(){ctx.save();ctx.imageSmoothingEnabled=false;drawBackground();ctx.save();ctx.translate(-Math.floor(camera),0);const p=palettes[level];
    // glowing forest floor
    for(const pl of platforms){rect(pl.x,pl.y,pl.w,pl.h,p.ground);rect(pl.x,pl.y,pl.w,6,p.top);for(let x=pl.x+8;x<pl.x+pl.w-4;x+=20){rect(x,pl.y+12,3,3,'#c7e9ae55');rect(x+8,pl.y+25,4,4,'#101c2b55')}rect(pl.x,pl.y,pl.w,2,p.accent+'66')}
    // twinkling collectibles
    for(const gem of gems)if(!gem.taken){const pulse=1+Math.sin(time*5+gem.phase)*.16;ctx.save();ctx.translate(gem.x,gem.y);ctx.rotate(Math.PI/4);rect(-7*pulse,-7*pulse,14*pulse,14*pulse,p.glow+'44');rect(-5,-5,10,10,p.glow);rect(-2,-2,4,4,'#fff9d6');ctx.restore();ctx.fillStyle=p.glow+'33';ctx.beginPath();ctx.arc(gem.x,gem.y,17+Math.sin(time*4+gem.phase)*3,0,Math.PI*2);ctx.fill()}
    // portal
    ctx.fillStyle=portal.open?p.glow+'55':'#bc77c62a';ctx.beginPath();ctx.ellipse(portal.x+21,portal.y+37,32,43,0,0,Math.PI*2);ctx.fill();rect(portal.x,portal.y,7,70,portal.open?p.glow:'#6f6380');rect(portal.x+35,portal.y,7,70,portal.open?p.glow:'#6f6380');rect(portal.x+6,portal.y,29,6,portal.open?'#e7ffdb':'#82718f');rect(portal.x+8,portal.y+12,26,47,portal.open?'#74f5c966':'#4b426566');if(portal.open){rect(portal.x+17,portal.y+22,8,27,'#f3ffe5');rect(portal.x+11,portal.y+31,20,7,'#f3ffe5')}
    // patrolling forest guardians
    for(const en of enemies)if(en.alive){const bob=Math.sin(time*7+en.t)*2;rect(en.x-11,en.y-24+bob,23,23,'#9b668c');rect(en.x-7,en.y-30+bob,15,9,'#b67da1');rect(en.x-7,en.y-18+bob,5,5,'#fff1c0');rect(en.x+3,en.y-18+bob,5,5,'#fff1c0');rect(en.x-9,en.y-1+bob,7,5,'#443451');rect(en.x+3,en.y-1+bob,7,5,'#443451');rect(en.x-4,en.y-13+bob,9,3,'#503951')}
    // heroes
    players.forEach(pl=>{if(pl.inv>0&&Math.floor(time*15)%2===0)return;const x=pl.x,y=pl.y,primary=pl.index?'#ffbf68':'#56e2b5',dark=pl.index?'#844e55':'#285d64',bob=pl.onGround&&Math.abs(pl.vx)>0?Math.sin(pl.anim)*2:0;
      rect(x+4,y+pl.h-2,21,5,'#08101d66');rect(x+6,y+14+bob,16,16,primary);rect(x+5,y+5+bob,18,14,dark);rect(x+7,y+7+bob,14,10,primary);rect(x+(pl.dir>0?16:7),y+9+bob,4,4,'#f8f2d5');rect(x+(pl.dir>0?17:8),y+10+bob,2,2,'#19223a');rect(x+8,y+27+bob,5,7,'#26324d');rect(x+16,y+27+bob,5,7,'#26324d');rect(x+5,y+3+bob,17,5,pl.index?'#ffdf7b':'#9af6d6');
      if(pl.attack>0){const sx=x+(pl.dir>0?pl.w: -19);rect(sx,y+13,19,4,'#fff5b0');rect(sx+(pl.dir>0?9:4),y+9,4,12,'#fff5b0')}
      if(pl.dash>0){for(let n=1;n<4;n++)rect(x-pl.dir*n*11,y+12,pl.w,18,primary+'55')}
    });
    for(const q of particles){ctx.globalAlpha=Math.max(0,q.life/q.max);rect(q.x,q.y,q.size,q.size,q.color);ctx.globalAlpha=1}
    ctx.restore();
    // subtle vignette/frame lighting
    const vg=ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,600);vg.addColorStop(0,'transparent');vg.addColorStop(1,'#07101c77');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
    if(state==='menu'||state==='paused'){ctx.fillStyle='#06101b18';ctx.fillRect(0,0,W,H)}
    ctx.restore();
  }
  function loop(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop)}
  // Initial scene and a compact instruction hint for keyboard players.
  buildLevel();
  requestAnimationFrame(loop);
})();
