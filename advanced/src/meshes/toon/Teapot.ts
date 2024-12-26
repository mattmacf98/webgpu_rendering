import { ObjDataExtractor } from "../ObjDataExctractor";
import { createGPUBuffer } from "../Utils";

export class Teapot {
    private _pipeline: GPURenderPipeline;
    private _lightPipeline: GPURenderPipeline;
    private _outlinePipeline: GPURenderPipeline;
    private _positionBuffer: GPUBuffer;
    private _normalBuffer: GPUBuffer;
    private _uniformBindGroup: GPUBindGroup;
    private _uniformBindGroupLight: GPUBindGroup;
    private _uniformBindGroupOutline: GPUBindGroup;
    private _indexBuffer?: GPUBuffer;
    private _indexSize?: number;

    public static async init(device: GPUDevice, modelViewMatrixUniformBuffer: GPUBuffer, 
        projectionMatrixUniformBuffer: GPUBuffer, normalMatrixUniformBuffer: GPUBuffer,
        viewDirectionUniformBuffer: GPUBuffer, lightDirectionUniformBuffer: GPUBuffer,
        depthTexture: GPUTexture, sampler: GPUSampler, lightModelViewMatrixUniformBuffer: GPUBuffer, 
        lightProjectionMatrixUniformBuffer: GPUBuffer, screenDimUniformBuffer: GPUBuffer, shaderCode: string, lightViewShaderCode: string, outlineShaderCode: string): Promise<Teapot> {
        const shaderModule = device.createShaderModule({ code: shaderCode });
        const shaderModuleLight = device.createShaderModule({code: lightViewShaderCode});
        const shaderModuleOutline = device.createShaderModule({code: outlineShaderCode});

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

        const shadeTextureDesc: GPUTextureDescriptor = {
            size: [128],
            dimension: "1d",
            format: "rgba8unorm",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
        }
        const shadeTextureColors = [];
        for (let i = 0; i < 128; i++) {
            if (i < 40) {
                shadeTextureColors.push(95);
                shadeTextureColors.push(121);
                shadeTextureColors.push(127);
                shadeTextureColors.push(255);
            }
            else if (i >= 40 && i < 80) {
                shadeTextureColors.push(143);
                shadeTextureColors.push(181);
                shadeTextureColors.push(191);
                shadeTextureColors.push(255);
            }
            else if (i >= 80 && i < 124) {
                shadeTextureColors.push(191);
                shadeTextureColors.push(242);
                shadeTextureColors.push(255);
                shadeTextureColors.push(255);
            }
            else {
                shadeTextureColors.push(255);
                shadeTextureColors.push(255);
                shadeTextureColors.push(255);
                shadeTextureColors.push(255);
            }
        }
        const shadeTexture: GPUTexture = device.createTexture(shadeTextureDesc);
        device.queue.writeTexture({texture: shadeTexture}, new Uint8Array(shadeTextureColors), {
            offset: 0,
            bytesPerRow: 128 * 4,
            rowsPerImage: 1
        }, {width: 128});
        await device.queue.onSubmittedWorkDone();

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

        const uniformBindGroupLayoutOutline = device.createBindGroupLayout({
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
                    texture: {
                        sampleType: "depth"
                    }
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: "comparison"
                    }
                },
                {
                    binding: 8,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 9,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 10,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        viewDimension: '1d'
                    }
                },
                {
                    binding: 11,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                }
            ]
        });

        const shininessUniformBuffer = createGPUBuffer(device, new Float32Array([20.0]), GPUBufferUsage.UNIFORM);

        const shadeSampler: GPUSampler = device.createSampler({
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear'
        });

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

        const uniformBindGroupOutline = device.createBindGroup({
            layout: uniformBindGroupLayoutOutline,
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
                        buffer: projectionMatrixUniformBuffer
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
                        buffer: screenDimUniformBuffer
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
                        buffer: projectionMatrixUniformBuffer
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
                        buffer: shininessUniformBuffer
                    }
                },
                {
                    binding: 6,
                    resource: depthTexture.createView()
                },
                {
                    binding: 7,
                    resource: sampler
                },
                {
                    binding: 8,
                    resource: {
                        buffer: lightModelViewMatrixUniformBuffer
                    }
                },
                {
                    binding: 9,
                    resource: {
                        buffer: lightProjectionMatrixUniformBuffer
                    }
                },
                {
                    binding: 10,
                    resource: shadeTexture.createView()
                },
                {
                    binding: 11,
                    resource:
                        shadeSampler
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

        const outlinePipelineDesc: GPURenderPipelineDescriptor = {
            layout: device.createPipelineLayout({bindGroupLayouts: [uniformBindGroupLayoutOutline]}),
            vertex: {
                module: shaderModuleOutline,
                entryPoint: 'vs_main',
                buffers: [positionBufferLayout, normalBufferLayout]
            },
            fragment: {
                module: shaderModuleOutline,
                entryPoint: 'fs_main',
                targets: [colorState]
            },
            primitive: {
                topology: 'triangle-list',
                frontFace: 'ccw',
                cullMode: 'front'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth32float'
            }
        }
        const outlinePipeline = device.createRenderPipeline(outlinePipelineDesc);

        return new Teapot(pipeline, lightPipeline, outlinePipeline, positionBuffer, normalBuffer, uniformBindGroup, uniformBindGroupLight, uniformBindGroupOutline, indexBuffer, indexSize);
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

    public encodeOutlineRenderPass(renderPassEncoder: GPURenderPassEncoder) {
        renderPassEncoder.setPipeline(this._outlinePipeline);
        renderPassEncoder.setBindGroup(0, this._uniformBindGroupOutline);
        renderPassEncoder.setVertexBuffer(0, this._positionBuffer);
        renderPassEncoder.setVertexBuffer(1, this._normalBuffer);
        renderPassEncoder.setIndexBuffer(this._indexBuffer!, 'uint16');
        renderPassEncoder.drawIndexed(this._indexSize!)
    }

    private constructor(pipeline: GPURenderPipeline, lightPipeline: GPURenderPipeline, outlinePipeline: GPURenderPipeline, positionBuffer: GPUBuffer, normalBuffer: GPUBuffer,
         uniformBindGroup: GPUBindGroup, uniformBindGroupLight: GPUBindGroup, uniformBindGroupOutline: GPUBindGroup, indexBuffer: GPUBuffer, indexSize: number) {
        this._pipeline = pipeline;
        this._lightPipeline = lightPipeline;
        this._outlinePipeline = outlinePipeline;
        this._positionBuffer = positionBuffer;
        this._normalBuffer = normalBuffer;
        this._uniformBindGroup = uniformBindGroup;
        this._uniformBindGroupLight = uniformBindGroupLight;
        this._uniformBindGroupOutline = uniformBindGroupOutline;
        this._indexBuffer = indexBuffer;
        this._indexSize = indexSize;
    }
}