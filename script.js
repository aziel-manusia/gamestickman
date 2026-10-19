(() => {
const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const ui={clock:$('clock'),pHp:$('playerHp'),pHpText:$('playerHpText'),manaFill:$('manaFill'),manaText:$('manaText'),eHp:$('enemyHp'),eHpText:$('enemyHpText'),className:$('className'),enemyState:$('enemyState'),banner:$('banner'),weapon:$('weapon'),magic:$('magic'),magicGroup:$('magicGroup')};
let W=900,H=460,ground=390,last=0,elapsed=0,paused=false,ended=false,shake=0,particles=[];
const keys={left:false,right:false};
const names={sword:'Pendekar Pedang',bow:'Pemanah',spear:'Penombak',dark:'Penyihir Dark',light:'Penyihir Light',blood:'Penyihir Blood'};
const player={x:220,y:0,vx:0,vy:0,dir:1,hp:2000,maxHp:2000,mana:1000,maxMana:1000,weapon:'sword',magic:'dark',attackCd:0,skillCd:[0,0,0],invuln:0,block:0,stun:0,arrows:40,combo:0,comboTimer:0,airVolley:0,rapid:0,lightCharges:0,lightMode:false,bloodMode:false,thrown:0,black:0,domain:0};
const enemy={x:650,y:0,vx:0,vy:0,dir:-1,hp:2500,maxHp:2500,attackCd:0,skillCd:[0,0,0],block:0,shield:0,stun:0,arrows:25,mode:'mendekat',think:0};
function resize(){const r=canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);W=r.width;H=r.height;ground=H-58;player.y=player.y||ground;enemy.y=enemy.y||ground;}
new ResizeObserver(resize).observe(canvas);resize();
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function toast(t){ui.banner.textContent=t;ui.banner.classList.remove('hidden');setTimeout(()=>ui.banner.classList.add('hidden'),1500)}
function puff(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.8)*5,life:30,color,r:2+Math.random()*3})}
function hit(target,damage,kind='normal'){
 if(target===enemy){
  if(enemy.block>0){puff(enemy.x,enemy.y-40,'#c9f5ff',4);return}
  if(enemy.shield>0)damage*=.5;
  damage*=Math.max(.5,1-player.black*.01);
  if(player.domain>0)damage*=1.5;
  target.hp=Math.max(0,target.hp-Math.round(damage));puff(target.x,target.y-35,kind==='magic'?'#c59bff':'#ffdc8c',7);
 }else{
  if(player.block>0||player.invuln>0){puff(player.x,player.y-35,'#8de7ff',5);return}
  if(player.weapon==='magic'&&player.magic==='dark'&&player.block>0)return;
  target.hp=Math.max(0,target.hp-Math.round(damage));puff(target.x,target.y-35,'#ff6f8d',7);
 }
}
function playerAttack(){
 if(ended||paused||player.stun>0||player.attackCd>0)return;
 const dist=Math.abs(enemy.x-player.x),range=player.weapon==='bow'?W*.8:player.weapon==='magic'?W*.72:92;
 if(dist>range){if(player.weapon!=='bow'&&player.weapon!=='magic'){toast('Terlalu jauh!');return}}
 player.dir=enemy.x>=player.x?1:-1;
 if(player.weapon==='sword'){hit(enemy,50);player.attackCd=.42}
 else if(player.weapon==='bow'){
  if(player.arrows<=0){toast('Anak panah habis!');return}
  player.arrows--;hit(enemy,25,'magic');player.attackCd=.5;
 }else if(player.weapon==='spear'){
  player.combo++;player.comboTimer=1.4;
  const dmg=player.combo%4===0?75:50;hit(enemy,dmg);player.attackCd=.35;
 }else{
  if(player.mana<25){toast('Mana tidak cukup!');return}
  player.mana-=25;hit(enemy,100,'magic');player.attackCd=player.magic==='blood'?1:1.5;
 }
}
function skill(n){
 if(ended||paused||player.stun>0)return;
 const w=player.weapon,m=player.magic;
 if(w==='sword'){
  if(n===1&&player.skillCd[0]<=0){player.block=1;player.skillCd[0]=1;toast('Tangkisan!')}
  if(n===2&&player.skillCd[1]<=0){player.x=clamp(enemy.x-player.dir*70,25,W-25);player.dir=enemy.x>=player.x?1:-1;hit(enemy,250);player.skillCd[1]=35;puff(player.x,player.y-20,'#a9e7ff',14)}
  if(n===3&&player.skillCd[2]<=0){player.block=1.2;player.skillCd[2]=12;toast('Pertahanan pendekar!')}
 }else if(w==='bow'){
  if(n===1&&player.skillCd[0]<=0){player.airVolley=5;player.vy=-11;player.skillCd[0]=30;toast('Hujan panah!')}
  if(n===2&&player.arrows>15){player.x=clamp(player.x-player.dir*115,20,W-20);for(let i=0;i<15;i++)setTimeout(()=>{if(!ended)hit(enemy,25,'magic')},i*75);player.arrows-=15;puff(player.x,player.y-25,'#d9f5ff',12)}
  if(n===3&&player.skillCd[2]<=0){player.x=clamp(enemy.x-player.dir*42,20,W-20);player.dir=enemy.x>=player.x?1:-1;hit(enemy,200);player.skillCd[2]=60;puff(enemy.x,enemy.y-30,'#f7f2d1',12)}
 }else if(w==='spear'){
  if(n===1&&player.skillCd[0]<=0){player.x=clamp(player.x+player.dir*135,20,W-20);hit(enemy,175);player.skillCd[0]=25;puff(enemy.x,enemy.y-20,'#ffe29c',10)}
  if(n===2&&player.skillCd[1]<=0&&player.thrown<=0){hit(enemy,100);player.thrown=15;player.skillCd[1]=15;toast('Tombak menancap! Dagger: basic attack 35')}
  if(n===3&&player.thrown>0){hit(enemy,35);player.attackCd=.25}
 }else if(w==='magic'){
  if(m==='dark'){
   if(n===1&&player.skillCd[0]<=0&&player.mana>=300){player.mana-=300;for(let i=0;i<6;i++)setTimeout(()=>{if(!ended){hit(enemy,45,'magic');player.black=clamp(player.black+1,0,25)}},i*160);player.skillCd[0]=60;toast('Black curse: pertahanan musuh turun!')}
   if(n===2&&player.skillCd[1]<=0&&player.mana>=30){player.mana-=30;player.block=2;player.skillCd[1]=40;toast('Dinding dark aktif')}
   if(n===3&&player.skillCd[2]<=0&&player.mana>=250){player.mana-=250;player.domain=10;player.x=W*.5;enemy.x=W*.5+45;enemy.stun=2;player.skillCd[2]=45;toast('DOMAIN DARK! Damage +50%');puff(W*.5,ground-50,'#8c56e8',40)}
  }else if(m==='light'){
   if(n===1){player.lightMode=!player.lightMode;toast(player.lightMode?'Light mode aktif':'Light mode mati')}
   if(n===2&&player.mana>=100&&player.skillCd[1]<=0){player.lightCharges=clamp(player.lightCharges+1,1,5);player.mana-=100;player.skillCd[1]=1;toast('Muatan cahaya: '+player.lightCharges+'/5')}
   if(n===3&&player.mana>=350&&player.skillCd[2]<=0){player.mana-=350;hit(enemy,1000,'magic');player.skillCd[2]=8;puff(player.x+player.dir*100,ground-40,'#fff6a1',28);toast('KAMEHAMEHA CAHAYA!')}
  }else{
   if(n===1&&player.skillCd[0]<=0&&player.mana>=50){player.mana-=50;enemy.stun=2.5;player.skillCd[0]=35;setTimeout(()=>{if(!ended)player.hp=Math.min(player.maxHp,player.hp+200)},1000);toast('Blood mark: stun + lifesteal')}
   if(n===2&&!player.bloodMode&&player.mana>=250){player.mana-=250;player.bloodMode=true;toast('Lima simbol darah aktif')}
   else if(n===2&&player.bloodMode){player.bloodMode=false;toast('Mode simbol darah mati')}
   if(n===3&&player.skillCd[2]<=0&&enemy.hp<=750&&player.hp>250){player.hp-=250;player.x=clamp(enemy.x-player.dir*50,20,W-20);player.dir=enemy.x>=player.x?1:-1;hit(enemy,500,'magic');player.skillCd[2]=35;toast('BLOOD FINISHER!')}
   else if(n===3&&enemy.hp>750)toast('Finisher hanya saat HP musuh ≤ 750')
  }
 }
}
function enemyAI(dt){
 if(enemy.hp<=0||player.hp<=0)return;
 enemy.attackCd=Math.max(0,enemy.attackCd-dt);enemy.skillCd=enemy.skillCd.map(x=>Math.max(0,x-dt));enemy.block=Math.max(0,enemy.block-dt);enemy.shield=Math.max(0,enemy.shield-dt);enemy.stun=Math.max(0,enemy.stun-dt);
 player.block=Math.max(0,player.block-dt);player.invuln=Math.max(0,player.invuln-dt);player.stun=Math.max(0,player.stun-dt);
 if(enemy.stun>0)return;
 const dist=Math.abs(enemy.x-player.x);enemy.dir=player.x>=enemy.x?1:-1;
 if(dist>115){enemy.x+=enemy.dir* Math.min(95*dt,dist-90);enemy.mode='Mendekat'}
 else if(dist<70){enemy.x-=enemy.dir*35*dt;enemy.mode='Menjaga jarak'}
 else enemy.mode='Menyerang';
 // AI occasionally blocks, shields, and uses skills autonomously.
 if(enemy.skillCd[0]<=0&&Math.random()<.0035){enemy.shield=30;enemy.skillCd[0]=120;enemy.mode='Shield aktif'}
 if(enemy.skillCd[1]<=0&&dist>90&&dist<260&&Math.random()<.012){enemy.x=clamp(enemy.x+enemy.dir*100,20,W-20);hit(player,150);enemy.skillCd[1]=60;enemy.mode='Dash tebas'}
 if(enemy.attackCd<=0){
  if(dist<110){if(Math.random()<.16){enemy.block=.55;enemy.mode='Menangkis'}else hit(player,75);enemy.attackCd=.9}
  else if(dist<Math.min(W*.8,500)&&enemy.arrows>0){hit(player,25);enemy.arrows--;enemy.attackCd=.65}
 }
 if(enemy.arrows<25&&Math.random()<.003)enemy.arrows++;
}
function update(dt){
 if(paused||ended)return;
 elapsed+=dt;player.attackCd=Math.max(0,player.attackCd-dt);player.skillCd=player.skillCd.map(x=>Math.max(0,x-dt));player.comboTimer=Math.max(0,player.comboTimer-dt);
 if(player.comboTimer===0)player.combo=0;
 if(player.thrown>0){player.thrown=Math.max(0,player.thrown-dt);if(player.thrown===0)toast('Tombak kembali!')}
 if(player.domain>0)player.domain=Math.max(0,player.domain-dt);
 if(player.x>W-20)player.x=W-20;if(player.x<20)player.x=20;
 player.vx=(keys.right?1:0)-(keys.left?1:0);player.x+=player.vx*230*dt;if(player.vx)player.dir=Math.sign(player.vx);
 player.vy+=600*dt;player.y+=player.vy*dt;if(player.y>ground){player.y=ground;player.vy=0}
 if(player.airVolley>0){player.airVolley-=dt;player.vy=Math.min(player.vy,0);if(Math.random()<.32&&player.arrows>0){hit(enemy,25,'magic');player.arrows--}}
 enemyAI(dt);
 for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.life--}particles=particles.filter(p=>p.life>0);
 if(player.hp<=0){player.hp=0;ended=true;toast('KAMU KALAH!');ui.banner.textContent='KAMU KALAH';ui.banner.classList.remove('hidden')}
 if(enemy.hp<=0){enemy.hp=0;ended=true;toast('KAMU MENANG!');ui.banner.textContent='KAMU MENANG!';ui.banner.classList.remove('hidden')}
 updateUI();
}
function updateUI(){
 ui.pHp.style.width=player.hp/player.maxHp*100+'%';ui.pHpText.textContent=`${Math.ceil(player.hp)} / 2000 HP`;
 ui.eHp.style.width=enemy.hp/enemy.maxHp*100+'%';ui.eHpText.textContent=`${Math.ceil(enemy.hp)} / 2500 HP`;
 ui.manaFill.style.width=player.mana/player.maxMana*100+'%';ui.manaText.textContent=player.weapon==='magic'?`${Math.ceil(player.mana)} / 1000 MP`:`Panah: ${player.arrows}`;
 let t=Math.floor(elapsed),phase=t%720,clock=Math.floor(t/60).toString().padStart(2,'0')+':'+Math.floor(t%60).toString().padStart(2,'0');
 let time=phase<120?'PAGI':phase<360?'SIANG':phase<450?'SORE':phase<600?'MALAM':'PAGI';
 ui.clock.textContent=clock+' • '+time;ui.className.textContent=player.weapon==='magic'?names[player.magic]:names[player.weapon];ui.enemyState.textContent=enemy.shield>0?'Shield 50%':enemy.mode;
 ui.magicGroup.style.display=player.weapon==='magic'?'flex':'none';
}
function drawStick(f,isEnemy=false){
 const x=f.x,y=f.y,dir=f.dir;ctx.save();ctx.translate(x,y);ctx.scale(dir,1);
 const col=isEnemy?'#f9faff':'#111827',accent=isEnemy?'#ff5e70':'#6ef0ff';
 ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=col;ctx.lineWidth=5;
 // legs
 ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(-12,-7);ctx.lineTo(-17,0);ctx.moveTo(0,-27);ctx.lineTo(12,-8);ctx.lineTo(17,0);ctx.stroke();
 // body and arms
 ctx.beginPath();ctx.moveTo(0,-57);ctx.lineTo(0,-27);ctx.moveTo(0,-50);ctx.lineTo(14,-40);ctx.lineTo(25,-48);ctx.moveTo(0,-50);ctx.lineTo(-12,-39);ctx.stroke();
 // head
 ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,-68,11,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-6,-70);ctx.lineTo(6,-70);ctx.stroke();
 // weapon silhouette
 ctx.strokeStyle=isEnemy?'#f2d8ad':'#d8f6ff';ctx.lineWidth=3;
 if(isEnemy||f.weapon==='sword'){ctx.beginPath();ctx.moveTo(24,-48);ctx.lineTo(39,-78);ctx.stroke();ctx.strokeStyle=accent;ctx.beginPath();ctx.moveTo(31,-65);ctx.lineTo(42,-60);ctx.stroke()}
 else if(f.weapon==='bow'){ctx.beginPath();ctx.arc(29,-51,15,-1.2,1.2);ctx.moveTo(34,-65);ctx.lineTo(34,-37);ctx.stroke()}
 else if(f.weapon==='spear'){ctx.beginPath();ctx.moveTo(23,-39);ctx.lineTo(45,-82);ctx.lineTo(39,-76);ctx.stroke()}
 else {ctx.strokeStyle=f.magic==='dark'?'#9c65ff':f.magic==='light'?'#fff2a8':'#ff557c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(23,-39);ctx.lineTo(37,-73);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.font='bold 15px sans-serif';ctx.fillText(f.magic==='dark'?'<^>':f.magic==='light'?'♦×':'♥',27,-78)}
 if(!isEnemy&&f.block>0){ctx.strokeStyle='#8eeaff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-43,35,-1.5,1.5);ctx.stroke()}
 ctx.restore();
}
function draw(){
 const day=(Math.floor(elapsed/60)%12),night=day>=7.5,evening=day>=6&&day<7.5;
 let sky=night?'#101a3e':evening?'#f18a70':day>=2&&day<6?'#70c9ed':'#9ddcf2';
 ctx.clearRect(0,0,W,H);let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,sky);g.addColorStop(1,night?'#52628e':'#e3f5ff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // sun/moon
 ctx.fillStyle=night?'#f5f0ce':'#fff1a6';ctx.beginPath();ctx.arc(W*.58,H*.2,night?19:25,0,Math.PI*2);ctx.fill();
 if(night){ctx.fillStyle='#101a3e';ctx.beginPath();ctx.arc(W*.59,H*.18,17,0,Math.PI*2);ctx.fill();for(let i=0;i<25;i++){ctx.fillStyle='#fff';ctx.fillRect((i*73)%W,(i*31)%(H*.45),2,2)}}
 // clouds and rainbow in daytime
 ctx.fillStyle='#ffffff9c';for(let i=0;i<4;i++){let x=((i*W*.31+elapsed*5)%(W+120))-60,y=H*(.15+(i%3)*.09);ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.arc(x+20,y-8,23,0,Math.PI*2);ctx.arc(x+43,y,16,0,Math.PI*2);ctx.fill()}
 if(!night&&!evening&&day>=2&&day<6){ctx.lineWidth=5;['#ff7777','#ffca73','#fff08a','#83df9d','#79baff','#b29aff'].forEach((c,i)=>{ctx.strokeStyle=c;ctx.beginPath();ctx.arc(W*.72,H*.43,75+i*6,Math.PI,Math.PI*1.9);ctx.stroke()})}
 // distant mountains
 ctx.fillStyle=night?'#34446b':'#7cabc4';ctx.beginPath();ctx.moveTo(0,H*.72);ctx.lineTo(W*.18,H*.35);ctx.lineTo(W*.34,H*.68);ctx.lineTo(W*.5,H*.42);ctx.lineTo(W*.72,H*.72);ctx.lineTo(W*.87,H*.46);ctx.lineTo(W,H*.69);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
 ctx.fillStyle=night?'#263755':'#648fa8';ctx.beginPath();ctx.moveTo(0,H*.8);ctx.lineTo(W*.3,H*.55);ctx.lineTo(W*.5,H*.77);ctx.lineTo(W*.72,H*.57);ctx.lineTo(W,H*.8);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
 // large tree on left
 ctx.fillStyle='#62462f';ctx.fillRect(42,ground-112,22,112);ctx.fillStyle=night?'#214b43':'#2c865b';
 [[52,ground-135,42],[29,ground-115,32],[72,ground-112,35],[50,ground-93,36]].forEach(a=>{ctx.beginPath();ctx.arc(a[0],a[1],a[2],0,Math.PI*2);ctx.fill()});
 // ground
 ctx.fillStyle=night?'#273a39':'#4b9866';ctx.fillRect(0,ground,W,H-ground);ctx.fillStyle=night?'#49625a':'#91c87b';ctx.fillRect(0,ground,W,5);
 // small grass
 ctx.strokeStyle=night?'#5b7563':'#d1ef9c';ctx.lineWidth=2;for(let i=0;i<W;i+=24){ctx.beginPath();ctx.moveTo(i,ground+8);ctx.lineTo(i-4,ground+1);ctx.stroke()}
 // domain effect
 if(player.domain>0){ctx.fillStyle='#1a0638aa';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#b27bff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(W*.5,H*.5,60+Math.sin(elapsed*5)*12,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e4c7ff';ctx.font='bold 18px sans-serif';ctx.fillText('DOMAIN DARK',W*.5-68,H*.5)}
 drawStick(player);drawStick(enemy,true);
 // health labels over fighters
 ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('PLAYER',player.x,player.y-93);ctx.fillText('AI',enemy.x,enemy.y-93);ctx.textAlign='left';
 for(const p of particles){ctx.globalAlpha=clamp(p.life/30,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
}
function loop(ts){if(!last)last=ts;const dt=Math.min((ts-last)/1000,.04);last=ts;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
function jump(){if(player.y>=ground-1&&!paused&&!ended){player.vy=-250}}
document.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key.toLowerCase()==='a'||e.key==='ArrowLeft')keys.left=true;if(e.key.toLowerCase()==='d'||e.key==='ArrowRight')keys.right=true;if(e.repeat)return;const k=e.key.toLowerCase();if(k==='j'||k===' ')playerAttack();if(k==='k')skill(1);if(k==='l')skill(2);if(k==='i')skill(3);if(k==='w'||k==='ArrowUp')jump()});
document.addEventListener('keyup',e=>{if(e.key.toLowerCase()==='a'||e.key==='ArrowLeft')keys.left=false;if(e.key.toLowerCase()==='d'||e.key==='ArrowRight')keys.right=false});
document.querySelectorAll('[data-hold]').forEach(b=>{const k=b.dataset.hold;const on=e=>{e.preventDefault();keys[k]=true},off=e=>{e.preventDefault();keys[k]=false};b.addEventListener('pointerdown',on);['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,off))});
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.action;if(a==='attack')playerAttack();else if(a==='jump')jump();else skill(Number(a.slice(-1)))}));
ui.weapon.addEventListener('change',()=>{player.weapon=ui.weapon.value;player.skillCd=[0,0,0];updateUI();toast(names[player.weapon])});
ui.magic.addEventListener('change',()=>{player.magic=ui.magic.value;updateUI();toast(names[player.magic])});
$('pauseBtn').addEventListener('click',()=>{paused=!paused;$('pauseBtn').textContent=paused?'▶':'Ⅱ';if(paused)toast('DIJEDA')});
$('restartBtn').addEventListener('click',()=>{Object.assign(player,{x:220,y:ground,vx:0,vy:0,dir:1,hp:2000,mana:1000,attackCd:0,skillCd:[0,0,0],invuln:0,block:0,stun:0,arrows:40,combo:0,comboTimer:0,airVolley:0,rapid:0,lightCharges:0,lightMode:false,bloodMode:false,thrown:0,black:0,domain:0});Object.assign(enemy,{x:W-220,y:ground,vx:0,dir:-1,hp:2500,attackCd:0,skillCd:[0,0,0],block:0,shield:0,stun:0,arrows:25,mode:'Mendekat'});elapsed=0;ended=false;paused=false;particles=[];ui.banner.classList.add('hidden');$('pauseBtn').textContent='Ⅱ';updateUI()});
updateUI();
})();