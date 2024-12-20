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
var<uniform> ambientColor:vec4<f32>;
@group(0) @binding(6)
var<uniform> diffuseColor:vec4<f32>;
@group(0) @binding(7)
var<uniform> specularColor:vec4<f32>;

@group(0) @binding(8)
var<uniform> shininess:f32;

@group(0) @binding(9)
var<uniform> offset:vec3<f32>;
    
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
    var wldLoc:vec4<f32> = modelView * vec4<f32>(inPos + offset, 1.0);
    out.clip_position = projection * wldLoc;

    return out;
}

@fragment
fn fs_main(in: VertexOutput,   @builtin(front_facing) face: bool) -> @location(0) vec4<f32> {
    var lightDir:vec3<f32> = normalize(in.lightDir);
    var n:vec3<f32> = normalize(in.normal);
    var viewDir: vec3<f32> = in.viewDir;

    if (face) {
        var radiance:vec3<f32>  = ambientColor.rgb * ambientConstant + 
            diffuse(-lightDir, n, diffuseColor.rgb)* diffuseConstant +
            specular(-lightDir, viewDir, n, specularColor.rgb, shininess) * specularConstant;

        return vec4<f32>(radiance,1.0);       
    } 
    return vec4<f32>( 0.0,0.0,0.0,1.0);
}