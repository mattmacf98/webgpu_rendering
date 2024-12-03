struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

@vertex
fn vs_main(
    @location(0) inPos: vec3<f32>,
    @location(1) inTexCoords: vec2<f32>
) -> VertexOutput {
    var out: VertexOutput;
    out.clip_position = vec4<f32>(inPos, 1.0);
    out.tex_coords = inTexCoords;
    return out;
}

@group(0) @binding(0)
var t_diffuse: texture_2d<f32>;
@group(0) @binding(1)
var t_depth: texture_2d<f32>;
@group(0) @binding(2)
var s_diffuse: sampler;
@group(0) @binding(3)
var<uniform> offset: vec2<f32>;

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    var depth: vec4<f32> = textureSample(t_depth, s_diffuse, in.tex_coords);
    var color: vec4<f32> = textureSample(t_diffuse, s_diffuse, in.tex_coords - offset * depth.r);

    return color;
}