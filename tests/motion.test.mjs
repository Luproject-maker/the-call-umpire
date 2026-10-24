import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {RigFrame,PaintedActor} from '../dist/painted-rig.js';
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
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(64,1.6,.05,250);camera.position.set(.65,1.68,-3);camera.lookAt(0,1.1,18);camera.updateMatrixWorld();
 const frame=new RigFrame(new THREE.Texture(),poses[0],2,2,.02),actor=new PaintedActor(scene,[frame],[-.12,.015,-.5]);actor.face(camera);actor.root.updateMatrixWorld(true);
 const ball=new THREE.Vector3(.3,.7,-.15),local=actor.projectPoint(ball,camera),point=actor.root.localToWorld(new THREE.Vector3(...local,0));const a=ball.clone().project(camera),b=point.project(camera);assert.ok(Math.abs(a.x-b.x)<1e-10);assert.ok(Math.abs(a.y-b.y)<1e-10);
});
