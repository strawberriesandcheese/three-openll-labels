precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform vec3 color;

attribute vec3 position;
attribute vec3 origin;

varying vec3 vColor;

void main(){
  vColor = color;

  vec3 pos = position + origin;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );

}