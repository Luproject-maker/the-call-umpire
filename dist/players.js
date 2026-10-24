import * as THREE from './vendor/three.module.min.js';

const V=(p)=>new THREE.Vector3(...p);
const average=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const blend=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const smooth=t=>t*t*(3-2*t);
const standing={hipL:[-.12,.96,0],hipR:[.12,.96,0],kneeL:[-.15,.53,0],kneeR:[.15,.53,0],ankleL:[-.17,.10,.02],ankleR:[.17,.10,.02],shoulderL:[-.235,1.48,0],shoulderR:[.235,1.48,0],elbowL:[-.30,1.19,-.12],elbowR:[.30,1.19,-.12],wristL:[-.10,1.27,-.26],wristR:[.10,1.27,-.26],head:[0,1.70,0]};
export const POSES={
  set:{...standing,wristL:[-.03,1.25,-.25],wristR:[.03,1.25,-.25]},
  lift:{hipL:[-.12,1.00,.02],hipR:[.12,1.00,.02],kneeL:[-.20,1.06,-.40],kneeR:[.14,.54,.06],ankleL:[-.22,.65,-.39],ankleR:[.17,.10,.05],shoulderL:[-.22,1.51,.10],shoulderR:[.23,1.50,-.07],elbowL:[-.27,1.28,-.18],elbowR:[.30,1.32,-.10],wristL:[-.04,1.36,-.24],wristR:[.04,1.36,-.24],head:[0,1.74,-.02]},
  stride:{hipL:[-.13,.85,-.28],hipR:[.12,.84,-.20],kneeL:[-.24,.53,-.80],kneeR:[.17,.47,.17],ankleL:[-.32,.10,-.83],ankleR:[.20,.10,.46],shoulderL:[-.28,1.37,-.42],shoulderR:[.22,1.42,-.18],elbowL:[-.25,1.31,-.78],elbowR:[.47,1.58,.04],wristL:[-.13,1.45,-.91],wristR:[.43,1.91,.19],head:[-.02,1.64,-.37]},
  release:{hipL:[-.16,.79,-.50],hipR:[.10,.81,-.37],kneeL:[-.26,.48,-1.04],kneeR:[.31,.44,.06],ankleL:[-.29,.10,-1.20],ankleR:[.41,.12,.33],shoulderL:[-.25,1.26,-.85],shoulderR:[-.18,1.36,-.58],elbowL:[-.37,1.02,-.81],elbowR:[-.35,1.53,-.68],wristL:[-.19,1.04,-.77],wristR:[-.38,1.78,-.84],head:[-.05,1.51,-.92]},
  follow:{hipL:[-.16,.83,-.64],hipR:[.10,.81,-.54],kneeL:[-.26,.49,-1.08],kneeR:[.26,.77,.02],ankleL:[-.29,.10,-1.20],ankleR:[.41,1.10,.35],shoulderL:[-.25,1.12,-.99],shoulderR:[.18,1.14,-.97],elbowL:[-.37,.93,-.82],elbowR:[-.13,.93,-1.19],wristL:[-.17,1.00,-.76],wristR:[-.47,.72,-1.01],head:[-.03,1.36,-1.09]},
  batter:{hipL:[-.12,.88,0],hipR:[.12,.88,0],kneeL:[-.27,.48,-.07],kneeR:[.27,.49,.04],ankleL:[-.35,.10,-.04],ankleR:[.36,.10,.09],shoulderL:[-.22,1.38,-.07],shoulderR:[.22,1.40,-.04],elbowL:[-.29,1.13,-.30],elbowR:[.39,1.31,-.09],wristL:[.20,1.39,-.32],wristR:[.25,1.44,-.31],head:[-.02,1.63,-.13]},
  catcher:{hipL:[-.14,.43,.03],hipR:[.14,.43,.03],kneeL:[-.42,.36,-.25],kneeR:[.42,.36,-.25],ankleL:[-.32,.09,.13],ankleR:[.32,.09,.13],shoulderL:[-.23,.88,-.10],shoulderR:[.23,.88,-.10],elbowL:[-.39,.71,-.28],elbowR:[.28,.59,-.04],wristL:[-.16,.75,-.64],wristR:[.14,.49,-.04],head:[0,1.09,-.14]}
};

