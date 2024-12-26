@group(0) @binding(0)
var<uniform> modelView: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> projection: mat4x4<f32>;
@group(0) @binding(2)
var<uniform> normalMatrix: mat4x4<f32>;
@group(0) @binding(3) 
var<uniform> lightDirection: vec3<f32>;
@group(0) @binding(4)
var<uniform> viewDirection: vec3<f32>;

@group(0) @binding(5)
var<uniform> shininess:f32;
    
const diffuseConstant:f32 = 1.0;
const specularConstant:f32 = 0.0;
const ambientConstant: f32 = 0.0;

fn specular(lightDir:vec3<f32>, viewDir:vec3<f32>, normal:vec3<f32>, shininess:f32) -> f32 {
    let reflectDir:vec3<f32> = reflect(-lightDir, normal);
    let specDot:f32 = max(dot(reflectDir, viewDir), 0.0);
    return pow(specDot, shininess);
}

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) viewDir: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) lightDir: vec3<f32>,
    @location(3) wldLoc: vec3<f32>,
    @location(4) lightLoc: vec3<f32>,
    @location(5) inPos: vec3<f32>
};

@vertex
fn vs_main(
    @location(0) inPos: vec3<f32>,
    @location(1) inNormal: vec3<f32>
) -> VertexOutput {
    var out: VertexOutput;

    out.viewDir = normalize((normalMatrix * vec4<f32>(-viewDirection, 0.0)).xyz);
    out.lightDir = normalize((normalMatrix * vec4<f32>(-lightDirection, 0.0)).xyz);
    out.normal = normalize(normalMatrix * vec4<f32>(inNormal, 0.0)).xyz;  
    var wldLoc:vec4<f32> = modelView * vec4<f32>(inPos, 1.0);
    out.clip_position = projection * wldLoc;
    out.wldLoc = wldLoc.xyz / wldLoc.w;
    out.inPos = inPos;
    var lightLoc:vec4<f32> = modelView * vec4<f32>(lightDirection, 1.0);
    out.lightLoc = lightLoc.xyz / lightLoc.w;

    return out;
}

@group(0) @binding(6)
var t_depth: texture_depth_2d;
@group(0) @binding(7)
var s_depth: sampler_comparison;
@group(0) @binding(8)
var<uniform> lightModelViewMatrix: mat4x4<f32>;
@group(0) @binding(9)
var<uniform> lightProjectionMatrix: mat4x4<f32>;
@group(0) @binding(10)
var t_shade: texture_1d<f32>;
@group(0) @binding(11)
var s_shade: sampler;

@fragment
fn fs_main(in: VertexOutput, @builtin(front_facing) face: bool) -> @location(0) vec4<f32> {
    var lightLoc:vec3<f32> = in.lightLoc;
    var lightDir:vec3<f32> = normalize(in.lightDir);
    var n:vec3<f32> = normalize(in.normal);
    var viewDir: vec3<f32> = in.viewDir;

    var fragmentPosInShadowMapSpace: vec4<f32> = lightProjectionMatrix * lightModelViewMatrix * vec4(in.inPos, 1.0);
    fragmentPosInShadowMapSpace = fragmentPosInShadowMapSpace / fragmentPosInShadowMapSpace.w;
    var depth: f32 = fragmentPosInShadowMapSpace.z;
    var uv: vec2<f32> = 0.5*(fragmentPosInShadowMapSpace.xy + vec2(1.0, 1.0));

    var visibility = 0.0;
    let oneOverShadowDepthTextureSize = 1.0 / 1024.0;
    for (var y = -2; y <= 2; y++) {
        for (var x = -2; x <= 2; x++) {
            let offset = vec2<f32>(vec2(x,y)) * oneOverShadowDepthTextureSize;
            visibility += textureSampleCompare(t_depth, s_depth, vec2(uv.x, 1.0 - uv.y) + offset, depth - 0.0003);
        }
    }
    visibility /= 25.0;

    var intensity: f32 = max(dot(-lightDir, n), 0.0) * diffuseConstant + specular(-lightDir, viewDir, n, shininess) * specularConstant;
    var diffuse: vec3<f32> = textureSample(t_shade, s_shade, intensity * visibility).xyz; 

    if (face) {
        var wldLoc2Light:vec3<f32> = in.wldLoc - lightLoc;
        var align:f32 = dot(normalize(wldLoc2Light), lightDir);
        
        if (align > 0.9) {
            return vec4<f32>(diffuse, 1.0);   
        }
    } 
    return vec4<f32>( 0.0,0.0,0.0,1.0);
}