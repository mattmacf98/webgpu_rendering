@group(0) @binding(0)
var<uniform> modelView: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> projection: mat4x4<f32>;

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) worldPos: vec3<f32>
}

@vertex
fn vs_main(@location(0) inPos: vec3<f32>) -> VertexOutput {
    var out: VertexOutput;
    out.worldPos = inPos;
    var worldLoc:vec4<f32> = modelView * vec4<f32>(inPos, 1.0);
    out.clip_position = projection * worldLoc;
    return out;
}

const pi:f32 = 3.141592654;
@group(0) @binding(2)
var t_diffuse: texture_2d<f32>;
@group(0) @binding(3)
var s_diffuse: sampler;

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    var n:vec3<f32> = normalize(in.worldPos);

    var len:f32 = sqrt(n.x*n.x + n.y*n.y);

    var s:f32 = acos(n.x/len);
    if (n.y < 0) {
        s = 2.0 * pi - s;
    }

    s = s / (2.0 * pi);
    var tex_coord:vec2<f32> = vec2(s, ((asin(n.z) * -2.0/pi) + 1.0) * 0.5);
    return textureSampleLevel(t_diffuse, s_diffuse, tex_coord, 0);
}