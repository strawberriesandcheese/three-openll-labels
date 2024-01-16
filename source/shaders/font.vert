precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform vec3 color;

attribute vec3 position;
attribute vec3 origin;
attribute vec3 tangent;
attribute vec3 up;
attribute vec4 texCoords;

varying vec3 vColor;

void main(){
  vColor = color;

  vec3 tangentDirection = origin + position.x * tangent;
  vec4 pos = vec4((tangentDirection + position.y * up).xy, position.z + origin.z, 1.0);

  gl_Position = projectionMatrix * modelViewMatrix * pos;

}