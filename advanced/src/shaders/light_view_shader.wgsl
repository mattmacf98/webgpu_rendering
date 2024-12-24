@group(0) @binding(0)
var<uniform> modelView: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> projection: mat4x4<f32>;

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) depth: f32
}

@vertex
fn vs_main(@location(0) inPos: vec3<f32>) -> VertexOutput {
    var out: VertexOutput;
    var wldLoc:vec4<f32> = modelView * vec4<f32>(inPos, 1.0);
    out.clip_position = projection * wldLoc;
    out.depth = out.clip_position.z / out.clip_position.w;
    return out;
} 

struct FragOutputs {
    @builtin(frag_depth) depth: f32,
    @location(0) color: vec4<f32>
}

@fragment
fn fs_main(in: VertexOutput, @builtin(front_facing) isFront: bool) -> FragOutputs {
    var out: FragOutputs;
    if (isFront) {
        out.depth = in.depth;
    } else {
        out.depth = in.depth - 0.001;
    }
    out.color = vec4<f32>(0.0, 1.0, 0.0, 1.0);
    return out;
}