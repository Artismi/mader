/**
 * Shared GLSL Utilities and Helpers for Creative OS Filters.
 */

export function clamp(v: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, v))
}

// Shared GLSL: Simplex Noise 2D (Ashima Arts / Stefan Gustavson, MIT / public domain)
export const GLSL_SNOISE = `
  vec3 mod289_sn(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec2 mod289_sn(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec3 permute_sn(vec3 x){return mod289_sn(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i=floor(v+dot(v,C.yy));
    vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
    vec4 x12=x0.xyxy+C.xxzz;
    x12.xy-=i1;
    i=mod289_sn(i);
    vec3 p=permute_sn(permute_sn(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
    vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
    m=m*m;m=m*m;
    vec3 xv=2.0*fract(p*C.www)-1.0;
    vec3 h=abs(xv)-0.5;
    vec3 ox=floor(xv+0.5);
    vec3 a0=xv-ox;
    m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
    vec3 g;
    g.x=a0.x*x0.x+h.x*x0.y;
    g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.0*dot(m,g);
  }
`

// Shared GLSL: HSV → RGB
export const GLSL_HSV2RGB = `
  vec3 hsv2rgb(vec3 c){
    vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);
    vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);
    return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);
  }
`

// Shared GLSL: value noise 2D
export const GLSL_VNOISE = `
  float hashf(float n){return fract(sin(n)*43758.5453);}
  float vnoise(vec2 p){
    vec2 i=floor(p);vec2 f=fract(p);
    f=f*f*(3.0-2.0*f);
    float a=hashf(i.x+i.y*57.0);
    float b=hashf(i.x+1.0+i.y*57.0);
    float c=hashf(i.x+(i.y+1.0)*57.0);
    float d=hashf(i.x+1.0+(i.y+1.0)*57.0);
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
  }
`

// Shared GLSL: Gold Noise (High quality procedural randomness)
export const GLSL_GOLD_NOISE = `
  float gnoise(vec2 co){
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }
`
// Shared GLSL: Blend Modes (Shader Lab Master Code Grade)
export const GLSL_BLEND_MODES = `
  vec3 blendMultiply(vec3 base, vec3 top) { return base * top; }
  vec3 blendScreen(vec3 base, vec3 top) { return 1.0 - (1.0 - base) * (1.0 - top); }
  vec3 blendOverlay(vec3 base, vec3 top) {
    vec3 result;
    for(int i=0; i<3; i++) {
      result[i] = base[i] < 0.5 ? 2.0 * base[i] * top[i] : 1.0 - 2.0 * (1.0 - base[i]) * (1.0 - top[i]);
    }
    return result;
  }
  vec3 applyBlend(vec3 base, vec3 top, float opacity, int mode) {
    vec3 res = top;
    if (mode == 1) res = blendMultiply(base, top);
    else if (mode == 2) res = blendScreen(base, top);
    else if (mode == 3) res = blendOverlay(base, top);
    return mix(base, res, opacity);
  }
`
