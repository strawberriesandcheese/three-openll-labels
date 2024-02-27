
vDebugPosition = position.xy;

vUv = texCoords.xy + position.xy * (texCoords.zw - texCoords.xy);

vec3 tangentDirection = position.x * tangent;
vec3 upDirection = position.y * up;
vec3 transformed = origin + tangentDirection + upDirection;
