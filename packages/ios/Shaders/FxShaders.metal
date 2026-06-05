#include <metal_stdlib>
using namespace metal;

// Uniforms — the field order MUST match the Swift `FxUniforms` struct.
struct FxUniforms {
  float time;
  float2 resolution;
  float intensity;
  float pressDepth;
  float2 touch;  // normalized touch point, 0..1, y up; (0.5, 0.5) when idle
};

struct VSOut {
  float4 position [[position]];
  float2 uv;
};

// Full-screen triangle generated from vertex_id (no vertex buffer needed).
vertex VSOut fx_fullscreen_vertex(uint vid [[vertex_id]]) {
  float2 p = float2(float((vid << 1) & 2), float(vid & 2));
  VSOut out;
  out.position = float4(p * 2.0 - 1.0, 0.0, 1.0);
  out.uv = p;
  return out;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

static inline float hash21(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

static inline float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + float2(1.0, 0.0));
  float c = hash21(i + float2(0.0, 1.0));
  float d = hash21(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

static inline float fbm(float2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * vnoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

// IQ cosine palette.
static inline float3 palette(float t, float3 a, float3 b, float3 c, float3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// Iridescent prism gradient: blue → orange → white → cyan → blue (loops).
static inline float3 prism(float h) {
  h = fract(h);
  float3 blue = float3(0.10, 0.30, 1.0);
  float3 orange = float3(1.0, 0.45, 0.12);
  float3 white = float3(1.0, 0.98, 0.95);
  float3 cyan = float3(0.25, 0.85, 1.0);
  if (h < 0.30) return mix(blue, orange, h / 0.30);
  if (h < 0.50) return mix(orange, white, (h - 0.30) / 0.20);
  if (h < 0.70) return mix(white, cyan, (h - 0.50) / 0.20);
  return mix(cyan, blue, (h - 0.70) / 0.30);
}

static inline float aspectOf(constant FxUniforms &u) {
  return u.resolution.x / max(u.resolution.y, 1.0);
}

static inline half4 out4(float3 col, constant FxUniforms &u) {
  col *= u.intensity;
  return half4(half3(saturate(col)), 1.0);
}

// ===========================================================================
// Curated catalog — each effect has its own style, animation, and palette.
// ===========================================================================

// Fractal Clouds — organic noise, slow drift. Soft sky → white billows.
fragment half4 fx_fractal_clouds(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]]) {
  float2 uv = in.uv;
  uv.x *= aspectOf(u);
  float t = u.time * 0.03;  // slow drift
  float2 p = uv * 2.6 + float2(t, t * 0.4);
  float n = fbm(p) + 0.5 * fbm(p * 2.0 + float2(-t * 0.6, t * 0.2));
  n /= 1.5;
  float3 sky = float3(0.18, 0.36, 0.64);
  float3 cloud = float3(0.96, 0.97, 1.0);
  float3 col = mix(sky, cloud, smoothstep(0.35, 0.82, n));
  col += float3(0.28, 0.20, 0.08) * pow(saturate(in.uv.y), 2.0) * 0.30;  // warm high glow
  return out4(col, u);
}

// Ink Smoke — diffused, layered, soft. Ink blooming in water on warm paper.
fragment half4 fx_ink_smoke(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]]) {
  float2 uv = in.uv;
  uv.x *= aspectOf(u);
  float t = u.time * 0.06;
  float2 p = uv * 3.0;
  float2 q = float2(fbm(p + float2(0.0, t)), fbm(p + float2(t, 0.0) + 3.1));
  float2 r = float2(fbm(p + 3.0 * q + float2(1.7, 9.2)), fbm(p + 3.0 * q + float2(8.3, 2.8)));
  float ink = pow(fbm(p + 3.0 * r), 1.6);
  float density = smoothstep(0.18, 0.78, ink);
  float3 paper = float3(0.93, 0.92, 0.90);
  float3 inkCol = float3(0.05, 0.05, 0.09);
  float3 col = mix(paper, inkCol, density);
  col = mix(col, float3(0.10, 0.18, 0.42), smoothstep(0.44, 0.56, ink) * 0.22);  // faint blue bleed
  return out4(col, u);
}

