struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
}

@group(0) @binding(0)
var<uniform> offset: vec3<f32>;

@vertex
fn vs_main(@location(0) inPos: vec3<f32>, @location(1) inColor: vec3<f32>) -> VertexOutput {
    var out: VertexOutput;
    out.position = vec4<f32>(inPos + offset, 1.0);
    out.color = inColor;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    return vec4<f32>(in.color, 1.0);
}
