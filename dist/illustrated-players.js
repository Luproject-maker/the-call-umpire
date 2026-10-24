import * as THREE from './vendor/three.module.min.js';
import {RigFrame,PaintedActor} from './painted-rig.js?v=5';
import {CATCHER_POSITION} from './umpire-view.js?v=5';
import {PITCH_POSES,BATTER_POSE,CATCHER_POSE,localPose,clonePose,shift,motionSample,WINDUP_STOPS,FOLLOW_STOPS,catcherTarget,smooth,blendPose} from './motion.js?v=5';

export class IllustratedPlayers{
  constructor(scene,camera){
    this.group=new THREE.Group();scene.add(this.group);this.group.visible=false;this.camera=camera;this.loaded=false;this.phase='ready';this.windupTime=0;this.flightTime=0;this.receiveTime=0;
    const loader=new THREE.TextureLoader();
    this.ready=Promise.all(['batter-ready-v5.png','catcher.png','pitcher-poses.png'].map(name=>loader.loadAsync(new URL('./assets/'+name,import.meta.url).href))).then(([batter,catcher,pitcher])=>{
      for(const t of [batter,catcher,pitcher]){t.colorSpace=THREE.SRGBColorSpace;t.minFilter=t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;}
      this.batterBase=localPose(BATTER_POSE,1.42,2.13,.055);
      this.catcherBase=localPose(CATCHER_POSE,1.42,1.42,.055);
      // A left-handed hitter belongs on screen-right. The umpire sees his
      // chest/side in the ready stance, not the back of a right-handed hitter.
      this.batter=new PaintedActor(this.group,[new RigFrame(batter,this.batterBase,1.42,2.13,.055,null,[['wristR','batTip',.045]])],[-.93,.025,.35]);
      this.catcher=new PaintedActor(this.group,[new RigFrame(catcher,this.catcherBase,1.42,1.42,.055,null,[['wristL','mitt',.08]])],CATCHER_POSITION);
      const anchors=[.018,.022,.008,.036,.036,.024];
      const frames=PITCH_POSES.map((pose,i)=>new RigFrame(pitcher,localPose(pose,2.05,2.05,anchors[i],true),2.05,2.05,anchors[i],{x:(i%3)/3+2/1536,y:(1-Math.floor(i/3))/2+14/1024,w:508/1536,h:496/1024}));
      this.pitcher=new PaintedActor(this.group,frames,[0,.20,18.44]);
      this.loaded=true;this.group.visible=true;this.prepare();this.update(0,0);
    });
  }
  prepare(){this.previousPose=this.pitcher?clonePose(this.pitcher.pose):null;this.phase='ready';this.windupTime=0;this.flightTime=0;this.receiveTime=0;this.target=null;if(this.loaded)this.pitcher.show(0,0,0);}
  windup(t){this.phase='windup';this.windupTime=t;}
  moveBall(t,x,y){this.phase='flight';this.flightTime=t;this.target=new THREE.Vector3(x,y,-.15);}
  catchBall(){if(this.phase==='flight'){this.phase='receive';this.receiveTime=0;}}
  update(time,dt){
    if(!this.loaded)return;
    for(const actor of [this.batter,this.catcher,this.pitcher]){actor.face(this.camera);actor.root.updateMatrixWorld(true);}
    if(this.phase==='receive')this.receiveTime+=dt;
    const sample=this.phase==='windup'?motionSample(this.windupTime,WINDUP_STOPS):this.phase==='flight'||this.phase==='receive'?motionSample(this.flightTime+this.receiveTime*2,FOLLOW_STOPS):{a:0,b:0,mix:0};
    if(this.phase==='receive'&&this.receiveTime>.65){this.pitcher.show(5,0,smooth((this.receiveTime-.65)/.85));}
    else if(this.phase==='windup'&&this.previousPose&&this.windupTime<.12){const target=blendPose(this.previousPose,blendPose(this.pitcher.frames[sample.a].pose,this.pitcher.frames[sample.b].pose,sample.mix),smooth(this.windupTime/.12));this.pitcher.show(sample.a,sample.b,sample.mix,target);}
    else this.pitcher.show(sample.a,sample.b,sample.mix);
    const batter=clonePose(this.batterBase),load=this.phase==='windup'?Math.sin(this.windupTime*Math.PI):0;
    shift(batter,['hip','hipL','hipR','chest','shoulderL','shoulderR','neck','head'],.025*load,Math.sin(time*1.6)*.004);
    shift(batter,['kneeL','ankleL'],.009*load,.020*load);
    const waggle=Math.sin(time*2)*.018-load*.05,pivot=batter.wristR,tip=batter.batTip,dx=tip[0]-pivot[0],dy=tip[1]-pivot[1];
    batter.batTip=[pivot[0]+dx*Math.cos(waggle)-dy*Math.sin(waggle),pivot[1]+dx*Math.sin(waggle)+dy*Math.cos(waggle)];
    shift(batter,['elbowR','wristL','wristR'],load*.009,load*.008);
    this.batter.show(0,0,0,batter);
    let catcher=clonePose(this.catcherBase);
    if(this.target&&(this.phase==='flight'||this.phase==='receive')){
      const point=this.catcher.projectPoint(this.target,this.camera),reach=smooth((this.flightTime-.20)/.78);
      catcher=catcherTarget(this.catcherBase,point[0],point[1],reach);
      if(this.phase==='receive'){
        const rest=catcherTarget(this.catcherBase,-.08,.78,1),amount=smooth((this.receiveTime-.12)/.42);
        catcher=blendPose(catcher,rest,amount);
      }
    }else{
      const breath=Math.sin(time*1.9)*.005;
      shift(catcher,['hip','hipL','hipR','chest','neck','head','shoulderL','shoulderR'],0,breath);
      if(this.phase==='windup'){const set=Math.sin(this.windupTime*Math.PI)*.012;shift(catcher,['mitt','wristL'],set,-set);}
    }
    this.catcher.show(0,0,0,catcher);
  }
}
