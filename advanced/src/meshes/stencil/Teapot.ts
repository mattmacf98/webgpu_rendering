import { ObjDataExtractor } from "../ObjDataExctractor";
import { createGPUBuffer } from "../Utils";

export class Teapot {
    private _pipeline: GPURenderPipeline;
    private _positionBuffer: GPUBuffer;
    private _normalBuffer: GPUBuffer;
    private _uniformBindGroup: GPUBindGroup;
    private _indexBuffer?: GPUBuffer;
    private _indexSize?: number;

    public static async init(device: GPUDevice, modelViewMatrixUniformBuffer: GPUBuffer, 
        projectionMatrixUnifromBuffer: GPUBuffer, normalMatrixUniformBuffer: GPUBuffer,
        viewDirectionUniformBuffer: GPUBuffer, lightDirectionUniformBuffer: GPUBuffer, shaderCode: string): Promise<Teapot> {
        const shaderModule = device.createShaderModule({ code: shaderCode });

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
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                }
            ]
        });

        const ambientUniformBuffer = createGPUBuffer(device, new Float32Array([0.15, 0.10, 0.10, 1.0]), GPUBufferUsage.UNIFORM);
        const diffuseUniformBuffer = createGPUBuffer(device, new Float32Array([0.55, 0.55, 0.55, 1.0]), GPUBufferUsage.UNIFORM);
        const specularUniformBuffer = createGPUBuffer(device, new Float32Array([1.0, 1.0, 1.0, 1.0]), GPUBufferUsage.UNIFORM);
        const shininessUniformBuffer = createGPUBuffer(device, new Float32Array([20.0]), GPUBufferUsage.UNIFORM);
        const offsetUniformBuffer = createGPUBuffer(device, new Float32Array([-10.0, 0.0, 0.0]), GPUBufferUsage.UNIFORM);

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
                    resource: {
                        buffer: offsetUniformBuffer
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
                format: 'depth24plus-stencil8',
                stencilFront: {
                    compare: "less",
                    passOp: "keep",
                },
                stencilBack: {
                    compare: "less",
                    passOp: "keep",
                }
            }
        };
        const pipeline = device.createRenderPipeline(pipelineDesc);

        return new Teapot(pipeline, positionBuffer, normalBuffer, uniformBindGroup, indexBuffer, indexSize);
    }

    public encodeRenderPass(renderPassEncoder: GPURenderPassEncoder) {
        renderPassEncoder.setPipeline(this._pipeline);
        renderPassEncoder.setVertexBuffer(0, this._positionBuffer);
        renderPassEncoder.setVertexBuffer(1, this._normalBuffer);
        renderPassEncoder.setBindGroup(0, this._uniformBindGroup);
        renderPassEncoder.setIndexBuffer(this._indexBuffer!, 'uint16');
        renderPassEncoder.drawIndexed(this._indexSize!);
    }

    private constructor(pipeline: GPURenderPipeline, positionBuffer: GPUBuffer, normalBuffer: GPUBuffer, uniformBindGroup: GPUBindGroup, indexBuffer: GPUBuffer, indexSize: number) {
        this._pipeline = pipeline;
        this._positionBuffer = positionBuffer;
        this._normalBuffer = normalBuffer;
        this._uniformBindGroup = uniformBindGroup;
        this._indexBuffer = indexBuffer;
        this._indexSize = indexSize;
    }
}