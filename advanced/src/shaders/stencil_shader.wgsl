@group(0) @binding(0)
var<uniform> modelView: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> projection: mat4x4<f32>;

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>
}

@vertex
fn vs_main(
    @location(0) inPos: vec3<f32>
) -> VertexOutput {
    var out: VertexOutput;
    var world_loc:vec4<f32> = modelView * vec4<f32>(inPos, 1.0);
    out.clip_position = projection * world_loc;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
}