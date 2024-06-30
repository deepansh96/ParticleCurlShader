
uniform sampler2D uLightDepthTexture;
uniform float uShadowReductionFactor;
uniform int uNumberOfSamples;
uniform float uSpread;
uniform float uShadowBias;
uniform float uColorMultiplier;
uniform float uTime;
uniform float u_R;
uniform float u_G;
uniform float u_B;

varying vec4 vLightSpacePosition;
varying vec3 vColor;
varying float vDistanceFromCenter;
// Function to calculate shadow using PCF
float calculateShadow(
    vec3 lightCoord, 
    sampler2D shadowMap, 
    float bias,
    int numberOfSamples,
    float _spread,
    float shadowReductionFactor
) {
    float shadow = 0.0;
    int samples = numberOfSamples; // Number of samples for PCF
    float spread = 1.0 / _spread; // Spread of the samples, depends on shadow map resolution

    for (int x = -samples; x <= samples; ++x) {
        for (int y = -samples; y <= samples; ++y) {
            vec2 offset = vec2(x, y) * spread;
            float depth = texture2D(shadowMap, lightCoord.xy + offset).r;
            if (lightCoord.z > depth + bias) {
                shadow += 1.0;
            }
        }
    }

    shadow /= (float((samples * 2 + 1) * (samples * 2 + 1)));
    return shadow * shadowReductionFactor;
}

void main()
{
    // Perform perspective divide for light space position
    vec3 lightCoord = vLightSpacePosition.xyz / vLightSpacePosition.w;
    lightCoord = lightCoord * 0.5 + 0.5; // Transform to [0, 1] range

    // Calculate shadow using PCF
    float shadow = calculateShadow(
        lightCoord, 
        uLightDepthTexture, 
        uShadowBias,
        uNumberOfSamples,
        uSpread,
        uShadowReductionFactor
    );

     vec3 uColor4 = vec3(
        0.16470588235294117,
        1.0,
        0.7529411764705882
    );
    vec3 uColor3 = vec3(
        0.20784313725490197,
        0.8235294117647058,
        0.7215686274509804
    );
    vec3 uColor2 = vec3(
        0.32941176470588235,
        0.3333333333333333,
        0.6392156862745098
    );
    // darkest
    vec3 uColor1 = vec3(
        0.5117647058823529,
        0.0,
        0.6803921568627451
    );

    // Apply shadow to fragment color
    vec3 shadowColor = mix(vec3(u_R, u_G, u_B), vec3(0.0), shadow); // Blend color based on shadow amount
    // Determine the blend factor based on time
    float blendFactor = 0.5 * (sin(uTime * 0.5) + 1.0); // Oscillates between 0 and 1
    gl_FragColor = vec4(shadowColor * uColorMultiplier, 1.0);

    // for circular particles
    float distanceToCenter = length(gl_PointCoord - 0.5);
    if(distanceToCenter > 0.5)
        discard;

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