export class Athlete{
  constructor(scene,{role='pitcher',position=[0,0,0],rotation=0,jersey=0xe6e3d8,accent=0x163c4d,number='18',skin=0xbb8665}={}){
    this.role=role;this.root=new THREE.Group();scene.add(this.root);this.root.position.set(...position);this.root.rotation.y=rotation;
    this.materials={cloth:new THREE.MeshStandardMaterial({color:jersey,roughness:.95}),pants:new THREE.MeshStandardMaterial({color:0xe0ddd1,roughness:.94}),skin:new THREE.MeshStandardMaterial({color:skin,roughness:.75}),accent:new THREE.MeshStandardMaterial({color:accent,roughness:.58}),shoe:new THREE.MeshStandardMaterial({color:0x182129,roughness:.57}),leather:new THREE.MeshStandardMaterial({color:0x82502e,roughness:.85}),trim:new THREE.MeshStandardMaterial({color:0xcab48c,roughness:.95})};
    const fabricData=new Uint8Array(64*64*4);for(let i=0;i<fabricData.length;i+=4){const index=i/4,x=index%64,y=Math.floor(index/64),value=210+((x+y)%3)*16;fabricData[i]=fabricData[i+1]=fabricData[i+2]=value;fabricData[i+3]=255;}const fabric=new THREE.DataTexture(fabricData,64,64);fabric.wrapS=fabric.wrapT=THREE.RepeatWrapping;fabric.repeat.set(5,5);fabric.needsUpdate=true;for(const name of ['cloth','pants']){this.materials[name].bumpMap=fabric;this.materials[name].bumpScale=.0012;}
    this.unitSphere=new THREE.SphereGeometry(1,24,16);this.parts={};
    const torsoProfile=[[.13,0],[.155,.12],[.17,.35],[.205,.65],[.225,.82],[.225,.94],[.20,1]].map(([x,y])=>new THREE.Vector2(x,y));
    this.torso=this.add(new THREE.LatheGeometry(torsoProfile,32),this.materials.cloth);this.pelvis=this.ellipsoid([.19,.12,.135],this.materials.pants);
    this.belt=this.ellipsoid([.19,.025,.14],this.materials.accent);
    this.head=new THREE.Group();this.root.add(this.head);this.buildHead(role==='batter',role==='catcher');
    for(const side of ['L','R']){
      this.parts['thigh'+side]=this.add(new THREE.CylinderGeometry(.105,.079,1,20),this.materials.pants);
      this.parts['calf'+side]=this.add(new THREE.CylinderGeometry(.079,.046,1,20),this.materials.pants);
      this.parts['arm'+side]=this.add(new THREE.CylinderGeometry(.072,.056,1,20),this.materials.cloth);
      this.parts['forearm'+side]=this.add(new THREE.CylinderGeometry(.055,.033,1,20),this.materials.skin);
      for(const joint of ['knee','elbow','shoulder'])this.parts[joint+side]=this.ellipsoid(joint==='shoulder'?[.075,.075,.075]:joint==='knee'?[.080,.083,.078]:[.054,.057,.054],joint==='elbow'?this.materials.skin:joint==='shoulder'?this.materials.cloth:this.materials.pants);
      this.parts['shoe'+side]=this.ellipsoid([.068,.065,.15],this.materials.shoe);
      this.parts['hand'+side]=new THREE.Group();this.root.add(this.parts['hand'+side]);this.buildHand(this.parts['hand'+side],role==='batter');
      if(role==='catcher'){
        this.parts['shin'+side]=this.add(new THREE.CylinderGeometry(.086,.06,1,16,1,false,0,Math.PI*1.15),this.materials.accent);
        this.parts['kneepad'+side]=this.ellipsoid([.10,.11,.085],this.materials.accent);
      }
    }
    this.glove=new THREE.Group();if(role!=='batter'){this.root.add(this.glove);this.buildGlove();}
    this.detail=new THREE.Group();this.root.add(this.detail);this.buildUniform(number,accent);
    if(role==='batter')this.buildBat();
    if(role==='catcher')this.buildGear();
    this.setPose(POSES[role==='catcher'?'catcher':role==='batter'?'batter':'set']);
  }
  add(geo,material,parent=this.root){const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  ellipsoid(scale,mat,parent=this.root,pos=[0,0,0]){const m=this.add(this.unitSphere,mat,parent);m.scale.set(...scale);m.position.set(...pos);return m;}
  line(points,color,parent=this.root,r=.003){const curve=new THREE.CatmullRomCurve3(points.map(V));return this.add(new THREE.TubeGeometry(curve,24,r,6,false),new THREE.MeshStandardMaterial({color,roughness:.8}),parent);}
  buildHead(helmet,mask){
    const m=this.materials;
    this.ellipsoid([.098,.137,.105],m.skin,this.head,[0,0,0]);this.ellipsoid([.080,.055,.081],m.skin,this.head,[0,-.085,-.018]);
    this.ellipsoid([.022,.034,.035],m.skin,this.head,[0,-.007,-.105]);
    for(const side of [-1,1]){
      this.ellipsoid([.017,.032,.017],m.skin,this.head,[side*.101,-.005,0]);
      this.ellipsoid([.018,.009,.009],new THREE.MeshStandardMaterial({color:0xededdd}),this.head,[side*.039,.026,-.093]);
      this.ellipsoid([.007,.007,.006],m.shoe,this.head,[side*.039,.026,-.101]);
      this.line([[side*.022,.046,-.096],[side*.056,.046,-.088]],0x3c2b24,this.head,.004);
    }
    this.line([[-.027,-.058,-.09],[0,-.063,-.098],[.027,-.058,-.09]],0x805444,this.head,.0025);
    const cap=this.add(new THREE.SphereGeometry(.115,32,20,0,Math.PI*2,0,Math.PI*.57),m.accent,this.head);cap.position.y=.06;cap.scale.set(1,.86,1.04);
    const brim=this.ellipsoid([.119,.012,.10],m.accent,this.head,[0,.075,-.105]);
    if(helmet||mask){
      for(const side of [-1,1])this.ellipsoid([.022,.075,.066],m.accent,this.head,[side*.104,-.002,.005]);
      if(helmet)this.ellipsoid([.015,.023,.018],m.shoe,this.head,[.124,-.023,-.018]);
    }
    if(mask){
      for(const y of [-.10,-.045,.015,.075])this.line([[-.12,y,-.095],[-.09,y,-.155],[0,y-.008,-.17],[.09,y,-.155],[.12,y,-.095]],0x6b7474,this.head,.006);
      for(const x of [-.092,0,.092])this.line([[x,-.11,-.145],[x,.09,-.145]],0x909898,this.head,.005);
      this.line([[-.11,-.11,-.12],[0,-.15,-.14],[.11,-.11,-.12]],0x26333b,this.head,.016);
    }
    this.neck=this.ellipsoid([.052,.075,.054],m.skin,this.head,[0,-.15,.018]);
  }
  buildHand(parent,gloved){const mat=gloved?this.materials.cloth:this.materials.skin;this.ellipsoid([.038,.050,.025],mat,parent);for(let i=0;i<4;i++){const f=this.add(new THREE.CapsuleGeometry(.009,.043,3,6),mat,parent);f.position.set(-.025+i*.016,-.044,0);f.rotation.x=-.25;}this.ellipsoid([.014,.032,.015],mat,parent,[.039,-.009,-.005]);}
  buildGlove(){
    const m=this.materials;this.ellipsoid([.13,.145,.067],m.leather,this.glove);this.ellipsoid([.087,.095,.03],new THREE.MeshStandardMaterial({color:0x493326,roughness:1}),this.glove,[0,.01,-.06]);
    for(let i=0;i<5;i++){const x=-.09+i*.041;const f=this.add(new THREE.CapsuleGeometry(.023,.095,5,10),m.leather,this.glove);f.position.set(x,.08+(.10-Math.abs(x))*.25,0);f.rotation.z=-x*2;}
    for(const x of [-.085,-.045,0,.045,.085])this.line([[x,-.09,-.052],[x,.06,-.065],[x,.145,-.016]],0xceb08a,this.glove,.0025);
    this.line([[-.10,.08,-.04],[.10,.11,-.04]],0xd3b991,this.glove,.004);
  }
  buildUniform(number,accent){
    this.line([[0,.02,-.09],[0,.22,-.112],[0,.45,-.11]],0xaaa99c,this.detail,.002);
    for(let i=0;i<5;i++)this.ellipsoid([.005,.005,.003],this.materials.trim,this.detail,[0,.06+i*.08,-.117]);
    for(const side of [-1,1])this.line([[side*.055,.42,-.09],[side*.07,.40,-.11],[side*.10,.40,-.104]],accent,this.detail,.006);
    const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#1c3e50';ctx.font='bold 155px Arial';ctx.textAlign='center';ctx.fillText(number,128,190);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const n=this.add(new THREE.PlaneGeometry(.24,.24),new THREE.MeshStandardMaterial({map:tx,transparent:true,roughness:1,depthWrite:false}),this.detail);n.position.set(0,.22,.125);n.rotation.y=Math.PI;
  }
  buildBat(){this.bat=new THREE.Group();this.root.add(this.bat);const pts=[[.016,0],[.018,.035],[.012,.07],[.014,.34],[.027,.58],[.033,.78],[.029,.89],[0,.91]].map(([x,y])=>new THREE.Vector2(x,y));this.add(new THREE.LatheGeometry(pts,24),new THREE.MeshStandardMaterial({color:0xba8e52,roughness:.5}),this.bat);for(let i=0;i<10;i++){const tape=this.add(new THREE.TorusGeometry(.015,.0015,5,16),this.materials.shoe,this.bat);tape.rotation.x=Math.PI/2;tape.position.y=.06+i*.014;}}
  buildGear(){this.chestGuard=this.ellipsoid([.235,.26,.077],this.materials.accent);this.guardDetail=new THREE.Group();this.root.add(this.guardDetail);for(let i=0;i<6;i++){const rib=this.add(new THREE.BoxGeometry(.36-i*.018,.035,.025),this.materials.accent,this.guardDetail);rib.position.set(0,i*.065-.13,-.03);}for(const side of [-1,1])this.ellipsoid([.11,.075,.066],this.materials.accent,this.guardDetail,[side*.21,.21,.006]);}
  segment(mesh,a,b){const va=V(a),vb=V(b),delta=vb.clone().sub(va);mesh.position.copy(va).add(vb).multiplyScalar(.5);mesh.scale.y=delta.length();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}
  setPose(p){
    this.pose=p;const hip=average(p.hipL,p.hipR),shoulder=average(p.shoulderL,p.shoulderR),axis=V(shoulder).sub(V(hip));
    this.torso.position.copy(V(hip));this.torso.scale.set(1,axis.length(),.62);this.torso.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize());this.pelvis.position.copy(V(hip));this.belt.position.copy(V(hip)).y+=.045;this.head.position.copy(V(p.head));
    this.detail.position.copy(V(hip));this.detail.quaternion.copy(this.torso.quaternion);
    for(const side of ['L','R']){
      const k=p['knee'+side],a=p['ankle'+side],s=p['shoulder'+side],e=p['elbow'+side],w=p['wrist'+side];
      this.segment(this.parts['thigh'+side],p['hip'+side],k);this.segment(this.parts['calf'+side],k,a);this.segment(this.parts['arm'+side],s,e);this.segment(this.parts['forearm'+side],e,w);
      for(const joint of ['knee','elbow','shoulder'])this.parts[joint+side].position.copy(V(p[joint+side]));
      this.parts['shoe'+side].position.copy(V(a)).add(new THREE.Vector3(0,-.04,-.055));this.parts['hand'+side].position.copy(V(w));this.parts['hand'+side].quaternion.copy(this.parts['forearm'+side].quaternion);
      if(this.role==='catcher'){const offset=[0,.015,-.065];this.segment(this.parts['shin'+side],blend(k,a,.12).map((v,i)=>v+offset[i]),a.map((v,i)=>v+offset[i]));this.parts['kneepad'+side].position.copy(V(k)).z-=.06;}
    }
    if(this.role!=='batter'){this.glove.position.copy(V(p.wristL));this.glove.position.z-=.035;}
    if(this.role==='batter'){
      this.head.rotation.y=-1.1;
      this.bat.position.copy(V(average(p.wristL,p.wristR)));this.bat.rotation.set(-.25,0,-.48);
    }
    if(this.role==='catcher'){
      this.chestGuard.position.copy(V(hip)).lerp(V(shoulder),.6);this.chestGuard.position.z-=.135;this.chestGuard.quaternion.copy(this.torso.quaternion);this.guardDetail.position.copy(this.chestGuard.position);this.guardDetail.position.z-=.07;this.guardDetail.quaternion.copy(this.torso.quaternion);
    }
  }
  mixPose(a,b,t){const p={};for(const key of Object.keys(a))p[key]=blend(a[key],b[key],smooth(Math.max(0,Math.min(1,t))));this.setPose(p);}
  windup(t){const stops=[0,.22,.56,1],poses=[POSES.set,POSES.lift,POSES.stride,POSES.release];for(let i=0;i<3;i++)if(t<=stops[i+1]){this.mixPose(poses[i],poses[i+1],(t-stops[i])/(stops[i+1]-stops[i]));return;}}
  followThrough(t){this.mixPose(POSES.release,POSES.follow,Math.min(t*2.5,1));}
  idle(time){if(this.role==='batter'){const p={...POSES.batter};const sway=Math.sin(time*1.7)*.012;for(const name of ['shoulderL','shoulderR','elbowL','elbowR','wristL','wristR','head'])p[name]=POSES.batter[name].map((v,i)=>v+(i===1?sway:0));this.setPose(p);}}
  receive(x,y,progress){
    const p={...POSES.catcher},target=[Math.max(-.63,Math.min(.63,-x)),Math.max(.30,Math.min(1.45,y)),-.68];const reach=smooth(Math.max(0,Math.min(1,progress)));
    p.wristL=blend(POSES.catcher.wristL,target,reach);p.elbowL=blend(POSES.catcher.elbowL,[target[0]-.15,target[1]-.10,-.33],reach);const lean=Math.max(-.16,Math.min(.16,-x*.22))*reach;
    for(const k of ['head','shoulderL','shoulderR'])p[k]=POSES.catcher[k].map((v,i)=>v+(i===0?lean:0));
    this.setPose(p);
  }
}
