#include ../includes/curl.glsl

uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;
uniform vec3 mouse3d;
uniform float uFollowMouse;
uniform vec3 uFollowPosition;

uniform float uRadius;
uniform float uDieSpeed;
uniform float uAttraction;
uniform float uSpeed;
uniform float uCurlSize;

uniform float uA;
uniform float uB;
uniform float uC;
uniform float uD;
uniform float uE;
uniform float uF;
uniform float uG;
uniform float uH;
uniform float uI;
uniform float uJ;
uniform float uK;
uniform float uL;
uniform float uM;
uniform float uCurlTimeReducer;

void main()
{
    float time = uTime * uA;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 particle = texture(uParticles, uv);
    vec4 base = texture(uBase, uv);

    float life = particle.a - uDieSpeed * uDeltaTime;

    float initAnimation = 1.0;

    vec3 targetPositionIfFollowEnabled = mix(vec3(0.0, -(1.0 - initAnimation) * 200.0, 0.0), uFollowPosition, smoothstep(0.2, 0.7, initAnimation));
    vec3 followPosition = mix(vec3(0.0), targetPositionIfFollowEnabled, uFollowMouse);

    // Dead
    if (life < 0.0) 
    {
      particle.xyz = base.xyz * (uB + sin(time * uC) * uD + (1.0 - initAnimation)) * uE * uRadius;
      particle.xyz += followPosition;
      life = uF + fract(base.w * uG + time);
    }

    else 
    {
      vec3 delta = followPosition - particle.xyz;
      vec3 movement = delta * (uH + life * uI) * uAttraction * (1.0 - smoothstep(uJ, uK, length(delta))) * (uSpeed / 100.0);
      vec3 curlEffect = curl(particle.xyz * uCurlSize, time, uL + (1.0 - life) * uM) *uSpeed;

       // Freeze particle movement by multiplying with uFreezeParticles
      particle.xyz += movement * uCurlTimeReducer;
      particle.xyz += curlEffect * uCurlTimeReducer;
    }

    gl_FragColor = vec4(particle.xyz, life);
}
