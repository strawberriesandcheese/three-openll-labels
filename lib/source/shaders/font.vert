precision highp float;

attribute vec3 origin;
attribute vec3 tangent;
attribute vec3 up;
attribute vec4 texCoords;

varying vec2 vUv;
varying vec2 vDebugPosition;

void main(){
  vDebugPosition = position.xy;

  vUv = texCoords.xy + position.xy * (texCoords.zw - texCoords.xy);

  vec3 tangentDirection = position.x * tangent;
  vec3 upDirection = position.y * up;
  vec4 pos = vec4(origin + tangentDirection + upDirection, 1.0);

  gl_Position = projectionMatrix * modelViewMatrix * pos;

}