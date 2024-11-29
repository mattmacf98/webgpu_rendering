@group(0) @binding(0)
var<uniform> transform: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> projection: mat4x4<f32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

@vertex
fn vs_main(
    @location(0) inPos: vec3<f32>,
    @location(1) inTexCoords: vec2<f32>
) -> VertexOutput {
    var out: VertexOutput;
    out.position = projection * transform * vec4<f32>(inPos, 1.0);
    out.tex_coords = inTexCoords;
    return out;
}

@group(0) @binding(2)
var<uniform> img_size: vec2<f32>;
@group(0) @binding(3)
var t_diffuse: texture_2d<f32>;
@group(0) @binding(4)
var s_diffuse: sampler;
@group(0) @binding(5)
var<storage> kernel: array<f32>;
@group(0) @binding(6)
var<uniform> kernel_size: f32;
 
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    var color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var intensity: f32 = 0.0;

    for(var x: f32 = - kernel_size; x <= kernel_size; x+=1.0) {
        let offsettedX = x / img_size.y + in.tex_coords.x;
        if (offsettedX >= 0.0 && offsettedX <= 1.0 ) {
            let indexX = u32(x + kernel_size);
            let tex_coord = vec2(offsettedX, in.tex_coords.y);
            let gasussian_val = kernel[indexX];
            let c = textureSampleLevel(t_diffuse, s_diffuse, tex_coord,0);
            color += c * gasussian_val;
            intensity += gasussian_val;
        }
    }
      
    color /= intensity;
    color.w = 1.0;

    return color;
}