export class Pipeline {
    private _uniformBindGroupLayoutPeeling: GPUBindGroupLayout;
    private _uniformBindGroupLayoutObject: GPUBindGroupLayout;
    private _uniformBindGroupGlobal: GPUBindGroup;
    private _renderPipeline: GPURenderPipeline;
    private _sampler: GPUSampler;
    private _uniformBindGroupPeeling0?: GPUBindGroup;
    private _uniformBindGroupPeeling1?: GPUBindGroup;


    public get uniformBindGroupLayoutObject(): GPUBindGroupLayout {
        return this._uniformBindGroupLayoutObject;
    }

    public get uniformBindGroupGlobal(): GPUBindGroup {
        return this._uniformBindGroupGlobal;
    }

    public get uniformBindGroupPeeling0(): GPUBindGroup | undefined {
        return this._uniformBindGroupPeeling0;
    }

    public get uniformBindGroupPeeling1(): GPUBindGroup | undefined {
        return this._uniformBindGroupPeeling1;
    }

    public get renderPipeline(): GPURenderPipeline {
        return this._renderPipeline;
    }

    public static async init(device: GPUDevice, modelViewMatrixUniformBuffer: GPUBuffer, 
        projectionMatrixUniformBuffer: GPUBuffer, normalMatrixUniformBuffer: GPUBuffer,
        viewDirectionUniformBuffer: GPUBuffer, lightDirectionUniformBuffer: GPUBuffer, shaderCode: string): Promise<Pipeline> {
            const shaderModule: GPUShaderModule = device.createShaderModule({ code: shaderCode });

            const sampler: GPUSampler = device.createSampler({
                addressModeU: 'clamp-to-edge',
                addressModeV: 'clamp-to-edge',
                magFilter: 'nearest',
                minFilter: 'nearest',
                mipmapFilter: 'nearest',
                compare: 'greater'
            });

            const uniformBindGroupLayoutGlobal: GPUBindGroupLayout = device.createBindGroupLayout({
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
                    }
                ]
            });

            const uniformBindGroupLayoutObject: GPUBindGroupLayout = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: {}
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: {}
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: {}
                    },
                    {
                        binding: 3,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: {}
                    },
                    {
                        binding: 4,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: {}
                    }
                ]
            });

            const uniformBindGroupLayoutPeeling: GPUBindGroupLayout = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {
                            sampleType: "depth"
                        }
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {
                            type: 'comparison',
                        },
                    }
                ]
            });

            const uniformBindGroupGlobal: GPUBindGroup = device.createBindGroup({
                layout: uniformBindGroupLayoutGlobal,
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
                    }
                ]
            });

            const positionAttribDesc: GPUVertexAttribute = {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3'
            };

            const positionBufferLayoutDesc: GPUVertexBufferLayout = {
                attributes: [positionAttribDesc],
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
                stepMode: 'vertex'
            };

            const normalAttribDesc: GPUVertexAttribute = {
                shaderLocation: 1,
                offset: 0,
                format: 'float32x3'
            };

            const normalBufferLayoutDesc: GPUVertexBufferLayout = {
                attributes: [normalAttribDesc],
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
                stepMode: 'vertex'
            };

            const layout: GPUPipelineLayout = device.createPipelineLayout(
                {
                    bindGroupLayouts: [uniformBindGroupLayoutGlobal, uniformBindGroupLayoutObject, uniformBindGroupLayoutPeeling]
                }
            );

            const colorState: GPUColorTargetState = {
                format: 'bgra8unorm'
            };

            const pipelineDesc: GPURenderPipelineDescriptor = {
                layout: layout,
                vertex: {
                    module: shaderModule,
                    entryPoint: 'vs_main',
                    buffers: [positionBufferLayoutDesc, normalBufferLayoutDesc]
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
            }

            const pipeline: GPURenderPipeline = device.createRenderPipeline(pipelineDesc);

            return new Pipeline(uniformBindGroupLayoutPeeling, uniformBindGroupLayoutObject, uniformBindGroupGlobal, sampler, pipeline);
    }

    public updateDepthPeelingUniformGroup(device: GPUDevice, depthTexture0: GPUTexture, depthTexture1: GPUTexture) {
        this._uniformBindGroupPeeling0 = device.createBindGroup({
            layout:this._uniformBindGroupLayoutPeeling,
            entries: [
                {
                    binding: 0,
                    resource: depthTexture0.createView()
                },
                {
                    binding: 1,
                    resource:
                        this._sampler
                }
            ]
        });

        this._uniformBindGroupPeeling1 = device.createBindGroup({
            layout:this._uniformBindGroupLayoutPeeling,
            entries: [
                {
                    binding: 0,
                    resource: depthTexture1.createView()
                },
                {
                    binding: 1,
                    resource:
                        this._sampler
                }
            ]
        });
    }

    private constructor(uniformBindGroupLayoutPeeling: GPUBindGroupLayout, uniformBindGroupLayoutObject: GPUBindGroupLayout, uniformBindGroupGlobal: GPUBindGroup, sampler: GPUSampler, renderPipeline: GPURenderPipeline) {
        this._uniformBindGroupLayoutPeeling = uniformBindGroupLayoutPeeling;
        this._uniformBindGroupGlobal = uniformBindGroupGlobal;
        this._uniformBindGroupLayoutObject = uniformBindGroupLayoutObject;
        this._sampler = sampler;
        this._renderPipeline = renderPipeline;
    }

}