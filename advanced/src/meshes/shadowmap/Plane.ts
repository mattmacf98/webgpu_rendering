import { createGPUBuffer } from "../Utils";

export class Plane {
    private _pipeline: GPURenderPipeline;
    private _positionBuffer: GPUBuffer;
    private _normalBuffer: GPUBuffer;
    private _uniformBindGroup: GPUBindGroup;

    public static async init(device: GPUDevice, modelViewMatrixUniformBuffer: GPUBuffer, 
        projectionMatrixUnifromBuffer: GPUBuffer, normalMatrixUniformBuffer: GPUBuffer,
        viewDirectionUniformBuffer: GPUBuffer, lightDirectionUniformBuffer: GPUBuffer,
        depthTexture: GPUTexture, sampler: GPUSampler, lightModelViewMatrixUniformBuffer: GPUBuffer, 
        lightProjectionMatrixUniformBuffer: GPUBuffer, shaderCode: string): Promise<Plane> {
        const shaderModule = device.createShaderModule({ code: shaderCode });

        const positions = new Float32Array([
            -100, -100, 0,
            100, -100, 0,
            -100, 100, 0,
            100, 100, 0
        ]);

        const normals = new Float32Array([
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1
        ]);

        const positionBuffer = createGPUBuffer(device, positions, GPUBufferUsage.VERTEX);
        const normalBuffer = createGPUBuffer(device, normals, GPUBufferUsage.VERTEX);

        const unifromBindGroupLayout = device.createBindGroupLayout({
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
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 8,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 9,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "depth"
                    }
                },
                {
                    binding: 10,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: "comparison"
                    }
                },
                {
                    binding: 11,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 12,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                }
            ]
        });

        const ambientUniformBuffer = createGPUBuffer(device, new Float32Array([0.15, 0.10, 0.10, 1.0]), GPUBufferUsage.UNIFORM);
        const diffuseUniformBuffer = createGPUBuffer(device, new Float32Array([0.55, 0.55, 0.55, 1.0]), GPUBufferUsage.UNIFORM);
        const specularUniformBuffer = createGPUBuffer(device, new Float32Array([0.0, 0.0, 0.0, 1.0]), GPUBufferUsage.UNIFORM);
        const shininessUniformBuffer = createGPUBuffer(device, new Float32Array([0.0]), GPUBufferUsage.UNIFORM);
    
        const uniformBindGroup = device.createBindGroup({
            layout: unifromBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: modelViewMatrixUniformBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: projectionMatrixUnifromBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: normalMatrixUniformBuffer
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: lightDirectionUniformBuffer
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: viewDirectionUniformBuffer
                    }
                },
                {
                    binding: 5,
                    resource: {
                        buffer: ambientUniformBuffer
                    }
                },
                {
                    binding: 6,
                    resource: {
                        buffer: diffuseUniformBuffer
                    }
                },
                {
                    binding: 7,
                    resource: {
                        buffer: specularUniformBuffer
                    }
                },
                {
                    binding: 8,
                    resource: {
                        buffer: shininessUniformBuffer
                    }
                },
                {
                    binding: 9,
                    resource: depthTexture.createView()
                },
                {
                    binding: 10,
                    resource: sampler
                },
                {
                    binding: 11,
                    resource: {
                        buffer: lightModelViewMatrixUniformBuffer
                    }
                },
                {
                    binding: 12,
                    resource: {
                        buffer: lightProjectionMatrixUniformBuffer
                    }
                }
            ]
        });

        const positionAttribDesc: GPUVertexAttribute = {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3'
        }
        const positionBufferLayout: GPUVertexBufferLayout = {
            attributes: [positionAttribDesc],
            arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
            stepMode: 'vertex'
        }

        const normalAttribDesc: GPUVertexAttribute = {
            shaderLocation: 1,
            offset: 0,
            format: 'float32x3'
        }
        const normalBufferLayout: GPUVertexBufferLayout = {
            attributes: [normalAttribDesc],
            arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
            stepMode: 'vertex'
        }

        const pipelineLayoutDesc: GPUPipelineLayoutDescriptor = { bindGroupLayouts: [unifromBindGroupLayout] };
        const pipelineLayout = device.createPipelineLayout(pipelineLayoutDesc);

        const colorState: GPUColorTargetState = {
            format: 'bgra8unorm'
        }
        const pipelineDesc: GPURenderPipelineDescriptor = {
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [positionBufferLayout, normalBufferLayout]
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
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth32float'
            }
        }

        const pipeline = device.createRenderPipeline(pipelineDesc);

        return new Plane(pipeline, positionBuffer, normalBuffer, uniformBindGroup);
    }

    private constructor(pipeline: GPURenderPipeline, positionBuffer: GPUBuffer, normalBuffer: GPUBuffer, uniformBindGroup: GPUBindGroup) {
        this._pipeline = pipeline;
        this._positionBuffer = positionBuffer;
        this._normalBuffer = normalBuffer;
        this._uniformBindGroup = uniformBindGroup;
    }

    public encodeRenderPass(renderPassEncoder: GPURenderPassEncoder) { 
        renderPassEncoder.setPipeline(this._pipeline);
        renderPassEncoder.setBindGroup(0, this._uniformBindGroup);
        renderPassEncoder.setVertexBuffer(0, this._positionBuffer);
        renderPassEncoder.setVertexBuffer(1, this._normalBuffer);
        renderPassEncoder.draw(4, 1);
    }
}