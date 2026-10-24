// World coordinates in metres. Home plate's point is z=0; pitcher is +z.
export const BATTER_HEIGHT=1.88;
export const ZONE = Object.freeze({halfWidth:0.2159,bottom:BATTER_HEIGHT*.27,top:BATTER_HEIGHT*.535,front:0.4318,mid:0.2159});
export const BALL_RADIUS=0.0366;
export const PLATE=[[-ZONE.halfWidth,ZONE.front],[ZONE.halfWidth,ZONE.front],[ZONE.halfWidth,ZONE.halfWidth],[0,0],[-ZONE.halfWidth,ZONE.halfWidth]];
export const DIFFICULTIES={rookie:{label:'入門裁判',duration:0.93,edge:0.20},pro:{label:'職業主審',duration:0.60,edge:0.48},elite:{label:'大聯盟級',duration:0.46,edge:0.76}};
export const PITCH_TYPES=[{id:'fastball',name:'四縫線直球',speed:[142,156],bend:0.045,loft:0.12},{id:'curve',name:'曲球',speed:[112,130],bend:0.18,loft:0.65},{id:'slider',name:'滑球',speed:[128,143],bend:0.58,loft:0.24}];
const lerp=(a,b,t)=>a+(b-a)*t;
export function trajectory(p,t){
  // At t=1 the centre reaches the front of home plate. Continue to the mitt.
  return {x:lerp(-0.38,p.x,t)+p.bend*Math.sin(Math.PI*t),y:lerp(1.98,p.y,t)+p.loft*Math.sin(Math.PI*t),z:lerp(17.6,ZONE.front,t)};
}
function pointSegmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
export function overlapsPlate(x,z,r=BALL_RADIUS){
  let inside=false;
  for(let i=0,j=PLATE.length-1;i<PLATE.length;j=i++){
    const a=PLATE[i],b=PLATE[j];
    if(pointSegmentDistance(x,z,a,b)<=r+1e-9)return true;
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;
}
export const ABS_TIME=(17.6-ZONE.mid)/(17.6-ZONE.front);
export function sampleABS(p){return trajectory(p,ABS_TIME);}
export function absMargin(p){const q=sampleABS(p),dx=Math.max(Math.abs(q.x)-ZONE.halfWidth,0),dy=Math.max(ZONE.bottom-q.y,0,q.y-ZONE.top);return dx||dy?BALL_RADIUS-Math.hypot(dx,dy):BALL_RADIUS+Math.min(ZONE.halfWidth-Math.abs(q.x),q.y-ZONE.bottom,ZONE.top-q.y);}
export function isStrike(p){return absMargin(p)>=-1e-9;}
export function createPitch(difficulty='pro',random=Math.random){
  const d=DIFFICULTIES[difficulty]||DIFFICULTIES.pro;
  const type=PITCH_TYPES[Math.min(2,Math.floor(random()*3))];
  let x=(random()-.5)*.88,y=ZONE.bottom-.19+random()*(ZONE.top-ZONE.bottom+.38);
  if(random()<d.edge){
    const side=Math.floor(random()*4),offset=(random()-.5)*.15;
    if(side<2){x=(side===0?-1:1)*(ZONE.halfWidth+offset);y=ZONE.bottom+random()*(ZONE.top-ZONE.bottom);}
    else{y=(side===2?ZONE.bottom:ZONE.top)+offset;x=(random()-.5)*.49;}
  }
  const speed=Math.round(lerp(type.speed[0],type.speed[1],random()));
  const p={type:type.id,name:type.name,x,y,speed,bend:type.bend,loft:type.loft,duration:d.duration*(148/speed)};
  p.strike=isStrike(p);p.edge=Math.abs(absMargin(p))<.075;
  return p;
}
export class GameSession{
  constructor(mode='challenge',difficulty='pro'){this.mode=mode;this.difficulty=difficulty;this.limit=mode==='challenge'?20:Infinity;this.pitches=[];this.correct=0;this.streak=0;this.maxStreak=0;this.score=0;this.balls=0;this.strikes=0;this.outs=0;this.batters=1;this.plateResult='';}
  get complete(){return this.pitches.length>=this.limit;}
  get accuracy(){return this.pitches.length?Math.round(this.correct/this.pitches.length*100):0;}
  judge(p,call){
    if(this.complete)throw new Error('Session completed');
    if(p.judged)throw new Error('Pitch already judged');
    p.judged=true;const correct=call===p.strike;this.streak=correct?this.streak+1:0;this.maxStreak=Math.max(this.maxStreak,this.streak);
    const points=correct?100+Math.min(this.streak-1,10)*10+(p.edge?50:0):0;
    if(correct)this.correct++;this.score+=points;this.plateResult='';
    // The game follows the umpire's call; the automatic verdict is for feedback.
    if(call)this.strikes++;else this.balls++;
    if(this.strikes===3){this.outs=(this.outs+1)%3;this.plateResult=this.outs===0?'三振出局 · 三出局換局':'三振出局';this.strikes=0;this.balls=0;this.batters++;}
    else if(this.balls===4){this.plateResult='四壞球保送';this.balls=0;this.strikes=0;this.batters++;}
    const result={...p,call,correct,points,number:this.pitches.length+1};this.pitches.push(result);return result;
  }
}
