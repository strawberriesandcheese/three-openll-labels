precision highp float;

varying vec4 vColor;
varying vec2 vUv;

uniform sampler2D map;

const int channel = 0;

void main() {
  float alpha = 0.0;
  alpha = step(0.5, texture2D(map, vUv)[channel]);
  //for testing
  //alpha = 1. - alpha;
  //maybe don't discard who knows: https://stackoverflow.com/questions/8509051/is-discard-bad-for-program-performance-in-opengl
  if(alpha <= 0.0) {
        discard;
    }
  gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
}