// Neutral plate view: keep the lens on the plate-to-mound centre line.
// The previous 65 cm side offset made the batter and pitch lane look skewed.
export const UMPIRE_VIEW={position:[0,1.60,-2.65],target:[0,1.30,18.44]};
// The catcher sets slightly to screen-left, leaving the umpire a modest
// shoulder slot while the plate and mound stay centred in the image.
export const CATCHER_POSITION=[.28,.015,-.5];
export function applyUmpireView(camera,aspect){
  camera.position.set(...UMPIRE_VIEW.position);
  camera.lookAt(...UMPIRE_VIEW.target);
  camera.aspect=aspect;
  camera.fov=2*Math.atan(Math.max(Math.tan(30*Math.PI/180),Math.tan(38*Math.PI/180)/aspect))*180/Math.PI;
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
