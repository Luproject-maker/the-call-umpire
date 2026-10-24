import * as THREE from './vendor/three.module.min.js';
import {ZONE,PLATE,BALL_RADIUS,trajectory,sampleABS} from './engine.js';
import {Athlete,POSES} from './players.js';
import {ABSReplay} from './abs-replay.js';
import {IllustratedPlayers} from './illustrated-players.js?v=4';
const C={grass:0x355b3d,dirt:0x93684d,jersey:0xe1dfd0,navy:0x163b3c,skin:0xb6805c};
export class Ballpark{
  constructor(canvas){
    this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x122d35);this.scene.fog=new THREE.FogExp2(0x193738,.009);
    this.camera=new THREE.PerspectiveCamera(64,1,.05,250);this.camera.position.set(.65,1.68,-3.0);this.camera.lookAt(0,1.10,18);
    this.scene.add(new THREE.HemisphereLight(0xb5d9db,0x4a4028,2.3));const key=new THREE.DirectionalLight(0xfff1ce,2.2);key.position.set(-15,28,-8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.camera.far=80;key.shadow.bias=-.0003;this.scene.add(key);const fill=new THREE.DirectionalLight(0xc5ece8,1.1);fill.position.set(22,20,25);this.scene.add(fill);
    this.groundTexture=this.makeGroundTexture();this.buildField();this.buildStadium();this.buildPeople();this.buildZone();this.buildBall();this.abs=new ABSReplay();this.inReplay=false;this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.replayTime=0;
  }
  makeGroundTexture(){const data=new Uint8Array(128*128*4);let seed=19;for(let i=0;i<data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=190+(seed%66);data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}const t=new THREE.DataTexture(data,128,128);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(28,28);t.needsUpdate=true;return t;}
  material(color,extra={}){const ground=[C.dirt,0x9b7154,0xa37c59,C.grass,0x3a6242,0x355d3c].includes(color);return new THREE.MeshStandardMaterial({color,roughness:.9,...(ground?{map:this.groundTexture,bumpMap:this.groundTexture,bumpScale:.012}:{}),...extra});}
  mesh(geo,color,parent=this.scene,position=[0,0,0],extra={}){const m=new THREE.Mesh(geo,this.material(color,extra));m.position.set(...position);m.receiveShadow=true;parent.add(m);return m;}
  box(w,h,d,color,pos,parent=this.scene,extra={}){return this.mesh(new THREE.BoxGeometry(w,h,d),color,parent,pos,extra);}
  cylinder(r1,r2,h,color,pos,parent=this.scene){return this.mesh(new THREE.CylinderGeometry(r1,r2,h,16),color,parent,pos);}
  line(points,color,parent=this.scene,opacity=1){const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(line);return line;}
  plane(w,h,color,x,y,z){const m=this.mesh(new THREE.PlaneGeometry(w,h),color,this.scene,[x,y,z]);m.rotation.x=-Math.PI/2;return m;}
  buildField(){
    this.plane(260,260,C.grass,0,-.025,45);
    for(let i=-6;i<11;i++)this.plane(200,7,i%2?0x355b3d:0x3a6242,0,-.018,i*7);
    const infield=this.mesh(new THREE.CircleGeometry(29,80),C.dirt,this.scene,[0,.003,1]);infield.rotation.x=-Math.PI/2;
    const diamond=this.mesh(new THREE.PlaneGeometry(24,24),0x355d3c,this.scene,[0,.01,24]);diamond.rotation.x=-Math.PI/2;diamond.rotation.z=Math.PI/4;
    const home=this.mesh(new THREE.CircleGeometry(3.2,48),0x9b7154,this.scene,[0,.018,0]);home.rotation.x=-Math.PI/2;
    for(const side of [-1,1]){this.line([[side*.26,.024,.44],[side*70,.024,70]],0xc9c5a2,this.scene,.65);const x=side*.92;this.line([[x-.34,.03,-.45],[x+.34,.03,-.45],[x+.34,.03,1.37],[x-.34,.03,1.37],[x-.34,.03,-.45]],0xe2d7b8,this.scene,.75);}
    const shape=new THREE.Shape();PLATE.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const plate=this.mesh(new THREE.ShapeGeometry(shape),0xddd7bb,this.scene,[0,.035,0]);plate.rotation.x=-Math.PI/2;
    const mound=this.mesh(new THREE.CylinderGeometry(1.5,1.9,.22,48),0xa37c59,this.scene,[0,.09,18.44]);
    this.box(.61,.025,.16,0xd9d7bf,[0,.215,18.44]);
    [[-19,.025,19],[19,.025,19],[0,.025,38]].forEach(p=>{const b=this.box(.38,.05,.38,0xd7d6ba,p);b.rotation.y=Math.PI/4;});
    // Deterministic flecks add scale without any downloaded textures.
    const geo=new THREE.BufferGeometry(),points=[];let seed=63;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<1900;i++){const x=(rnd()-.5)*48,z=rnd()*42;if(Math.hypot(x,z-1)<29)points.push(x,.028,z);}
    geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));this.scene.add(new THREE.Points(geo,new THREE.PointsMaterial({size:.025,color:0xb38c65,transparent:true,opacity:.35})));
  }
  billboard(text,w,h,bg='#122c2b',fg='#c6d3b5'){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);ctx.fillStyle=fg;ctx.font='600 94px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128,960);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));return m;
  }
  buildStadium(){
    this.box(180,3,1.8,0x234d44,[0,1.4,96]);this.box(1.5,3,100,0x234d44,[-78,1.4,46]);this.box(1.5,3,100,0x234d44,[78,1.4,46]);
    for(let row=0;row<13;row++)this.box(184,.62,2.5,row%2?0x2c4444:0x344e4d,[0,3.4+row*.85,99+row*2.2]);
    for(const side of [-1,1])for(let row=0;row<7;row++)this.box(4,.7,140,0x293f3d,[side*(80+row*2),3+row*.9,35]);
    let seed=17;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const points=[],colors=[];const palette=[new THREE.Color(0x8aab9a),new THREE.Color(0xc4c2a4),new THREE.Color(0x355d59),new THREE.Color(0x9e7857)];
    for(let i=0;i<3500;i++){const row=Math.floor(rnd()*13);points.push((rnd()-.5)*180,4+row*.85,99+row*2.2);const col=palette[Math.floor(rnd()*4)];colors.push(col.r,col.g,col.b);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.scene.add(new THREE.Points(geo,new THREE.PointsMaterial({size:.32,vertexColors:true,transparent:true,opacity:.65})));
    for(const x of [-49,-24,24,49]){const ad=this.billboard(x<0?'THE CALL':'DIAMOND PARK',20,2.2);ad.position.set(x,1.8,94.98);ad.rotation.y=Math.PI;this.scene.add(ad);}
    const board=this.billboard('DIAMOND PARK',27,7,'#122b29','#aecb9a');board.position.set(0,13,104);board.rotation.y=Math.PI;this.scene.add(board);this.box(29,9,1,0x102a27,[0,13,105]);
    for(const x of [-62,62]){
      this.cylinder(.18,.3,30,0x566e68,[x,15,78]);const lights=new THREE.Group();lights.position.set(x,30,78);this.scene.add(lights);
      this.box(11,3,.6,0x314b47,[0,0,0],lights);
      for(let i=0;i<8;i++)for(let j=0;j<2;j++)this.box(.9,.75,.15,0xfff6d3,[-4.6+i*1.3,-.6+j*1.2,-.4],lights,{emissive:0xfff2ca,emissiveIntensity:3});
      const glow=this.mesh(new THREE.PlaneGeometry(21,11),0xe6f6d4,this.scene,[x,30,77],{transparent:true,opacity:.035,emissive:0xe6f6d4,emissiveIntensity:2,depthWrite:false});glow.rotation.y=Math.PI;
    }
    // Small distant skyline silhouettes.
    for(let i=0;i<22;i++)this.box(5+ rnd()*7,7+rnd()*15,5,0x153036,[-120+i*11,3,135]);
  }
  limb(a,b,r,color,parent){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);const m=this.cylinder(r,r*.9,va.distanceTo(vb),color,[0,0,0],parent);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());return m;}
  buildPeople(){
    this.pitcher=new Athlete(this.scene,{role:'pitcher',position:[0,.2,18.44],number:'18',skin:0xad795b});
    this.batter=new Athlete(this.scene,{role:'batter',position:[-.93,.025,.35],rotation:-Math.PI/2,jersey:0xdad8d1,accent:0x183950,number:'27',skin:0xc39372});
    this.catcher=new Athlete(this.scene,{role:'catcher',position:[0,.015,-.83],rotation:Math.PI,jersey:0xd9ddd9,accent:0x193949,number:'2',skin:0xa97857});
    this.glove=this.catcher.glove;
    this.illustrated=new IllustratedPlayers(this.scene,this.camera);this.assetsReady=this.illustrated.ready.then(()=>{this.pitcher.root.visible=false;this.batter.root.visible=false;this.catcher.root.visible=false;});
  }
  buildZone(){
    this.zone=new THREE.Group();this.scene.add(this.zone);this.zone.visible=false;
    const {halfWidth:w,bottom:b,top:t,mid:z}=ZONE;
    this.line([[-w,b,z],[w,b,z],[w,t,z],[-w,t,z],[-w,b,z]],0xd5ee8d,this.zone,.85);
    for(let i=1;i<3;i++){const x=-w+2*w*i/3,y=b+(t-b)*i/3;this.line([[x,b,z],[x,t,z]],0xd5ee8d,this.zone,.2);this.line([[-w,y,z],[w,y,z]],0xd5ee8d,this.zone,.2);}
    const plane=this.mesh(new THREE.PlaneGeometry(w*2,t-b),0xd5ee8d,this.zone,[0,(b+t)/2,z],{transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false});plane.rotation.y=Math.PI;
    this.marker=new THREE.Group();this.scene.add(this.marker);this.marker.visible=false;this.markerRing=this.mesh(new THREE.RingGeometry(.04,.049,36),0xd5ee8d,this.marker,[0,0,0],{side:THREE.DoubleSide,emissive:0xd5ee8d,emissiveIntensity:.5,depthTest:false});
    this.trail=new THREE.Group();this.scene.add(this.trail);
  }
  buildBall(){
    this.ball=new THREE.Group();this.scene.add(this.ball);this.ball.visible=false;this.mesh(new THREE.SphereGeometry(BALL_RADIUS,20,16),0xf2ead8,this.ball,[0,0,0],{roughness:.6,emissive:0x96846a,emissiveIntensity:.15});
    for(const side of [-1,1]){const pts=[];for(let i=0;i<=40;i++){const angle=i/40*Math.PI*2;pts.push([Math.cos(angle)*.028,Math.sin(angle)*.028,side*.023]);}this.line(pts,0xac5149,this.ball);}
  }
  resize(){const r=this.canvas.parentElement.getBoundingClientRect();this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.fov=2*Math.atan(Math.max(Math.tan(32*Math.PI/180),Math.tan(38*Math.PI/180)/this.camera.aspect))*180/Math.PI;this.camera.updateProjectionMatrix();}
  setZone(visible){this.zone.visible=visible;}
  clearTrail(){for(const o of [...this.trail.children]){this.trail.remove(o);o.geometry.dispose();o.material.dispose();}this.marker.visible=false;}
  prepare(){this.inReplay=false;this.clearTrail();this.ball.visible=false;this.pitcher.setPose(POSES.set);this.catcher.setPose(POSES.catcher);this.illustrated.prepare();}
  windup(t){this.pitcher.windup(t);this.illustrated.windup(t);}
  moveBall(p,t){const q=trajectory(p,t);this.ball.visible=true;this.ball.position.set(q.x,q.y,q.z);this.ball.rotation.set(t*20,t*30,0);const target=trajectory(p,1.034);this.catcher.receive(target.x,target.y,t);this.pitcher.followThrough(t);this.illustrated.moveBall(t,target.x,target.y);}
  catchBall(){this.ball.visible=false;this.illustrated.catchBall();}
  reveal(p,correct){this.inReplay=false;this.zone.visible=true;this.marker.visible=true;const q=sampleABS(p);this.marker.position.set(q.x,q.y,ZONE.mid-.009);this.markerRing.material.color.setHex(correct?0xd5ee8d:0xec827a);this.markerRing.material.emissive.copy(this.markerRing.material.color);}
  startABS(p){this.inReplay=true;this.abs.start(p);}
  updateABS(time){return this.abs.update(time,this.camera.aspect);}
  setABSView(view){this.abs.view=view;}
  replayTrail(p,t){this.clearTrail();const pts=[];for(let i=0;i<=80;i++){const q=trajectory(p,t*i/80);pts.push([q.x,q.y,q.z]);}this.line(pts,0xe8d9a0,this.trail,.5);}
  render(time=0,dt=0){if(this.inReplay)this.renderer.render(this.abs.scene,this.abs.camera);else{this.illustrated.update(time,dt);this.batter.idle(time);this.renderer.render(this.scene,this.camera);}}
}
