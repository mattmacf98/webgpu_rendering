@group(0) @binding(0)
var<uniform> modelView: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> projection: mat4x4<f32>;
@group(0) @binding(2)
var<uniform> normalMatrix: mat4x4<f32>;
@group(0) @binding(3)
var<uniform> screenDim: vec2<f32>;

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>
}

@vertex
fn vs_main(@location(0) inPos: vec3<f32>, @location(1) inNormal: vec3<f32>) -> VertexOutput {
    var out: VertexOutput;
    out.clip_position = projection * modelView * vec4<f32>(inPos, 1.0);
    var clip_normal:vec4<f32> = projection * normalMatrix * vec4<f32>(inNormal, 0.0);
    
    out.clip_position = vec4<f32>(out.clip_position.xy + normalize(clip_normal.xy) * 6.4 / screenDim * out.clip_position.w, out.clip_position.zw);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
}