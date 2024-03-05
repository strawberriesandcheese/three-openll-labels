
    float alpha = 0.0;
    vec3 resultColor = diffuseColor.rgb;

    alpha = aastep(0.5, texture2D(fontMap, vFontUv)[channel]);

    if (fontDebug) {
      float outlineStrength = 0.05;
      vec3 outlineColor = vec3(0., 1., 0.);
      vec2 outline = max(step(vFontDebugPosition, vec2(outlineStrength)),step(vec2(1. - outlineStrength),vFontDebugPosition));
      alpha = max(alpha, max(outline.x, outline.y));
      resultColor = mix(outlineColor, diffuseColor.rgb, alpha - max(outline.x, outline.y));
    }

    //maybe don't discard who knows: https://stackoverflow.com/questions/8509051/is-discard-bad-for-program-performance-in-opengl
    if(alpha <= 0.0) {
      discard;
    }

    gl_FragColor = vec4(resultColor, alpha);
