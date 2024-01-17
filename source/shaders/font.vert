precision highp float;

//uniform mat4 modelViewMatrix;
//uniform mat4 projectionMatrix;

uniform vec3 color;

//attribute vec3 position;
attribute vec3 origin;
attribute vec3 tangent;
attribute vec3 up;
attribute vec4 texCoords;

varying vec4 vColor;
varying vec2 vUv;

void main(){
  vColor = vec4(color, 1.0);
  vUv = position.xy;

  //vUv = mix(texCoords.xy, texCoords.zw, position.xy);
  vUv = texCoords.xy + position.xy * (texCoords.zw - texCoords.xy);

  vec3 tangentDirection = position.x * tangent;
  vec3 upDirection = position.y * up;
  vec4 pos = vec4(origin + tangentDirection + upDirection, 1.0);

  gl_Position = projectionMatrix * modelViewMatrix * pos;

}