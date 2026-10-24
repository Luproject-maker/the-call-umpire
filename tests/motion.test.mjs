import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {RigFrame,PaintedActor} from '../dist/painted-rig.js';
import {applyUmpireView,CATCHER_POSITION} from '../dist/umpire-view.js';
import {motionSample,WINDUP_STOPS,FOLLOW_STOPS,localPose,PITCH_POSES,CATCHER_POSE,blendPose,catcherTarget} from '../dist/motion.js';
const poses=PITCH_POSES.map(p=>localPose(p,2.05,2.05,.025,true));
test('pitch motion starts set and reaches release exactly when ball leaves hand',()=>{assert.deepEqual(motionSample(0,WINDUP_STOPS),{a:0,b:0,mix:0});const end=motionSample(1,WINDUP_STOPS);assert.equal(end.b,3);assert.equal(end.mix,1);assert.equal(motionSample(0,FOLLOW_STOPS).a,3);assert.equal(motionSample(2,FOLLOW_STOPS).a,5);});
test('joint positions remain continuous across every pitching transition',()=>{
 const poseAt=t=>{const s=motionSample(t,WINDUP_STOPS);return blendPose(poses[s.a],poses[s.b],s.mix);};
 for(const time of [.28,.72]){const before=poseAt(time-1e-5),after=poseAt(time+1e-5);for(const k of Object.keys(before))assert.ok(Math.hypot(before[k][0]-after[k][0],before[k][1]-after[k][1])<.0001);}
});
test('skinning an unchanged pose preserves the original painted image',()=>{
 const frame=new RigFrame(new THREE.Texture(),poses[0],2.05,2.05,.025);
 frame.deform(poses[0]);const a=frame.geometry.attributes.position;
 for(let i=0;i<a.count;i++){assert.ok(Math.abs(a.getX(i)-frame.rest[i*2])<.00001);assert.ok(Math.abs(a.getY(i)-frame.rest[i*2+1])<.00001);}
});
test('every interpolated pitch produces finite mesh vertices',()=>{
 const frames=poses.map(p=>new RigFrame(new THREE.Texture(),p,2.05,2.05,.025));
 for(let i=0;i<5;i++)for(const fraction of [.1,.35,.5,.75,.99]){const target=blendPose(poses[i],poses[i+1],fraction);for(const frame of [frames[i],frames[i+1]]){frame.deform(target);assert.ok(frame.geometry.attributes.position.array.every(Number.isFinite));}}
});
test('catcher mitt follows the pitch continuously and stays within safe reach',()=>{
 const base=localPose(CATCHER_POSE,1.42,1.42,.055),before=catcherTarget(base,5,5,0),after=catcherTarget(base,5,5,1);
 assert.deepEqual(before.mitt,base.mitt);assert.ok(Math.abs(after.mitt[0]-base.mitt[0]-.62)<1e-9);assert.ok(Math.abs(after.mitt[1]-base.mitt[1]-.58)<1e-9);
 const mid=catcherTarget(base,0,.8,.5);assert.ok(mid.mitt.every(Number.isFinite));assert.notDeepEqual(mid.mitt,base.mitt);
});
test('catcher receiving target projects onto the same screen point as the ball',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1.6,.05,250);applyUmpireView(camera,1.6);
 const frame=new RigFrame(new THREE.Texture(),poses[0],2,2,.02),actor=new PaintedActor(scene,[frame],CATCHER_POSITION);actor.face(camera);actor.root.updateMatrixWorld(true);
 const ball=new THREE.Vector3(.3,.7,-.15),local=actor.projectPoint(ball,camera),point=actor.root.localToWorld(new THREE.Vector3(...local,0));const a=ball.clone().project(camera),b=point.project(camera);assert.ok(Math.abs(a.x-b.x)<1e-10);assert.ok(Math.abs(a.y-b.y)<1e-10);
});
test('plate and mound remain centred with a modest catcher shoulder slot at every aspect',()=>{
 for(const aspect of [390/844,1,16/9,21/9]){
  const camera=new THREE.PerspectiveCamera(60,aspect,.05,250);applyUmpireView(camera,aspect);
  for(const point of [[0,.04,0],[0,1.3,18.44]])assert.ok(Math.abs(new THREE.Vector3(...point).project(camera).x)<1e-12);
  const helmet=new THREE.Vector3(CATCHER_POSITION[0],1.28,CATCHER_POSITION[2]).project(camera);assert.ok(helmet.x<0&&helmet.x>-.5);
  for(const x of [-.26,.26]){const p=new THREE.Vector3(x,.8,.22).project(camera);assert.ok(Math.abs(p.x)<.95&&Math.abs(p.y)<.95);}
 }
});
