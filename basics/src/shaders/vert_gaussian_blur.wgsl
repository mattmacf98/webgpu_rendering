
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

@vertex
fn vs_main(
    @builtin(vertex_index) inVertIndex: u32,
    @location(0) inTexCoords: vec2<f32>
) -> VertexOutput {
    const pos = array<vec3<f32>, 4>(
        vec3<f32>(1.0, 1.0, 0.0),
        vec3<f32>(1.0, -1.0, 0.0),
        vec3<f32>(-1.0, 1.0, 0.0),
        vec3<f32>(-1.0, -1.0, 0.0)
    );

    var out: VertexOutput;
    out.position = vec4<f32>(pos[inVertIndex], 1.0);
    out.tex_coords = inTexCoords;
    return out;
}

@group(0) @binding(0)
var<uniform> img_size: vec2<f32>;
@group(0) @binding(1)
var t_diffuse: texture_2d<f32>;
@group(0) @binding(2)
var s_diffuse: sampler;
@group(0) @binding(3)
var<storage> kernel: array<f32>;
@group(0) @binding(4)
var<uniform> kernel_size: f32;
 
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    var color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var intensity: f32 = 0.0;

    for(var y: f32 = - kernel_size; y <= kernel_size; y+=1.0) {
        let offsettedY = y / img_size.y + in.tex_coords.y;
        if (offsettedY >= 0.0 && offsettedY <= 1.0 ) {
            let indexY = u32(y + kernel_size);
            let tex_coord = vec2(in.tex_coords.x, offsettedY);
            let gasussian_val = kernel[indexY];
            let c = textureSampleLevel(t_diffuse, s_diffuse, tex_coord,0);
            color += c * gasussian_val;
            intensity += gasussian_val;
        }
    }
      
    color /= intensity;
    color.w = 1.0;

    return color;
}