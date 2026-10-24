import * as THREE from './vendor/three.module.min.js';
import {ZONE,PLATE,BALL_RADIUS,ABS_TIME,trajectory,sampleABS} from './engine.js';

export class ABSReplay{
  constructor(){
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x111d31);this.scene.fog=new THREE.FogExp2(0x111d31,.07);
    this.scene.add(new THREE.HemisphereLight(0xc7e7ff,0x182339,3));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,5,-3);this.scene.add(key);
    this.camera=new THREE.PerspectiveCamera(38,1,.02,100);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:0x16283d,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.018;this.scene.add(ground);
    const grid=new THREE.GridHelper(30,60,0x31445d,0x21334b);grid.position.y=-.01;this.scene.add(grid);
    const shape=new THREE.Shape();PLATE.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const plate=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:0xc1c9d1,roughness:.8,side:THREE.DoubleSide}));plate.rotation.x=-Math.PI/2;plate.position.y=.001;this.scene.add(plate);
    const {halfWidth:w,bottom:b,top:t,mid:z}=ZONE;const pts=[[-w,b,z],[w,b,z],[w,t,z],[-w,t,z],[-w,b,z]];
    this.frame=new THREE.Group();this.scene.add(this.frame);
    for(let i=0;i<4;i++)this.tube([pts[i],pts[i+1]],0xe7f0fa,.005,this.frame);
    const zone=new THREE.Mesh(new THREE.PlaneGeometry(w*2,t-b),new THREE.MeshBasicMaterial({color:0x889ce2,transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false}));zone.position.set(0,(b+t)/2,z);this.frame.add(zone);
    for(const x of [-w,w])this.dash([[x,.008,z],[x,b,z]],0x7889a5,.6);
    const widthLine=this.dash([[-w,.035,-.12],[w,.035,-.12]],0x70839f,.65);
    this.ball=new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS,40,28),new THREE.MeshStandardMaterial({color:0xf2ece2,roughness:.5}));this.scene.add(this.ball);
    this.ring=new THREE.Mesh(new THREE.RingGeometry(BALL_RADIUS*.99,BALL_RADIUS*1.10,64),new THREE.MeshBasicMaterial({color:0xf75792,side:THREE.DoubleSide,transparent:true,opacity:1,depthTest:false}));this.scene.add(this.ring);
    this.trail=new THREE.Group();this.scene.add(this.trail);this.measure=new THREE.Group();this.scene.add(this.measure);
    this.label('17 IN / 43.18 CM',.53,.07,[0,.07,-.25]);
    this.label('ABS MID-PLATE',.55,.06,[.55,.04,ZONE.mid]);
    this.view='orbit';
  }
  tube(points,color,r=.004,parent=this.scene){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(c,Math.max(2,points.length*3),r,8,false),new THREE.MeshBasicMaterial({color}));parent.add(m);return m;}
  dash(points,color,opacity=1){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(g,new THREE.LineDashedMaterial({color,transparent:true,opacity,dashSize:.025,gapSize:.025}));l.computeLineDistances();this.scene.add(l);return l;}
  label(text,w,h,pos){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.font='500 64px Arial';ctx.textAlign='center';ctx.fillStyle='#9eb2d0';ctx.fillText(text,512,85);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx,transparent:true,side:THREE.DoubleSide,depthWrite:false}));m.position.set(...pos);m.rotation.x=-Math.PI/2;this.scene.add(m);}
  clear(group){for(const m of [...group.children]){group.remove(m);m.geometry.dispose();m.material.dispose();}}
  start(p){this.pitch=p;this.view='orbit';this.lastTrailTime=-1;this.clear(this.trail);this.clear(this.measure);this.ring.visible=false;this.frame.children.slice(0,4).forEach(m=>m.material.color.setHex(0xe7f0fa));const crossing=sampleABS(p);const nearest=[Math.max(-ZONE.halfWidth,Math.min(ZONE.halfWidth,crossing.x)),Math.max(ZONE.bottom,Math.min(ZONE.top,crossing.y)),ZONE.mid];this.tube([[crossing.x,crossing.y,ZONE.mid],nearest],0xf6ca7e,.0015,this.measure);this.measure.visible=false;}
  update(elapsed,aspect){
    if(!this.pitch)return;this.camera.aspect=aspect;this.camera.updateProjectionMatrix();
    const progress=THREE.MathUtils.smoothstep(elapsed,.3,3.6),t=.86+(ABS_TIME-.86)*progress,q=trajectory(this.pitch,t);
    this.ball.position.set(q.x,q.y,q.z);this.ball.rotation.set(t*40,t*50,0);
    if(Math.abs(t-this.lastTrailTime)>.0001){this.lastTrailTime=t;this.clear(this.trail);const points=[];for(let i=0;i<=50;i++){const a=trajectory(this.pitch,.86+(t-.86)*i/50);points.push([a.x,a.y,a.z]);}this.tube(points,this.pitch.strike?0xf9538c:0x66dfc2,.004,this.trail);}
    const hit=elapsed>=3.6;this.ring.visible=hit;this.ring.position.set(q.x,q.y,ZONE.mid-.008);this.measure.visible=hit;
    const color=this.pitch.strike?0xf9538c:0x66dfc2;if(hit)this.frame.children.slice(0,4).forEach(m=>m.material.color.setHex(color));this.ring.material.color.setHex(color);
    const target=new THREE.Vector3(0,(ZONE.bottom+ZONE.top)/2-.03,ZONE.mid);
    const zoom=THREE.MathUtils.smoothstep(elapsed,2.2,4.5);
    if(this.view==='front')this.camera.position.set(0,target.y,-1.95);
    else if(this.view==='side')this.camera.position.set(-2.1,target.y+.25,-.68);
    else{this.camera.position.set(-1.9*(1-zoom),1.7*(1-zoom)+target.y*zoom,-3.6*(1-zoom)-1.95*zoom);}
    this.camera.lookAt(target);return hit;
  }
}
