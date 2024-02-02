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
    float aaStepScale = 0.8;
    /* float afwidth = length(vec2(dFdx(value), dFdy(value))) * u_aaStepScale; */
    float afwidth = fwidth(value) * aaStepScale;
    /* The aa step scale is more of a hack to provide seemingly smoother (e.g., >= 1.0) or crisper (e.g., between 0.0
     * and 1.0) contours without specific sampling. It's just scaling the outcome of the derivatives.
     */

    return smoothstep(t - afwidth, t + afwidth, value);
  }
  return step(t, value);
}

/*
float aastep3h(float t, vec2 uv)
{
    float x = dFdy(uv.x) * 1.0 / 3.0;

    float v = aastep(t, texture2D(map, vUv + vec2( -x, 0.))[channel])
            + aastep(t, texture2D(map, vUv + vec2( 0., 0.))[channel])
            + aastep(t, texture2D(map, vUv + vec2( +x, 0.))[channel]);

    return v / 3.0;
}

float aastep3v(float t, vec2 uv)
{
    float y = dFdy(uv.y) * 1.0 / 3.0;

    float v = aastep(t, texture2D(map, vUv + vec2( 0., -y))[channel])
            + aastep(t, texture2D(map, vUv + vec2( 0., 0.))[channel])
            + aastep(t, texture2D(map, vUv + vec2( 0., +y))[channel])

    return v / 3.0;
}

float aastep3x3(float t, vec2 uv)
{
    float x = dFdx(uv.x) * 1.0 / 3.0;
    float y = dFdy(uv.y) * 1.0 / 3.0;

    float v = texSmooth(t, uv + vec2(  -x, -y)) + texSmooth(t, uv + vec2(  -x, 0.0)) + texSmooth(t, uv + vec2(  -x, +y))
            + texSmooth(t, uv + vec2( 0.0, -y)) + texSmooth(t, uv + vec2( 0.0, 0.0)) + texSmooth(t, uv + vec2( 0.0, +y))
            + texSmooth(t, uv + vec2(  +x, -y)) + texSmooth(t, uv + vec2(  +x, 0.0)) + texSmooth(t, uv + vec2(  +x, +y));

    return v / 9.0;
}

float aastep4x4(float t, vec2 uv)
{
    float x0 = dFdx(uv.x);
    float y0 = dFdx(uv.y);
    float x1 = x0 * 1.0 / 8.0;
    float y1 = y0 * 1.0 / 8.0;
    float x2 = x0 * 3.0 / 8.0;
    float y2 = y0 * 3.0 / 8.0;

    float v = texSmooth(t, uv + vec2(-x2,-y2)) + texSmooth(t, uv + vec2(-x2,-y1))
            + texSmooth(t, uv + vec2(-x2,+y1)) + texSmooth(t, uv + vec2(-x2,+y2))

            + texSmooth(t, uv + vec2(-x1,-y2)) + texSmooth(t, uv + vec2(-x1,-y1))
            + texSmooth(t, uv + vec2(-x1,+y1)) + texSmooth(t, uv + vec2(-x1,+y2))

            + texSmooth(t, uv + vec2(+x1,-y2)) + texSmooth(t, uv + vec2(+x1,-y1))
            + texSmooth(t, uv + vec2(+x1,+y1)) + texSmooth(t, uv + vec2(+x1,+y2))

            + texSmooth(t, uv + vec2(+x2,-y2)) + texSmooth(t, uv + vec2(+x2,-y1))
            + texSmooth(t, uv + vec2(+x2,+y1)) + texSmooth(t, uv + vec2(+x2,+y2));

    return v / 16.0;
}
*/

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