export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const lerp=(a,b,t)=>a+(b-a)*t;
export function blendPose(a,b,t){const p={};for(const k of Object.keys(a))p[k]=[lerp(a[k][0],b[k][0],t),lerp(a[k][1],b[k][1],t)];return p;}
export function motionSample(time,stops){
  if(time<=stops[0][0])return {a:stops[0][1],b:stops[0][1],mix:0};
  for(let i=1;i<stops.length;i++)if(time<=stops[i][0])return {a:stops[i-1][1],b:stops[i][1],mix:smooth((time-stops[i-1][0])/(stops[i][0]-stops[i-1][0]))};
  const last=stops.at(-1)[1];return {a:last,b:last,mix:0};
}
export const WINDUP_STOPS=[[0,0],[.28,1],[.72,2],[1,3]];
export const FOLLOW_STOPS=[[0,3],[.65,4],[1.55,5]];
export const BONES=[['hipL','hipR',.13],['hip','chest',.18],['neck','head',.13],['shoulderL','elbowL',.085],['elbowL','wristL',.065],['shoulderR','elbowR',.085],['elbowR','wristR',.065],['hipL','kneeL',.115],['kneeL','ankleL',.09],['hipR','kneeR',.115],['kneeR','ankleR',.09]];
// Image-space joint landmarks. Labels follow each anatomical limb through
// trunk rotation, rather than switching limbs when they cross on screen.
export const PITCH_POSES=[
 {head:[.56,.11],neck:[.55,.18],shoulderL:[.47,.23],shoulderR:[.65,.23],elbowL:[.42,.34],elbowR:[.67,.35],wristL:[.52,.27],wristR:[.55,.28],hipL:[.50,.44],hipR:[.61,.44],kneeL:[.48,.70],kneeR:[.64,.69],ankleL:[.45,.93],ankleR:[.68,.94]},
 {head:[.53,.11],neck:[.53,.19],shoulderL:[.43,.23],shoulderR:[.59,.24],elbowL:[.40,.33],elbowR:[.58,.34],wristL:[.44,.25],wristR:[.46,.26],hipL:[.50,.44],hipR:[.59,.44],kneeL:[.42,.36],kneeR:[.58,.69],ankleL:[.43,.57],ankleR:[.56,.93]},
 {head:[.41,.18],neck:[.43,.25],shoulderL:[.36,.30],shoulderR:[.55,.30],elbowL:[.31,.40],elbowR:[.70,.29],wristL:[.39,.37],wristR:[.65,.15],hipL:[.48,.51],hipR:[.56,.50],kneeL:[.42,.71],kneeR:[.62,.73],ankleL:[.32,.91],ankleR:[.61,.85]},
 {head:[.67,.24],neck:[.63,.33],shoulderL:[.69,.37],shoulderR:[.51,.32],elbowL:[.76,.48],elbowR:[.39,.20],wristL:[.70,.48],wristR:[.29,.04],hipL:[.60,.58],hipR:[.52,.58],kneeL:[.58,.76],kneeR:[.44,.74],ankleL:[.56,.92],ankleR:[.49,.80]},
 {head:[.77,.18],neck:[.74,.27],shoulderL:[.73,.31],shoulderR:[.63,.35],elbowL:[.81,.35],elbowR:[.77,.48],wristL:[.81,.30],wristR:[.87,.56],hipL:[.57,.51],hipR:[.48,.48],kneeL:[.56,.73],kneeR:[.37,.51],ankleL:[.56,.92],ankleR:[.24,.43]},
 {head:[.51,.15],neck:[.52,.24],shoulderL:[.42,.29],shoulderR:[.64,.29],elbowL:[.45,.44],elbowR:[.68,.44],wristL:[.49,.61],wristR:[.67,.57],hipL:[.47,.52],hipR:[.60,.52],kneeL:[.43,.74],kneeR:[.61,.75],ankleL:[.37,.91],ankleR:[.63,.93]}
];
// v5 left-handed ready stance, based on actual Ump Cam geometry. The left
// arm/leg appear at image-right, with the front of the jersey visible.
export const BATTER_POSE={head:[.37,.115],neck:[.43,.19],shoulderL:[.62,.19],shoulderR:[.30,.20],elbowL:[.67,.258],elbowR:[.29,.265],wristL:[.49,.155],wristR:[.425,.175],hipL:[.61,.43],hipR:[.46,.44],kneeL:[.60,.65],kneeR:[.38,.63],ankleL:[.72,.88],ankleR:[.43,.81],batTip:[.92,.055]};
export const CATCHER_POSE={head:[.51,.14],neck:[.51,.24],shoulderL:[.35,.29],shoulderR:[.74,.31],elbowL:[.22,.45],elbowR:[.83,.50],wristL:[.19,.415],wristR:[.73,.62],hipL:[.43,.64],hipR:[.66,.64],kneeL:[.28,.57],kneeR:[.84,.62],ankleL:[.27,.91],ankleR:[.86,.92],mitt:[.155,.34]};
export function localPose(raw,width,height,anchor=.05,cropped=false){
  const result={};for(const [k,p] of Object.entries(raw)){const x=cropped?(p[0]*512-2)/508:p[0],y=cropped?(p[1]*512-2)/496:p[1];result[k]=[(x-.5)*width,(1-y-anchor)*height];}
  result.hip=[(result.hipL[0]+result.hipR[0])/2,(result.hipL[1]+result.hipR[1])/2];result.chest=[(result.shoulderL[0]+result.shoulderR[0])/2,(result.shoulderL[1]+result.shoulderR[1])/2];return result;
}
export function clonePose(p){return Object.fromEntries(Object.entries(p).map(([k,v])=>[k,[...v]]));}
export function shift(p,names,x,y){for(const k of names){p[k][0]+=x;p[k][1]+=y;}}
export function catcherTarget(base,x,y,amount){
  const p=clonePose(base),dx=clamp(x-base.mitt[0],-.62,.62)*smooth(amount),dy=clamp(y-base.mitt[1],-.52,.58)*smooth(amount);
  shift(p,['mitt'],dx,dy);shift(p,['wristL'],dx*.92,dy*.92);shift(p,['elbowL'],dx*.48,dy*.48);shift(p,['chest','shoulderL','shoulderR','neck','head'],dx*.14,dy*.08);return p;
}
