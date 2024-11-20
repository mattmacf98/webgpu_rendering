@group(0) @binding(0)
var<uniform> transform: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> projection: mat4x4<f32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>
};

@vertex
fn vs_main(
    @location(0) inPos: vec3<f32>
) -> VertexOutput {
    var out: VertexOutput;
    out.position = projection * transform * vec4<f32>(inPos, 1.0);
    return out;
}

// Fragment shader
@fragment
fn fs_main(in: VertexOutput,  @builtin(front_facing) face: bool) -> @location(0) vec4<f32> {
    if (face) {
        return vec4<f32>(0.0, 0.0, 1.0 ,1.0);
    }
    else {
        return vec4<f32>(0.0, 1.0, 0.0 ,1.0);
    }
}