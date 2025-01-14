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
var<uniform> ambientColor:vec4<f32>;// = vec4<f32>(0.15, 0.10, 0.10, 1.0);
@group(0) @binding(6)
var<uniform> diffuseColor:vec4<f32>;// = vec4<f32>(0.55, 0.55, 0.55, 1.0);
@group(0) @binding(7)
var<uniform> specularColor:vec4<f32>;// = vec4<f32>(1.0, 1.0, 1.0, 1.0);

@group(0) @binding(8)
var<uniform> shininess:f32;// = 20.0;

@group(1) @binding(0)
var<uniform> boneTransforms: array<mat4x4<f32>, 16>;

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
    @location(1) inNormal: vec3<f32>,
    @location(2) boneWeight0: vec4<f32>,
    @location(3) boneWeight1: vec4<f32>,
    @location(4) boneWeight2: vec4<f32>,
    @location(5) boneWeight3: vec4<f32>,
) -> VertexOutput {
    var out: VertexOutput;
    var totalTransform:mat4x4<f32> = mat4x4<f32>(
        0.0,0.0,0.0,0.0,
        0.0,0.0,0.0,0.0,
        0.0,0.0,0.0,0.0,
        0.0,0.0,0.0,0.0
    );

    totalTransform += boneTransforms[0]  * boneWeight0[0];
    totalTransform += boneTransforms[1] * boneWeight0[1];
    totalTransform += boneTransforms[2]* boneWeight0[2];
    totalTransform += boneTransforms[3] * boneWeight0[3];
    totalTransform += boneTransforms[4] * boneWeight1[0];
    totalTransform += boneTransforms[5] * boneWeight1[1];
    totalTransform += boneTransforms[6] * boneWeight1[2];
    totalTransform += boneTransforms[7] * boneWeight1[3];
    totalTransform += boneTransforms[8] * boneWeight2[0];
    totalTransform += boneTransforms[9] * boneWeight2[1];
    totalTransform += boneTransforms[10]* boneWeight2[2];
    totalTransform += boneTransforms[11] * boneWeight2[3];
    totalTransform += boneTransforms[12] * boneWeight3[0];

    out.viewDir = normalize((normalMatrix * vec4<f32>(-viewDirection, 0.0)).xyz);
    out.lightDir = normalize((normalMatrix * vec4<f32>(-lightDirection, 0.0)).xyz);
    out.normal = normalize(normalMatrix * totalTransform * vec4<f32>(inNormal, 0.0)).xyz;  
    
    var wldLoc:vec4<f32> = modelView *totalTransform *vec4(inPos,1.0);
    out.clip_position = projection * wldLoc;
    out.wldLoc = wldLoc.xyz / wldLoc.w;
    out.inPos = (totalTransform *vec4(inPos,1.0)).xyz;
    var lightLoc:vec4<f32> = modelView * vec4<f32>(lightDirection, 1.0);
    out.lightLoc = lightLoc.xyz / lightLoc.w;

    return out;
}

@fragment
fn fs_main(in: VertexOutput, @builtin(front_facing) face: bool) -> @location(0) vec4<f32> {
    var lightLoc:vec3<f32> = in.lightLoc;
    var lightDir:vec3<f32> = normalize(in.lightDir);
    var n:vec3<f32> = normalize(in.normal);
    var viewDir: vec3<f32> = in.viewDir;

    if (face) {
        var wldLoc2light:vec3<f32> =  in.wldLoc-lightLoc;
        var align:f32 = dot( normalize(wldLoc2light),lightDir);

        if (align > 0.9) {
            var radiance:vec3<f32>  = ambientColor.rgb * ambientConstant + 
                diffuse(-lightDir, n, diffuseColor.rgb)* diffuseConstant +
                specular(-lightDir, viewDir, n, specularColor.rgb, shininess) * specularConstant;
            return vec4<f32>(radiance ,1.0);
        }
    }

    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
}