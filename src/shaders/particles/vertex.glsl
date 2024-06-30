uniform vec2 uResolution;
uniform float uSize;
uniform sampler2D uParticlesTexture;
uniform mat4 uLightMatrix;
uniform float uPointSizeNumerator;
uniform float uPointSizeSmoothStepStart;
uniform float uPointSizeSmoothStepEnd;
uniform vec3 uFollowPosition;

attribute vec2 aParticlesUv;
attribute float aSize;

varying vec2 vUv;
varying vec4 vWorldPosition;
varying vec4 vLightSpacePosition;
varying float vDistanceFromCenter;

void main()
{   
    vUv = aParticlesUv;
    vec4 particle = texture(uParticlesTexture, aParticlesUv);


    // Final position
    // vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 modelPosition = modelMatrix * vec4(particle.xyz, 1.0);
    vDistanceFromCenter = length(particle.xyz - uFollowPosition);
    vWorldPosition = modelPosition;
    vLightSpacePosition = uLightMatrix * modelPosition;
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Point size
    float sizeIn = smoothstep(0.0, 0.1, particle.a);
    float sizeOut = 1.0 - smoothstep(0.7, 1.0, particle.a);
    float size = min(sizeIn, sizeOut);

    // Point size -- bruno simon's 
    // gl_PointSize = size * aSize * uSize * uResolution.y;
    // gl_PointSize *= (1.0 / - viewPosition.z);

    // edan kwan's
    gl_PointSize = uPointSizeNumerator / length( viewPosition.xyz ) * smoothstep(uPointSizeSmoothStepStart, uPointSizeSmoothStepEnd, particle.a) * uSize;

}