import { createGPUBuffer } from "../Utils";

export class Final {
    private _uniformBindGroupLayout: GPUBindGroupLayout;
    private _sampler: GPUSampler;
    private _positionBuffer: GPUBuffer;
    private _pipeline: GPURenderPipeline;
    private _uniformBindGroup?: GPUBindGroup;

    public static async init(device: GPUDevice, shaderCode: string): Promise<Final> {
        const shaderModule: GPUShaderModule = device.createShaderModule({ code: shaderCode });

        const sampler: GPUSampler = device.createSampler({
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear'
        });

        const uniformBindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                }
            ]
        });

        const positions: Float32Array = new Float32Array([
            -1, -1, 0, 1,
            1, -1, 1, 1,
            -1, 1, 0, 0,
            1, 1, 1, 0
        ]);

        const positionBuffer: GPUBuffer = createGPUBuffer(device, positions, GPUBufferUsage.VERTEX);

        const positionAttribDesc: GPUVertexAttribute = {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x4'
        };

        const positionBufferLayoutDesc: GPUVertexBufferLayout = {
            attributes: [positionAttribDesc],
            arrayStride: Float32Array.BYTES_PER_ELEMENT * 4,
            stepMode: 'vertex'
        };

        const layout: GPUPipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [uniformBindGroupLayout]
        });

        const colorState: GPUColorTargetState = {
            format: 'bgra8unorm',
            blend: {
                alpha: {
                    operation: "add",
                    srcFactor: 'one',
                    dstFactor: 'one-minus-src-alpha',
                },
                color: {
                    operation: "add",
                    srcFactor: 'one',
                    dstFactor: 'one-minus-src-alpha',
                }
            }
        };

        const pipelineDesc: GPURenderPipelineDescriptor = {
            layout: layout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [positionBufferLayoutDesc]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [colorState]
            },
            primitive: {
                topology: 'triangle-strip',
                frontFace: 'ccw',
                cullMode: 'none'
            }
        }

        const pipeline = device.createRenderPipeline(pipelineDesc);

        return new Final(uniformBindGroupLayout, sampler, positionBuffer, pipeline);
    }

    public updateTexture(device: GPUDevice, dstTexture: GPUTexture) {
        this._uniformBindGroup = device.createBindGroup({
            layout: this._uniformBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: dstTexture.createView()
                },
                {
                    binding: 1,
                    resource: this._sampler
                }
            ]
        })
    }

    public encodeRenderPass(renderPassEncoder: GPURenderPassEncoder) {
        renderPassEncoder.setPipeline(this._pipeline);
        renderPassEncoder.setBindGroup(0, this._uniformBindGroup);
        renderPassEncoder.setVertexBuffer(0, this._positionBuffer);
        renderPassEncoder.draw(4, 1);
    }

    constructor(uniformBindGroupLayout: GPUBindGroupLayout, sampler: GPUSampler, positionBuffer: GPUBuffer, pipeline: GPURenderPipeline) {
        this._sampler = sampler;
        this._uniformBindGroupLayout = uniformBindGroupLayout;
        this._positionBuffer = positionBuffer;
        this._pipeline = pipeline;
    }
}