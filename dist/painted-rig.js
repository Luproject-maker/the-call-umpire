import * as THREE from './vendor/three.module.min.js';
import {BONES,blendPose,clamp} from './motion.js?v=4';

// Each drawing gets a fine triangulated surface. Three nearby anatomical
// bones drive each vertex. Adjacent drawings are warped into the SAME pose
// before their textures blend, rather than dissolving two different poses.
export class RigFrame{
  constructor(texture,pose,width,height,anchor,rect,extraBones=[]){
    this.pose=pose;this.edges=[...BONES,...extraBones];this.geometry=new THREE.PlaneGeometry(width,height,28,40);
    const positions=this.geometry.attributes.position,uv=this.geometry.attributes.uv;
    this.rest=new Float32Array(positions.count*2);this.indices=new Uint8Array(positions.count*3);this.weights=new Float32Array(positions.count*3);
    this.material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.015,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.visible=false;
    for(let i=0;i<positions.count;i++){
      const u=uv.getX(i),v=uv.getY(i),x=(u-.5)*width,y=(v-anchor)*height;
      positions.setXYZ(i,x,y,0);this.rest[i*2]=x;this.rest[i*2+1]=y;
      if(rect)uv.setXY(i,rect.x+u*rect.w,rect.y+v*rect.h);
      const candidates=this.edges.map(([a,b,r],index)=>{
        const start=pose[a],end=pose[b],dx=end[0]-start[0],dy=end[1]-start[1],l2=dx*dx+dy*dy;
        const t=clamp(((x-start[0])*dx+(y-start[1])*dy)/Math.max(l2,1e-6));
        const d2=(x-start[0]-dx*t)**2+(y-start[1]-dy*t)**2;
        return {index,weight:1/(d2+r*r*.10+.0001)**2.5};
      }).sort((a,b)=>b.weight-a.weight).slice(0,3);
      const sum=candidates.reduce((s,v)=>s+v.weight,0);for(let k=0;k<3;k++){this.indices[i*3+k]=candidates[k].index;this.weights[i*3+k]=candidates[k].weight/sum;}
    }
    uv.needsUpdate=true;
  }
  deform(target,opacity=1){
    this.mesh.visible=opacity>.001;this.material.opacity=opacity;if(!this.mesh.visible)return;
    const transforms=this.edges.map(([a,b])=>{
      const s=this.pose[a],e=this.pose[b],ta=target[a],tb=target[b],dx=e[0]-s[0],dy=e[1]-s[1],l=Math.max(Math.hypot(dx,dy),.0001),tx=tb[0]-ta[0],ty=tb[1]-ta[1],tl=Math.max(Math.hypot(tx,ty),.0001);
      return {sx:s[0],sy:s[1],dx,dy,l,l2:l*l,x:ta[0],y:ta[1],tx,ty,nx:-ty/tl,ny:tx/tl};
    });
    const position=this.geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      const px=this.rest[i*2],py=this.rest[i*2+1];let x=0,y=0;
      for(let k=0;k<3;k++){const j=i*3+k,t=transforms[this.indices[j]],w=this.weights[j],dx=px-t.sx,dy=py-t.sy,u=(dx*t.dx+dy*t.dy)/t.l2,v=(-dx*t.dy+dy*t.dx)/t.l;x+=(t.x+u*t.tx+v*t.nx)*w;y+=(t.y+u*t.ty+v*t.ny)*w;}
      position.setXYZ(i,x,y,0);
    }
    position.needsUpdate=true;
  }
}
export class PaintedActor{
  constructor(scene,frames,position){this.root=new THREE.Group();this.root.position.set(...position);this.root.renderOrder=position[2]>10?10:position[2]>0?20:30;scene.add(this.root);this.base=this.root.position.clone();this.frames=frames;this.pose=frames[0].pose;this.active=[];for(const f of frames)this.root.add(f.mesh);this.show(0,0,0);}
  show(a,b,mix,target){
    for(const f of this.active)f.mesh.visible=false;this.active=[];
    const pose=target||blendPose(this.frames[a].pose,this.frames[b].pose,mix);this.pose=pose;
    if(a===b){this.frames[a].mesh.renderOrder=0;this.frames[a].deform(pose,1);this.active=[this.frames[a]];}
    else{this.frames[a].mesh.renderOrder=0;this.frames[b].mesh.renderOrder=1;this.frames[a].deform(pose,1);this.frames[b].deform(pose,mix);this.active=[this.frames[a],this.frames[b]];}
  }
  face(camera){this.root.quaternion.copy(camera.quaternion);}
  projectPoint(point,camera){
    const a=this.root.worldToLocal(camera.position.clone()),b=this.root.worldToLocal(point.clone()),t=-a.z/(b.z-a.z);
    return [a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t];
  }
}
