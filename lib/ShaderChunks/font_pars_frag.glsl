
varying vec2 vFontUv;
varying vec2 vFontDebugPosition;

uniform bool fontDebug;
uniform bool fontAA;
uniform sampler2D fontMap;

const int channel = 0;

// Anti-aliasing implementation based on https://github.com/cginternals/webgl-operate/blob/master/source/text/glyph.frag
float aastep(float t, float value)
{
  if(fontAA) 
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