// Liquid Chrome — reflective, animated. Steel surface with moving specular streaks.
fragment half4 fx_liquid_chrome(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]]) {
  float2 uv = in.uv;
  uv.x *= aspectOf(u);
  float t = u.time * 0.2;
  float2 p = uv * 3.0;
  float2 drift = float2(t, -t * 0.5);
  float e = 0.01;
  float h = fbm(p + drift);
  float hx = fbm(p + float2(e, 0.0) + drift);
  float hy = fbm(p + float2(0.0, e) + drift);
  float2 n = float2(h - hx, h - hy) / e;            // fake surface normal
  float refl = sin((n.x + n.y) * 3.0 + h * 8.0 + t * 2.0) * 0.5 + 0.5;
  float3 steel = float3(0.12, 0.13, 0.16);
  float3 light = float3(0.85, 0.90, 1.0);
  float3 col = mix(steel, light, pow(refl, 2.0));
  col += float3(1.0) * pow(saturate(refl), 24.0) * 0.5;  // sharp chrome streak
  return out4(col, u);
}

// Loop — diagonal iridescent light streaks glowing at the edges, dark center.
fragment half4 fx_loop(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]]) {
  float2 uv = in.uv;
  float aspect = aspectOf(u);
  float t = u.time;

  // diagonal coordinate — stripes run lower-left → upper-right
  float d = uv.x * aspect - uv.y;

  // fine, scrolling bright stripes (loops continuously)
  float phase = d * 26.0 - t * 1.5;
  float stripe = pow(0.5 + 0.5 * sin(phase * 3.14159), 8.0);

  // slow iridescent color shift along the diagonal
  float3 color = prism(d * 0.55 + t * 0.04);

  // edge glow: dark center, bright top & bottom, extra at the corners
  float vy = pow(saturate(abs(uv.y - 0.5) * 2.0), 1.5);
  float2 cc = uv - 0.5;
  cc.x *= aspect;
  float vr = pow(saturate(length(cc) * 1.4), 2.2);
  float vig = max(vy, vr);

  float3 col = color * stripe * vig * 2.4;
  col += color * 0.05 * vig;                                  // soft color wash on the glow
  col += float3(0.012, 0.016, 0.03) * (0.4 + 0.6 * stripe);  // faint stripes in the dark center
  return out4(col, u);
}

// Dots — wavy, animated, 3D. INTERACTIVE: dots swell and glow under your finger.
fragment half4 fx_dots(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]]) {
  float aspect = aspectOf(u);
  float2 uv = in.uv;
  uv.x *= aspect;
  float t = u.time;

  // finger bulge: dots near the touch rise and brighten (stronger while pressed)
  float2 tp = float2(u.touch.x * aspect, u.touch.y);
  float distTouch = distance(uv, tp);
  float bulge = exp(-distTouch * distTouch * 7.0) * u.pressDepth;  // only while touching

  float grid = 15.0;
  float2 cell = uv * grid;
  float2 id = floor(cell);
  float2 f = fract(cell) - 0.5;
  float wave = 0.5 * sin(id.x * 0.5 + t) + 0.5 * sin(id.y * 0.5 + t * 1.3);
  float radius = 0.30 + 0.12 * wave + 0.28 * bulge;  // swell toward the finger
  float d = length(f);
  float mask = smoothstep(radius, radius - 0.04, d);
  float z = sqrt(max(radius * radius - d * d, 0.0)) / max(radius, 0.001);
  float3 normal = normalize(float3(f, z));
  float3 lightDir = normalize(float3(0.5, 0.6, 0.8));
  float diff = saturate(dot(normal, lightDir));
  float3 base = palette(0.5 + 0.5 * wave + id.x * 0.02,
                        float3(0.5), float3(0.5), float3(1.0), float3(0.0, 0.33, 0.67));
  float3 col = float3(0.02, 0.03, 0.05);
  col = mix(col, base * (0.3 + 0.7 * diff), mask);
  col += float3(1.0) * pow(diff, 16.0) * mask * 0.6;        // specular highlight
  col += float3(0.45, 0.75, 1.0) * bulge * mask * 0.9;      // glow under the finger
  return out4(col, u);
}
