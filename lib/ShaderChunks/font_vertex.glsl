
vFontDebugPosition = position.xy;

vFontUv = fontTexCoords.xy + position.xy * (fontTexCoords.zw - fontTexCoords.xy);

vec3 tangentDirection = position.x * fontTangent;
vec3 upDirection = position.y * fontUp;
vec3 transformed = fontOrigin + tangentDirection + upDirection;
