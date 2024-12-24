import { ObjDataExtractor } from "../ObjDataExctractor";
import { createGPUBuffer } from "../Utils";

export class Teapot {
    private _pipeline: GPURenderPipeline;
    private _lightPipeline: GPURenderPipeline;
    private _positionBuffer: GPUBuffer;
    private _normalBuffer: GPUBuffer;
    private _uniformBindGroup: GPUBindGroup;
    private _uniformBindGroupLight: GPUBindGroup;
    private _indexBuffer?: GPUBuffer;
    private _indexSize?: number;

    public static async init(device: GPUDevice, modelViewMatrixUniformBuffer: GPUBuffer, 
        projectionMatrixUnifromBuffer: GPUBuffer, normalMatrixUniformBuffer: GPUBuffer,
        viewDirectionUniformBuffer: GPUBuffer, lightDirectionUniformBuffer: GPUBuffer,
        depthTexture: GPUTexture, sampler: GPUSampler, lightModelViewMatrixUniformBuffer: GPUBuffer, 
        lightProjectionMatrixUniformBuffer: GPUBuffer, shaderCode: string, lightViewShaderCode: string): Promise<Teapot> {
        const shaderModule = device.createShaderModule({ code: shaderCode });
        const shaderModuleLight = device.createShaderModule({code: lightViewShaderCode});

        const objResponse = await fetch("./objs/teapot.obj");
        const objBlob = await objResponse.blob();
        const objText = await objBlob.text();
        const objDataExtractor = new ObjDataExtractor(objText);

        const positions = objDataExtractor.vertexPositions;
        const positionBuffer = createGPUBuffer(device, positions, GPUBufferUsage.VERTEX);
        const normals = objDataExtractor.normals;
        const normalBuffer = createGPUBuffer(device, normals, GPUBufferUsage.VERTEX);
        const indices = objDataExtractor.indices;
        const indexBuffer = createGPUBuffer(device, indices, GPUBufferUsage.INDEX);
        const indexSize = indices.length;

        const unifromBindGroupLayoutLight = device.createBindGroupLayout({
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
                }
            ]
        });

        

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
        const specularUniformBuffer = createGPUBuffer(device, new Float32Array([1.0, 1.0, 1.0, 1.0]), GPUBufferUsage.UNIFORM);
        const shininessUniformBuffer = createGPUBuffer(device, new Float32Array([20.0]), GPUBufferUsage.UNIFORM);

        const uniformBindGroupLight = device.createBindGroup({
            layout: unifromBindGroupLayoutLight,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: lightModelViewMatrixUniformBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: lightProjectionMatrixUniformBuffer
                    }
                }
            ]
        });

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
        };
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
                topology: 'triangle-list',
                frontFace: 'ccw',
                cullMode: 'none'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth32float'
            }
        };
        const pipeline = device.createRenderPipeline(pipelineDesc);

        const lightPipelineLayoutDesc: GPURenderPipelineDescriptor = {
            layout: device.createPipelineLayout({bindGroupLayouts: [unifromBindGroupLayoutLight]}),
            vertex: {
                module: shaderModuleLight,
                entryPoint: "vs_main",
                buffers: [positionBufferLayout]
            },
            fragment: {
                module: shaderModuleLight,
                entryPoint: "fs_main",
                targets: [colorState]
            },
            primitive: {
                topology: "triangle-list",
                frontFace: "ccw",
                cullMode: "none"
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth32float'
            }
        }

        const lightPipeline = device.createRenderPipeline(lightPipelineLayoutDesc);

        return new Teapot(pipeline, lightPipeline, positionBuffer, normalBuffer, uniformBindGroup, uniformBindGroupLight, indexBuffer, indexSize);
    }

    public encodeRenderPass(renderPassEncoder: GPURenderPassEncoder) {
        renderPassEncoder.setPipeline(this._pipeline);
        renderPassEncoder.setVertexBuffer(0, this._positionBuffer);
        renderPassEncoder.setVertexBuffer(1, this._normalBuffer);
        renderPassEncoder.setBindGroup(0, this._uniformBindGroup);
        renderPassEncoder.setIndexBuffer(this._indexBuffer!, 'uint16');
        renderPassEncoder.drawIndexed(this._indexSize!);
    }

    public encodeLightRenderPass(renderPassEncoder: GPURenderPassEncoder) {
        renderPassEncoder.setPipeline(this._lightPipeline);
        renderPassEncoder.setBindGroup(0, this._uniformBindGroupLight);
        renderPassEncoder.setVertexBuffer(0, this._positionBuffer);
        renderPassEncoder.setIndexBuffer(this._indexBuffer!, 'uint16');
        renderPassEncoder.drawIndexed(this._indexSize!)
    }

    private constructor(pipeline: GPURenderPipeline, lightPipeline: GPURenderPipeline, positionBuffer: GPUBuffer, normalBuffer: GPUBuffer,
         uniformBindGroup: GPUBindGroup, uniformBindGroupLight: GPUBindGroup, indexBuffer: GPUBuffer, indexSize: number) {
        this._pipeline = pipeline;
        this._lightPipeline = lightPipeline;
        this._positionBuffer = positionBuffer;
        this._normalBuffer = normalBuffer;
        this._uniformBindGroup = uniformBindGroup;
        this._uniformBindGroupLight = uniformBindGroupLight;
        this._indexBuffer = indexBuffer;
        this._indexSize = indexSize;
    }
}