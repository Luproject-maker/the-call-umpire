import * as THREE from './vendor/three.module.min.js';

// Original illustrated cutouts retain adult anatomy and readable cloth folds.
// They live in the same metre-based scene as the ball, plate and strike zone.
export class IllustratedPlayers{
  constructor(scene){
    this.group=new THREE.Group();scene.add(this.group);this.group.visible=false;
    this.loader=new THREE.TextureLoader();this.pitchFrame=0;this.loaded=false;
    this.ready=Promise.all([
      this.makeSprite('batter','./assets/batter.png',1.60,2.40,[-.93,.025,.35]),
      this.makeSprite('catcher','./assets/catcher.png',1.42,1.42,[-.12,.015,-.5]),
      this.makeSprite('pitcher','./assets/pitcher-poses.png',2.05,2.05,[0,.20,18.44])
    ]).then(()=>{this.setPitchFrame(0);this.loaded=true;this.group.visible=true;this.idle(0);});
  }
  async makeSprite(name,url,width,height,position){
    const texture=await this.loader.loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;
    texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
    const material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.03,depthWrite:true,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.scale.set(width,height,1);sprite.center.set(.5,name==='batter'?.025:name==='catcher'?.055:.12);sprite.position.set(...position);this.group.add(sprite);this[name]=sprite;sprite.userData.basePosition=sprite.position.clone();return sprite;
  }
  setPitchFrame(frame){if(!this.pitcher)return;this.pitchFrame=Math.max(0,Math.min(5,frame));const col=this.pitchFrame%3,row=Math.floor(this.pitchFrame/3);this.pitcher.material.map.repeat.set(508/1536,496/1024);this.pitcher.material.map.offset.set(col/3+2/1536,(1-row)/2+14/1024);this.pitcher.center.y=[.018,.022,.008,.036,.036,.024][this.pitchFrame];}
  prepare(){this.setPitchFrame(0);if(this.catcher)this.catcher.position.copy(this.catcher.userData.basePosition);}
  windup(t){this.setPitchFrame(t<.18?0:t<.50?1:t<.84?2:3);}
  moveBall(t,x){this.setPitchFrame(t<.25?3:t<.85?4:5);if(this.catcher){this.catcher.position.x=this.catcher.userData.basePosition.x+Math.max(-.11,Math.min(.11,x*.18))*Math.min(1,t);this.catcher.rotation.z=-Math.max(-.055,Math.min(.055,x*.08))*Math.min(1,t);}}
  idle(time){if(this.batter){this.batter.position.y=this.batter.userData.basePosition.y+Math.sin(time*1.7)*.007;this.batter.rotation.z=Math.sin(time*.9)*.003;}}
}
