// GLSL: cursor-trail reveal mask, helmet wireframe outline, animated line backdrop, depth-parallax head.
import { OUTLINE_MAX_WAVES } from './constants.js';

const revealTrailFunction = (name, trail, boundsMin, boundsMax, pace, warp, length, radius, samples) =>
  /* glsl */
  `
  float ${name}(vec2 ndc) {
    float gate = smoothstep(uGateStart, uGateStart + uGateWidth, ${pace});
    if (gate <= 0.0) return 0.0;

    vec2 bounded = vec2(ndc.x * uAspect, ndc.y);
    if (any(lessThan(bounded, ${boundsMin})) || any(greaterThan(bounded, ${boundsMax}))) {
      return 0.0;
    }

    vec2 point = bounded;
    if (${warp} > 0.001) {
      vec2 noiseUv = ndc * 0.5 + 0.5;
      float nx = texture2D(uNoiseTex, noiseUv * uWarpScale + vec2(uTime * 0.07, uTime * 0.05)).r;
      float ny = texture2D(uNoiseTex, noiseUv * uWarpScale * 1.4 - vec2(uTime * 0.06, uTime * 0.09)).r;
      point += (vec2(nx, ny) - 0.5) * ${warp} * 0.22;
    }

    float radius = ${radius} * mix(uIdleScale, 1.0, ${pace});
    float taper = uTaper * mix(uTaperIdle, uTaperFast, ${pace});

    float span = max(${length} * float(${samples} - 1), 1.0);
    float ceiling = uThreshold + uEdge;
    float trail = 0.0;
    for (int i = 0; i < ${samples} - 1; i++) {
      if (float(i) >= span) break;
      float weight = pow(1.0 - float(i) / span, taper);
      if (weight <= trail) break;

      vec2 a = vec2(${trail}[i].x * uAspect, ${trail}[i].y);
      vec2 b = vec2(${trail}[i + 1].x * uAspect, ${trail}[i + 1].y);
      float r = radius * weight;
      trail = max(trail, weight * smoothstep(r, r * 0.35, revealSegment(point, a, b)));

      if (trail >= ceiling) break;
    }

    return smoothstep(uThreshold - uEdge, uThreshold + uEdge, trail) * gate;
  }
`;
export const buildRevealDeclarations = (samples) =>
  /* glsl */
  `
  uniform vec2 uTrail[${samples}];
  uniform vec2 uTrailMin;
  uniform vec2 uTrailMax;
  uniform float uPace;
  uniform vec2 uSweep[${samples}];
  uniform vec2 uSweepMin;
  uniform vec2 uSweepMax;
  uniform float uSweepPace;
  uniform float uSweepWarp;
  uniform float uSweepLength;
  uniform float uSweepRadius;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uIdleScale;
  uniform float uTaper;
  uniform float uTaperIdle;
  uniform float uTaperFast;
  uniform float uLength;
  uniform float uGateStart;
  uniform float uGateWidth;
  uniform float uWarpScale;
  uniform float uTime;
  uniform float uEdge;
  uniform float uThreshold;
  uniform float uWarp;
  uniform float uRevealMix;
  uniform sampler2D uNoiseTex;

  float revealSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
  }

  ${revealTrailFunction('revealCursorTrail', 'uTrail', 'uTrailMin', 'uTrailMax', 'uPace', 'uWarp', 'uLength', 'uRadius', samples)}
  ${revealTrailFunction('revealSweepTrail', 'uSweep', 'uSweepMin', 'uSweepMax', 'uSweepPace', 'uSweepWarp', 'uSweepLength', 'uSweepRadius', samples)}

  float revealTrail(vec2 ndc) {
    float cursor = revealCursorTrail(ndc);
    if (cursor >= 1.0) return 1.0;
    return max(cursor, revealSweepTrail(ndc));
  }
`;
export const outlineVertex =
  /* glsl */
  `
  varying float vHeight;
  uniform float uMinY;
  uniform float uRangeY;
  void main() {
    vHeight = (position.y - uMinY) / max(uRangeY, 0.0001);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
export const outlineFragment =
  /* glsl */
  `
  varying float vHeight;
  uniform float uTime;
  uniform float uPeriod;
  uniform float uStagger;
  uniform float uOpacity;
  uniform float uBase;
  uniform float uWidth;
  uniform float uLightness;
  uniform float uRevealMix;
  uniform vec3 uColor;

  void main() {
    float width = max(uWidth, 0.0001);
    float period = max(uPeriod, 0.0001);
    float stagger = max(uStagger, 0.0001);

    float start = 1.0 + width * 3.0;
    float travel = 1.0 + width * 6.0;

    float wave = 0.0;
    for (int i = 0; i < ${OUTLINE_MAX_WAVES}; i++) {
      float age = mod(uTime, stagger) + float(i) * stagger;
      if (age > period) break;
      float centre = start - (age / period) * travel;
      float d = (vHeight - centre) / width;
      wave = max(wave, exp(-d * d));
    }

    vec3 stroke = mix(uColor, vec3(1.0), uLightness);
    gl_FragColor = vec4(stroke, (uBase + wave * uOpacity) * uRevealMix);
  }
