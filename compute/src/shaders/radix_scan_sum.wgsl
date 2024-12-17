@binding(0) @group(0) var<storage, read> input: array<u32>;
@binding(1) @group(0) var<storage, read_write> output: array<u32>;
@binding(2) @group(0) var<uniform> n: u32;

const bank_size: u32 = 32;
var<workgroup> temp: array<vec4<u32>, 532>;

fn bank_conflict_free_idx(idx: u32) -> u32 {
    var chunk_id: u32 = idx / bank_size;
    return idx + chunk_id;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>, @builtin(local_invocation_id) LocalInvocationId: vec3<u32>, @builtin(workgroup_id) WorkgroupID: vec3<u32>) { 
    var thread_id: u32 = LocalInvocationId.x;
    var global_thread_id: u32 = GlobalInvocationID.x;

    if (thread_id < (n>>1)) {
        temp[bank_conflict_free_idx(2*thread_id)] = vec4<u32>(input[2*global_thread_id*4], input[2*global_thread_id*4 + 1], input[2*global_thread_id*4 + 2], input[2*global_thread_id*4 + 3]);
        temp[bank_conflict_free_idx(2*thread_id + 1)] = vec4<u32>(input[2*global_thread_id*4 + 4], input[2*global_thread_id*4 + 5], input[2*global_thread_id*4 + 6], input[2*global_thread_id*4 + 7]);
    }

    workgroupBarrier();
    var offset: u32 = 1;

    for (var d: u32 = n >> 1; d > 0; d >>= 1) {
        if (thread_id < d) {
            var ai: u32 = offset * (2 * thread_id + 1) - 1;
            var bi: u32 = offset * (2 * thread_id + 2) - 1;
            temp[bank_conflict_free_idx(bi)] += temp[bank_conflict_free_idx(ai)];
        }
        offset *= 2;

        workgroupBarrier();
    }

    if (thread_id == 0) {
        temp[bank_conflict_free_idx(n - 1)] = vec4<u32>(0, 0, 0, 0);
    }

    workgroupBarrier();

    for (var d: u32 = 1; d < n; d *= 2) {
        offset >>= 1;
        if (thread_id < d) {
            var ai: u32 = offset * (2 * thread_id + 1) - 1;
            var bi: u32 = offset * (2 * thread_id + 2) - 1;
            var t: vec4<u32> = temp[bank_conflict_free_idx(ai)];
            temp[bank_conflict_free_idx(ai)] = temp[bank_conflict_free_idx(bi)];
            temp[bank_conflict_free_idx(bi)] += t;
        }
        workgroupBarrier();
    }

    if (thread_id < (n>>1)) {
        output[2*global_thread_id*4] = temp[bank_conflict_free_idx(2*thread_id)].x + input[2*global_thread_id*4];
        output[2*global_thread_id*4 + 1] = temp[bank_conflict_free_idx(2*thread_id)].y + input[2*global_thread_id*4 + 1];
        output[2*global_thread_id*4 + 2] = temp[bank_conflict_free_idx(2*thread_id)].z + input[2*global_thread_id*4 + 2];
        output[2*global_thread_id*4 + 3] = temp[bank_conflict_free_idx(2*thread_id)].w + input[2*global_thread_id*4 + 3];

        output[2*global_thread_id*4 + 4] = temp[bank_conflict_free_idx(2*thread_id + 1)].x + input[2*global_thread_id*4 + 4];
        output[2*global_thread_id*4 + 5] = temp[bank_conflict_free_idx(2*thread_id + 1)].y + input[2*global_thread_id*4 + 5];
        output[2*global_thread_id*4 + 6] = temp[bank_conflict_free_idx(2*thread_id + 1)].z + input[2*global_thread_id*4 + 6];
        output[2*global_thread_id*4 + 7] = temp[bank_conflict_free_idx(2*thread_id + 1)].w + input[2*global_thread_id*4 + 7];
    }
}