import { createGPUBuffer, img2Texture } from "./Utils";

export class Skybox {
    private _pipeline: GPURenderPipeline;
    private _positionsBuffer: GPUBuffer;
    private _uniformBindGroup: GPUBindGroup;

    public static async init(device: GPUDevice, modelViewMatrixUnifromBuffer: GPUBuffer, projectionMatrixUniformBuffer: GPUBuffer, shaderCode: string) {
        const shaderModule: GPUShaderModule = device.createShaderModule({code: shaderCode});
        const positions = new Float32Array([
            100.0, -100.0, 50.0, -100.0, -100.0, 50.0, -100.0, 100.0, 50.0,
            -100.0, 100.0, 50.0, 100.0, 100.0, 50.0, 100.0, -100.0, 50.0,

            -100.0, 100.0, -50.0, -100.0, -100.0, -50.0, 100.0, -100.0, -50.0,
            100.0, -100.0, -50.0, 100.0, 100.0, -50.0, -100.0, 100.0, -50.0,


            -100.0, 50.0, -100.0, 100.0, 50.0, -100.0, -100.0, 50.0, 100.0,
            100.0, 50.0, 100.0, -100.0, 50.0, 100.0, 100.0, 50.0, -100.0,

            -100.0, -50.0, -100.0, -100.0, -50.0, 100.0, 100.0, -50.0, -100.0,
            100.0, -50.0, 100.0, 100.0, -50.0, -100.0, -100.0, -50.0, 100.0,


            50.0, 100.0, -100.0, 50.0, -100.0, -100.0, 50.0, -100.0, 100.0,
            50.0, -100.0, 100.0, 50.0, 100.0, 100.0, 50.0, 100.0, -100.0,

            -50.0, -100.0, 100.0, -50.0, -100.0, -100.0, -50.0, 100.0, -100.0,
            -50.0, 100.0, -100.0, -50.0, 100.0, 100.0, -50.0, -100.0, 100.0,
        ]);
        const positionsBuffer = createGPUBuffer(device, positions, GPUBufferUsage.VERTEX);

        const sampler = device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear'
        });

        const texture = await img2Texture(device, "./data/parking_lot.jpg"); //TODO resolving right??

        const uniformBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                }
            ]
        });

        const uniformBindGroup = device.createBindGroup({
            layout: uniformBindGroupLayout,
            entries: [
                {
                    binding:0,
                    resource: {
                        buffer: modelViewMatrixUnifromBuffer
                    }
                },
                {
                    binding:1,
                    resource: {
                        buffer: projectionMatrixUniformBuffer
                    }
                },
                {
                    binding:2,
                    resource: texture.createView()
                },
                {
                    binding: 3,
                    resource: sampler
                }
            ]
        });

        const positonAttribDesc: GPUVertexAttribute = {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3'
        }
        const positionBufferLayoutDesc: GPUVertexBufferLayout = {
            attributes: [positonAttribDesc],
            arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
            stepMode: 'vertex'
        };

        const piplineLayout: GPUPipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [uniformBindGroupLayout]
        });
        const pipelineDesc: GPURenderPipelineDescriptor = {
            layout: piplineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [positionBufferLayoutDesc]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{format: 'bgra8unorm'}]
            },
            primitive: {
                topology: 'triangle-list',
                frontFace: 'ccw',
                cullMode: 'back'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth32float'
            }
        };
        const pipeline = device.createRenderPipeline(pipelineDesc);
        return new Skybox(pipeline, positionsBuffer, uniformBindGroup);
    }

    public encodeRenderPass(renderPassEncoder: GPURenderPassEncoder) {
        renderPassEncoder.setPipeline(this._pipeline);
        renderPassEncoder.setBindGroup(0, this._uniformBindGroup);
        renderPassEncoder.setVertexBuffer(0, this._positionsBuffer);
        renderPassEncoder.draw(36, 1);
    }

    private constructor(pipeline: GPURenderPipeline,  positionsBuffer: GPUBuffer, uniformBindGroup: GPUBindGroup) {
       this._pipeline = pipeline;
       this._positionsBuffer = positionsBuffer;
       this._uniformBindGroup = uniformBindGroup;
   }
}