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

@group(1) @binding(0)
var<uniform> offset: vec3<f32>;
@group(1) @binding(1)
var<uniform> ambientColor:vec4<f32>;// = vec4<f32>(0.15, 0.10, 0.10, 1.0);
@group(1) @binding(2)
var<uniform> diffuseColor:vec4<f32>;// = vec4<f32>(0.55, 0.55, 0.55, 1.0);
@group(1) @binding(3)
var<uniform> specularColor:vec4<f32>;// = vec4<f32>(1.0, 1.0, 1.0, 1.0);

@group(1) @binding(4)
var<uniform> shininess:f32;// = 20.0;
    
const diffuseConstant:f32 = 1.0;
const specularConstant:f32 = 1.0;
const ambientConstant: f32 = 1.0;

fn specular(lightDir:vec3<f32>, viewDir:vec3<f32>, normal:vec3<f32>,  specularColor:vec3<f32>, 
        shininess:f32) -> vec3<f32> {
    let reflectDir:vec3<f32> = reflect(-lightDir, normal);
    let specDot:f32 = max(dot(reflectDir, viewDir), 0.0);
    return pow(specDot, shininess) * specularColor;
}

fn diffuse(lightDir:vec3<f32>, normal:vec3<f32>,  diffuseColor:vec3<f32>) -> vec3<f32>{
    return max(dot(lightDir, normal), 0.0) * diffuseColor;
}

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) viewDir: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) lightDir: vec3<f32>,
    @location(3) inPos: vec4<f32>,
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
    var wldLoc:vec4<f32> = modelView * vec4<f32>(inPos+offset, 1.0);
    out.clip_position = projection * wldLoc;
    out.inPos = projection * wldLoc;
    return out;
}

@group(2) @binding(0)
var t_depth: texture_depth_2d;
@group(2) @binding(1)
var s_depth: sampler_comparison;

@fragment
fn fs_main(in: VertexOutput,  @builtin(front_facing) face: bool) -> @location(0) vec4<f32> {
    var uv:vec2<f32> = 0.5*(in.inPos.xy/in.inPos.w + vec2(1.0,1.0));
    var visibility:f32 = textureSampleCompare(
        t_depth, s_depth,
        vec2(uv.x, 1.0-uv.y),  in.clip_position.z - 0.0001
    );

    if (visibility < 0.5) {
        discard;
    }

    var lightDir:vec3<f32> = normalize(in.lightDir);
    var n:vec3<f32> = normalize(in.normal);

    var color:vec3<f32> = diffuseColor.rgb;

    if (!face) {
        n = normalize(-in.lightDir);
    }
    var viewDir: vec3<f32> = in.viewDir;

    var radiance:vec3<f32>  = ambientColor.rgb * ambientConstant + 
                    diffuse(-lightDir, n, color)* diffuseConstant +
                    specular(-lightDir, viewDir, n, specularColor.rgb, shininess) * specularConstant;
    return vec4<f32>(radiance * diffuseColor.w, diffuseColor.w);
}