`;
export const backdropVertex =
  /* glsl */
  `
  varying vec4 vBackdropClip;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vBackdropClip = clip;
    gl_Position = clip;
  }
`;
export const buildBackdropFragment = (samples) =>
  /* glsl */
  `
  varying vec4 vBackdropClip;
  uniform vec3 uBackground;
  uniform vec3 uLineColor;
  uniform vec3 uRevealColor;
  uniform vec3 uRevealColorAlt;
  uniform float uLineScale;
  uniform float uLineCount;
  uniform float uLineThickness;
  uniform float uLineOpacity;
  uniform float uWaveAmount;
  uniform float uWaveSpeed;
  uniform float uRevealOpacity;
  ${buildRevealDeclarations(samples)}

  float backdropField(vec2 p, float t) {
    float f = sin(p.x * 1.00 + t * 0.60) * 0.50;
    f += sin(p.y * 0.85 - t * 0.45) * 0.45;
    f += sin((p.x + p.y) * 0.65 + t * 0.35) * 0.35;
    f += sin((p.x - p.y) * 0.95 - t * 0.55) * 0.25;
    return f * 0.5 + 0.5;
  }

  void main() {
    vec2 ndc = vBackdropClip.xy / vBackdropClip.w;
    vec2 p = vec2(ndc.x * uAspect, ndc.y) * uLineScale;

    float t = uTime * uWaveSpeed;
    vec2 q = p;
    q.x += sin(p.y * 0.8 + t * 0.7) * uWaveAmount;
    q.y += cos(p.x * 0.7 - t * 0.6) * uWaveAmount;

    float scaled = backdropField(q, t) * uLineCount;

    float w = max(fwidth(scaled) * uLineThickness, 1e-5);
    float line = 1.0 - smoothstep(0.0, w, abs(fract(scaled) - 0.5));

    vec3 color = mix(uBackground, uLineColor, line * uLineOpacity * uRevealMix);

    float parity = mod(floor(scaled + 0.5), 2.0);
    vec3 revealShade = mix(uRevealColor, uRevealColorAlt, parity);

    if (uRevealOpacity > 0.001) {
      color = mix(
        color,
        revealShade,
        revealTrail(ndc) * uRevealMix * uRevealOpacity
      );
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;
export const headVertex =
  /* glsl */
  `
  uniform float uExtend;
  varying vec2 vUv;
  void main() {
    vUv = vec2(uv.x, 1.0 - (1.0 - uv.y) * (1.0 + uExtend));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
export const headFragment =
  /* glsl */
  `
  uniform sampler2D uDiffuse;
  uniform sampler2D uDepth;
  uniform sampler2D uAlpha;
  uniform sampler2D uNormal;
  uniform vec2 uParallax;
  uniform float uReveal;
  uniform float uDepthScale;
  uniform float uRelight;
  varying vec2 vUv;
  void main() {
    float depth = texture2D(uDepth, vUv).r;
    vec2 offset = uParallax * (depth - 0.5) * uDepthScale;
    vec2 uv = vUv + offset;
    vec4 color = texture2D(uDiffuse, uv);
    float alpha = texture2D(uAlpha, uv).r;

    vec3 normal = normalize(texture2D(uNormal, uv).rgb * 2.0 - 1.0);
    vec3 lightDir = normalize(vec3(uParallax * 1.6, 1.0));
    float lambert = max(dot(normal, lightDir), 0.0) - 0.72;
    vec3 lit = color.rgb * (1.0 + lambert * uRelight);

    gl_FragColor = vec4(clamp(lit, 0.0, 1.0), alpha * uReveal);
    #include <colorspace_fragment>
  }
`;
