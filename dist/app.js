import {GameSession,createPitch,ZONE,DIFFICULTIES,sampleABS,absMargin} from './engine.js';
const $=id=>document.getElementById(id);
const ui={start:$('start-btn'),strike:$('strike-btn'),ball:$('ball-btn'),next:$('next-btn'),replay:$('replay-btn'),pause:$('pause-btn'),reset:$('reset-btn'),intro:$('intro'),result:$('result-overlay'),status:$('status'),difficulty:$('difficulty'),zone:$('zone-toggle')};
let park,session,pitch,lastResult,state='idle',paused=false,mode='challenge',phaseTime=0,replayTime=0,lastTime=performance.now(),sound=false,audio,helpPaused=false;
const difficulty=()=>ui.difficulty.value;
function status(text,tone=''){ui.status.textContent=text;ui.status.className='field-status '+tone;}
function beep(kind){
  if(!sound)return;
  try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();
    const now=audio.currentTime;
    if(kind==='catch'){
      const length=Math.floor(audio.sampleRate*.10),buffer=audio.createBuffer(1,length,audio.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/length*10);const noise=audio.createBufferSource();noise.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;const gain=audio.createGain();gain.gain.value=.55;noise.connect(filter).connect(gain).connect(audio.destination);noise.start();return;
    }
    const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(kind==='correct'?660:180,now);osc.frequency.exponentialRampToValueAtTime(kind==='correct'?920:110,now+.15);gain.gain.setValueAtTime(.10,now);gain.gain.exponentialRampToValueAtTime(.001,now+.22);osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+.23);
  }catch{/* Audio is optional on browsers without an audio device. */}
}
function getBest(){try{return JSON.parse(localStorage.getItem('the-call-best-abs-v2')||'{}');}catch{return {};}}
function updateBest(){const record=getBest()[difficulty()];$('best-mode').textContent=DIFFICULTIES[difficulty()].label;$('best-score').textContent=record?record.score.toLocaleString()+' PTS':'—';}
function saveBest(){if(session.mode!=='challenge')return;const best=getBest(),old=best[session.difficulty];if(!old||session.score>old.score){best[session.difficulty]={score:session.score,accuracy:session.accuracy,date:new Date().toISOString()};try{localStorage.setItem('the-call-best-abs-v2',JSON.stringify(best));}catch{}}updateBest();}
function lockSetup(locked){ui.difficulty.disabled=locked;document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=locked);ui.zone.disabled=mode!=='practice';}
function controls(){const ready=state==='awaiting'&&!paused;ui.strike.disabled=!ready;ui.ball.disabled=!ready;ui.next.disabled=state!=='review'||paused;ui.replay.disabled=!['review','replay'].includes(state)||paused||!pitch;ui.replay.textContent=state==='replay'?'← 返回主審':'↺ ABS 判決回放';ui.pause.disabled=['idle','finished','error'].includes(state);ui.pause.textContent=paused?'▶ 繼續':'Ⅱ 暫停';ui.reset.disabled=state==='idle'||state==='error';ui.next.firstChild.textContent=state==='review'?(session.complete?'查看結算 ':'投下一球 '):state==='awaiting'?'請做出判決 ':'等待投球 ';}
function updateMetrics(){const s=session;$('accuracy').textContent=s?.pitches.length?s.accuracy:'—';$('accuracy-arc').style.strokeDashoffset=207.35*(1-(s?.pitches.length?s.accuracy:0)/100);$('correct-count').replaceChildren();const cc=$('correct-count');cc.append(document.createTextNode(s?.correct??0));const suffix=document.createElement('span');suffix.textContent='/ '+(s?.pitches.length??0);cc.append(suffix);$('streak').textContent=s?.streak??0;$('score').textContent=(s?.score??0).toLocaleString();['ball','strike','out'].forEach((name)=>{const count=s?.[{ball:'balls',strike:'strikes',out:'outs'}[name]]??0;[...$(name+'-lamps').children].forEach((lamp,i)=>lamp.classList.toggle('on',i<count));});}
function clearReview(){lastResult=null;$('chart-points').replaceChildren();$('chart-empty').style.display='';$('history').replaceChildren();$('verdict').className='verdict';$('verdict-title').textContent='你的判決，即將開始。';$('verdict-detail').textContent='接球後，按下好球或壞球。';}
function setupMode(){document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});$('mode-label').textContent=mode==='challenge'?'20 球挑戰':'自由練習';$('pitch-total').textContent=mode==='challenge'?'20':'∞';$('mode-description').textContent=mode==='challenge'?'20 球決勝負，考驗你的判決準確度。':'不限球數，觀察球路並建立你的好球帶。';$('zone-note').textContent=mode==='challenge'?'正式挑戰於判決後揭示':'練習時可隨時切換輔助框線';ui.zone.disabled=mode!=='practice';$('zone-label').textContent=mode==='practice'&&ui.zone.checked?'好球帶輔助已開啟':'好球帶於判決後顯示';}
function reset(){session=null;pitch=null;state='idle';paused=false;phaseTime=0;ui.intro.hidden=false;ui.result.hidden=true;$('abs-overlay').hidden=true;$('pause-overlay').hidden=true;$('pitch-info').hidden=true;$('pitch-number').textContent='00';park?.prepare();park?.setZone(mode==='practice'&&ui.zone.checked);clearReview();lockSetup(false);updateMetrics();setupMode();controls();status('準備進場');updateBest();}
function start(){if(!park||!park.illustrated.loaded||state!=='idle')return;session=new GameSession(mode,difficulty());ui.intro.hidden=true;lockSetup(true);beep('start');nextPitch();}
function nextPitch(){if(!session||paused)return;if(session.complete){finish();return;}pitch=createPitch(session.difficulty);state='windup';phaseTime=0;park.prepare();park.setZone(mode==='practice'&&ui.zone.checked);$('pitch-number').textContent=String(session.pitches.length+1).padStart(2,'0');$('pitch-info').hidden=true;status('投手準備中');controls();}
function judge(call){if(state!=='awaiting'||paused)return;lastResult=session.judge(pitch,call);state='review';park.reveal(pitch,lastResult.correct);$('pitch-info').hidden=false;$('pitch-type').textContent=pitch.name;$('pitch-speed').textContent=pitch.speed;
  const actual=pitch.strike?'好球':'壞球',yourCall=call?'好球':'壞球';
  status(lastResult.correct?'判決正確 · '+actual:'判決失誤 · 實際為'+actual,lastResult.correct?'correct':'wrong');
  $('verdict').className='verdict '+(lastResult.correct?'correct':'wrong');$('verdict-title').textContent=lastResult.correct?`判決正確！${pitch.edge?'邊角球獎勵 ':''}+${lastResult.points}`:`判決失誤，這是一顆${actual}。`;
  $('verdict-detail').textContent=`你的判決：${yourCall} · 實際：${actual}。${session.plateResult||`${pitch.name} ${pitch.speed} km/h`}`;
  drawChart();updateMetrics();controls();beep(lastResult.correct?'correct':'wrong');
}
function drawChart(){const g=$('chart-points');g.replaceChildren();$('chart-empty').style.display='none';const records=session.pitches.slice(-20);for(let i=0;i<records.length;i++){const p=records[i],q=sampleABS(p),x=125+q.x*(90/(ZONE.halfWidth*2)),y=161-(q.y-ZONE.bottom)*(126/(ZONE.top-ZONE.bottom)),last=i===records.length-1;const el=document.createElementNS('http://www.w3.org/2000/svg','circle');el.setAttribute('cx',Math.max(7,Math.min(243,x)));el.setAttribute('cy',Math.max(7,Math.min(171,y)));el.setAttribute('r',last?'6':'3.3');el.setAttribute('fill',p.correct?'#d5ee8d':'#ec827a');el.setAttribute('opacity',last?'1':'.35');if(last){el.setAttribute('stroke','#e9eedf');el.setAttribute('stroke-width','1.5');}const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=`第${p.number}球 ${p.strike?'好球':'壞球'} · ${p.correct?'正確':'失誤'}`;el.append(title);g.append(el);}
  const history=$('history');history.replaceChildren();session.pitches.slice(-10).forEach(p=>{const dot=document.createElement('span');dot.className=p.correct?'':'miss';dot.textContent=(p.correct?'✓ ':'× ')+String(p.number).padStart(2,'0');dot.title=`第${p.number}球：${p.correct?'判決正確':'判決失誤'}`;history.append(dot);});
}
function resetABS(){
  replayTime=0;park.startABS(pitch);$('abs-ruling').hidden=true;$('abs-phase').textContent='TRACKING PITCH';$('abs-progress').style.width='0%';
  document.querySelectorAll('[data-abs-view]').forEach(b=>b.classList.toggle('active',b.dataset.absView==='orbit'));
}
function toggleReplay(){
  if(paused||!pitch)return;if(state==='replay'){endReplay();return;}if(state!=='review')return;
  state='replay';$('abs-overlay').hidden=false;$('abs-original').textContent=lastResult.call?'STRIKE / 好球':'BALL / 壞球';$('abs-pitch-label').textContent=`${pitch.name} · ${pitch.speed} km/h`;
  resetABS();status('ABS 判決回放');controls();
}
function endReplay(){
  state='review';$('abs-overlay').hidden=true;park.catchBall();park.reveal(pitch,lastResult.correct);status('回放結束 · '+(pitch.strike?'好球':'壞球'),lastResult.correct?'correct':'wrong');controls();
}
function updateABS(){
  park.updateABS(replayTime);$('abs-progress').style.width=Math.min(replayTime/4.5,1)*100+'%';
  if(replayTime>=3.6){
    $('abs-ruling').hidden=false;$('abs-ruling').className='abs-ruling '+(pitch.strike?'is-strike':'is-ball');$('abs-result').textContent=pitch.strike?'STRIKE':'BALL';
    $('abs-decision').textContent=lastResult.correct?'CALL CONFIRMED · 維持原判':'CALL OVERTURNED · 改判';
    const margin=absMargin(pitch);$('abs-margin').textContent=(pitch.strike?'球體進入好球帶 ':'球體距離好球帶 ')+(Math.abs(margin)*100).toFixed(1)+' cm';
    $('abs-phase').textContent='REVIEW COMPLETE';
  }else $('abs-phase').textContent=replayTime>2.3?'MID-PLATE ANALYSIS':'TRACKING PITCH';
}
$('abs-close').addEventListener('click',()=>{if(state==='replay'&&!paused)endReplay();});
$('abs-again').addEventListener('click',()=>{if(state==='replay'&&!paused)resetABS();});
document.querySelectorAll('[data-abs-view]').forEach(b=>b.addEventListener('click',()=>{if(state!=='replay'||paused)return;park.setABSView(b.dataset.absView);document.querySelectorAll('[data-abs-view]').forEach(v=>v.classList.toggle('active',v===b));}));
function togglePause(){if(['idle','finished','error'].includes(state))return;paused=!paused;$('pause-overlay').hidden=!paused;controls();}
function finish(){if(!session||!session.complete)return;state='finished';park.catchBall();ui.result.hidden=false;const a=session.accuracy;$('result-title').textContent=a>=90?'王牌主審':a>=75?'穩健執法':a>=50?'持續磨練':'再練一場，找回節奏';$('final-accuracy').textContent=a;$('final-description').textContent=`${DIFFICULTIES[session.difficulty].label} · 20 球挑戰完成。`;$('final-correct').textContent=session.correct+' / 20';$('final-streak').textContent=session.maxStreak;$('final-score').textContent=session.score.toLocaleString();status('執法完成');saveBest();lockSetup(false);controls();}
ui.start.addEventListener('click',start);ui.strike.addEventListener('click',()=>judge(true));ui.ball.addEventListener('click',()=>judge(false));ui.next.addEventListener('click',()=>{if(state==='review')nextPitch();});ui.replay.addEventListener('click',toggleReplay);ui.pause.addEventListener('click',togglePause);$('resume-btn').addEventListener('click',togglePause);ui.reset.addEventListener('click',reset);$('again-btn').addEventListener('click',()=>{reset();start();});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;mode=b.dataset.mode;reset();}));ui.difficulty.addEventListener('change',reset);ui.zone.addEventListener('change',()=>{park?.setZone(['review','replay'].includes(state)||mode==='practice'&&ui.zone.checked);setupMode();});
$('sound-btn').addEventListener('click',()=>{sound=!sound;$('sound-btn').setAttribute('aria-pressed',String(sound));$('sound-btn').setAttribute('aria-label',sound?'關閉音效':'開啟音效');$('sound-btn').innerHTML=sound?'<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM17 8q6 4 0 8M19 4q10 8 0 16"/></svg>':'<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM17 8l5 8m0-8-5 8"/></svg>';if(sound)beep('correct');});
$('fullscreen-btn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{status('此瀏覽器不支援全螢幕');}});
const dialog=$('help-dialog');$('help-btn').addEventListener('click',()=>{helpPaused=!paused&&!['idle','finished','error'].includes(state);if(helpPaused)togglePause();dialog.showModal();});$('help-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{if(helpPaused&&paused)togglePause();helpPaused=false;});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&!['idle','finished','error'].includes(state))togglePause();});
document.addEventListener('keydown',e=>{if(dialog.open||e.repeat||['SELECT','INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(['Space','KeyR','KeyP'].includes(e.code))e.preventDefault();if(e.code==='Space'){if(state==='idle')start();else if(state==='review'&&!paused)nextPitch();else if(state==='finished'){reset();start();}}if(e.code==='KeyR')toggleReplay();if(e.code==='KeyP')togglePause();});
function frame(now){const dt=Math.min((now-lastTime)/1000,.06);lastTime=now;if(park&&!paused){
  if(state==='windup'){phaseTime+=dt;park.windup(Math.min(1,phaseTime/1.65));if(phaseTime>=1.65){state='flight';phaseTime=0;status('觀察球路');}}
  else if(state==='flight'){phaseTime+=dt;const t=phaseTime/pitch.duration;park.moveBall(pitch,Math.min(t,1.034));if(t>=1.034){park.catchBall();state='awaiting';status('輪到你了 · 好球還是壞球？');controls();beep('catch');}}
  else if(state==='replay'){replayTime=Math.min(replayTime+dt,6);updateABS();}
  park.render(now/1000);
}requestAnimationFrame(frame);}
reset();ui.start.disabled=true;status('人物素材載入中');
try{const {Ballpark}=await import('./scene.js');park=new Ballpark($('field'));await park.assetsReady;ui.start.disabled=false;status('準備進場');park.setZone(mode==='practice'&&ui.zone.checked);requestAnimationFrame(frame);}
catch(error){console.error('Ballpark initialization failed',error);state='error';ui.intro.hidden=true;$('load-error').hidden=false;controls();status('球場載入失敗');}
$('field').addEventListener('webglcontextlost',e=>{e.preventDefault();if(!paused)togglePause();status('繪圖連線中斷，請重新載入');});
