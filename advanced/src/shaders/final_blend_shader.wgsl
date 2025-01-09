struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>
};

@vertex
fn vs_main(
    @location(0) inPos: vec4<f32>
) -> VertexOutput {
    var out: VertexOutput;
    out.clip_position = vec4<f32>(inPos.xy, 0.0, 1.0);
    out.tex_coords = inPos.zw;
    return out;
}

// Fragment shader
@group(0) @binding(0)
var t_composed: texture_2d<f32>;
@group(0) @binding(1 )
var s_composed: sampler;

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    return textureSample(t_composed, s_composed, in.tex_coords);
}