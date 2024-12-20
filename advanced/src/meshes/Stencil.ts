import stencilWgsl from "../shaders/stencil_shader.wgsl?raw";
import { ObjDataExtractor } from "./ObjDataExctractor";
import { createGPUBuffer } from "./Utils";

export class Stencil {
    private _pipeline: GPURenderPipeline;
    private _positionBuffer: GPUBuffer;
    private _uniformBindGroup: GPUBindGroup;
    private _indexBuffer?: GPUBuffer;
    private _indexSize?: number;

    public static async init(device: GPUDevice, modelViewMatrixUniformBuffer: GPUBuffer, projectionMatrixUnifromBuffer: GPUBuffer): Promise<Stencil> {
        const shaderModule = device.createShaderModule({ code: stencilWgsl });

        const objResponse = await fetch("./objs/stencil.obj");
        const objBlob = await objResponse.blob();
        const objText = await objBlob.text();
        const objDataExtractor = new ObjDataExtractor(objText);

        const positions = objDataExtractor.vertexPositions;
        const positionBuffer = createGPUBuffer(device, positions, GPUBufferUsage.VERTEX);
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
                buffers: [positionBufferLayout]
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
                    compare: "always",
                    passOp: "replace",
                },
                stencilBack: {
                    compare: "always",
                    passOp: "replace",
                }
            }
        };
        const pipeline = device.createRenderPipeline(pipelineDesc);

        return new Stencil(pipeline, positionBuffer, uniformBindGroup, indexBuffer, indexSize);
    }

    public encodeRenderPass(renderPassEncoder: GPURenderPassEncoder) {
        renderPassEncoder.setPipeline(this._pipeline);
        renderPassEncoder.setVertexBuffer(0, this._positionBuffer);
        renderPassEncoder.setBindGroup(0, this._uniformBindGroup);
        renderPassEncoder.setIndexBuffer(this._indexBuffer!, 'uint16');
        renderPassEncoder.drawIndexed(this._indexSize!);
    }

    private constructor(pipeline: GPURenderPipeline, positionBuffer: GPUBuffer, uniformBindGroup: GPUBindGroup, indexBuffer: GPUBuffer, indexSize: number) {
        this._pipeline = pipeline;
        this._positionBuffer = positionBuffer;
        this._uniformBindGroup = uniformBindGroup;
        this._indexBuffer = indexBuffer;
        this._indexSize = indexSize;
    }
}