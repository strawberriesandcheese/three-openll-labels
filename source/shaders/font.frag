precision highp float;

varying vec2 vUv;
varying vec2 vDebugPosition;

uniform sampler2D map;
uniform bool debug;
uniform vec3 color;
//uniform bool aa;

const int channel = 0;
const bool aa = true;

// Anti-aliasing implementation based on https://github.com/cginternals/webgl-operate/blob/master/source/text/glyph.frag
float aastep(float t, float value)
{
  if(aa) 
  {
    //TODO: find good value? was formerly a uniform in webgl-operate
    float aaStepScale = 0.1;
    /* float afwidth = length(vec2(dFdx(value), dFdy(value))) * u_aaStepScale; */
    float afwidth = fwidth(value) * aaStepScale;
    /* The aa step scale is more of a hack to provide seemingly smoother (e.g., >= 1.0) or crisper (e.g., between 0.0
     * and 1.0) contours without specific sampling. It's just scaling the outcome of the derivatives.
     */

    return smoothstep(t - afwidth, t + afwidth, value);
  }
    return step(t, value);
}

void main() {
  float alpha = 0.0;
  vec3 resultColor = color;

  alpha = aastep(0.5, texture2D(map, vUv)[channel]);

  if (debug) {
    float outlineStrength = 0.05;
    vec3 outlineColor = vec3(0., 1., 0.);
    vec2 outline = max(step(vDebugPosition, vec2(outlineStrength)),step(vec2(1. - outlineStrength),vDebugPosition));
    alpha = max(alpha, max(outline.x, outline.y));
    resultColor = mix(outlineColor, color, alpha - max(outline.x, outline.y));
  }

  //maybe don't discard who knows: https://stackoverflow.com/questions/8509051/is-discard-bad-for-program-performance-in-opengl
  if(alpha <= 0.0) {
        discard;
    }
  
  gl_FragColor = vec4(resultColor, alpha);
}