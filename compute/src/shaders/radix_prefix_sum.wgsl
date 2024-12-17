@binding(0) @group(0) var<storage, read> input: array<u32>;
@binding(1) @group(0) var<storage, read_write> output: array<vec4<u32>>;
@binding(2) @group(0) var<storage, read_write> sums: array<u32>;

@binding(0) @group(1) var<uniform> radixMaskId: u32;

const bank_size: u32 = 32;
const n: u32 = 512;

var<workgroup> temp0: array<u32, 532>;
var<workgroup> temp1: array<u32, 532>;
var<workgroup> temp2: array<u32, 532>;
var<workgroup> temp3: array<u32, 532>;

fn bank_conflict_free_idx(idx: u32) -> u32 {
    var chunk_id: u32 = idx / bank_size;
    return idx + chunk_id;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>, @builtin(local_invocation_id) LocalInvocationId: vec3<u32>, @builtin(workgroup_id) WorkgroupID: vec3<u32>) {
    var thread_id: u32 = LocalInvocationId.x;
    var global_thread_id: u32 = GlobalInvocationID.x;
    var mask: u32 = u32(3) << (radixMaskId << 1);

    if (thread_id < (n>>1)) {
        var val:u32 = (input[2*global_thread_id] & mask) >> (radixMaskId << 1);

        if (val == 0) {
            temp0[bank_conflict_free_idx(2 * thread_id)] = 1;
        } else if (val == 1) {
            temp1[bank_conflict_free_idx(2 * thread_id)] = 1;
        } else if (val == 2) {
            temp2[bank_conflict_free_idx(2 * thread_id)] = 1;
        } else {
            temp3[bank_conflict_free_idx(2 * thread_id)] = 1;
        }

        val = (input[2*global_thread_id + 1] & mask) >> (radixMaskId << 1);

        if (val == 0) {
            temp0[bank_conflict_free_idx(2 * thread_id + 1)] = 1;
        } else if (val == 1) {
            temp1[bank_conflict_free_idx(2 * thread_id + 1)] = 1;
        } else if (val == 2) {
            temp2[bank_conflict_free_idx(2 * thread_id + 1)] = 1;
        } else if (val == 3) {
            temp3[bank_conflict_free_idx(2 * thread_id + 1)] = 1;
        }
    }

    workgroupBarrier();

    var offset: u32 = 1;

    for (var d:u32 = n >> 1; d > 0; d >>= 1) {
        if (thread_id < d) {
            var ai: u32 = offset * (2 * thread_id + 1) - 1;
            var bi: u32 = offset * (2 * thread_id + 2) - 1;
            temp0[bank_conflict_free_idx(bi)] += temp0[bank_conflict_free_idx(ai)];
            temp1[bank_conflict_free_idx(bi)] += temp1[bank_conflict_free_idx(ai)];
            temp2[bank_conflict_free_idx(bi)] += temp2[bank_conflict_free_idx(ai)];
            temp3[bank_conflict_free_idx(bi)] += temp3[bank_conflict_free_idx(ai)];
        }

        offset *= 2;

        workgroupBarrier();
    }

    if (thread_id == 0) {
        temp0[bank_conflict_free_idx(n - 1)] = 0;
        temp1[bank_conflict_free_idx(n - 1)] = 0;
        temp2[bank_conflict_free_idx(n - 1)] = 0;
        temp3[bank_conflict_free_idx(n - 1)] = 0;
    }
    workgroupBarrier();

    for (var d:u32 = 1; d < n; d *= 2) {
        offset >>= 1;
        if (thread_id < d) {
            var ai: u32 = offset * (2 * thread_id + 1) - 1;
            var bi: u32 = offset * (2 * thread_id + 2) - 1;
            var t:u32 = temp0[bank_conflict_free_idx(ai)];

            temp0[bank_conflict_free_idx(ai)] = temp0[bank_conflict_free_idx(bi)];
            temp0[bank_conflict_free_idx(bi)] += t;

            t = temp1[bank_conflict_free_idx(ai)];
            temp1[bank_conflict_free_idx(ai)] = temp1[bank_conflict_free_idx(bi)];
            temp1[bank_conflict_free_idx(bi)] += t;

            t = temp2[bank_conflict_free_idx(ai)];
            temp2[bank_conflict_free_idx(ai)] = temp2[bank_conflict_free_idx(bi)];
            temp2[bank_conflict_free_idx(bi)] += t;

            t = temp3[bank_conflict_free_idx(ai)];
            temp3[bank_conflict_free_idx(ai)] = temp3[bank_conflict_free_idx(bi)];
            temp3[bank_conflict_free_idx(bi)] += t;
        }
        workgroupBarrier();
    }

    if (thread_id == 0) {
        var sum0: u32 = temp0[bank_conflict_free_idx(2 * 255)];
        var sum1: u32 = temp1[bank_conflict_free_idx(2 * 255)];
        var sum2: u32 = temp2[bank_conflict_free_idx(2 * 255)];
        var sum3: u32 = temp3[bank_conflict_free_idx(2 * 255)];

        var last: u32 = (input[2 * ((WorkgroupID.x + 1) * 256 - 1)] & mask) >> (radixMaskId << 1);
        switch (last) {
            case 0: {sum0 += 1;}
            case 1: {sum1 += 1;}
            case 2: {sum2 += 1;}
            case 3: {sum3 += 1;}
            default: {}
        }

        last =  (input[2*((WorkgroupID.x+1) * 256 - 1)+1] & mask)  >> (radixMaskId << 1); 
        switch(last) {
            case 0: {sum0 += 1;}
            case 1: {sum1 += 1;}
            case 2: {sum2 += 1;}
            case 3: {sum3 += 1;}
            default: {}
        }

        sums[WorkgroupID.x * 4] = sum0;
        sums[WorkgroupID.x * 4 + 1] = sum1;
        sums[WorkgroupID.x * 4 + 2] = sum2;
        sums[WorkgroupID.x * 4 + 3] = sum3;
    }

    if (thread_id < (n>>1)) {
        output[2*global_thread_id].x = temp0[bank_conflict_free_idx(2*thread_id)];
        output[2*global_thread_id + 1].x = temp0[bank_conflict_free_idx(2*thread_id + 1)];
        
        output[2*global_thread_id].y = temp1[bank_conflict_free_idx(2*thread_id)];
        output[2*global_thread_id + 1].y = temp1[bank_conflict_free_idx(2*thread_id + 1)];

        output[2*global_thread_id].z = temp2[bank_conflict_free_idx(2*thread_id)];
        output[2*global_thread_id + 1].z = temp2[bank_conflict_free_idx(2*thread_id + 1)];

        output[2*global_thread_id].w = temp3[bank_conflict_free_idx(2*thread_id)];
        output[2*global_thread_id + 1].w = temp3[bank_conflict_free_idx(2*thread_id + 1)];
    }
}