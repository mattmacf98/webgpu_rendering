import * as glMatrix from "gl-matrix";
import { createGPUBuffer } from "./Utils";

export class RunningCube {
    private _pipeline: GPURenderPipeline;
    private _positionBuffer: GPUBuffer;
    private _boneWeightBuffer: GPUBuffer;
    private _uniformBindGroup: GPUBindGroup;
    private _uniformBindGroupBone: GPUBindGroup;
    private _boneTransformsUniformBuffer: GPUBuffer;
    private _objBody: any;
    private _indexBuffer?: GPUBuffer;
    private _indexSize?: number;

    public get objBody() {
        return this._objBody;
    }

    public get boneTransformsUniformBuffer() {
        return this._boneTransformsUniformBuffer;
    }

    public static async init(device: GPUDevice, modelViewMatrixUniformBuffer: GPUBuffer, 
        projectionMatrixUniformBuffer: GPUBuffer, normalMatrixUniformBuffer: GPUBuffer,
        viewDirectionUniformBuffer: GPUBuffer, lightDirectionUniformBuffer: GPUBuffer, shaderCode: string): Promise<RunningCube> {
            const shaderModule = device.createShaderModule({ code: shaderCode });

            const objResponse = await fetch("./data/cuberun.json");
            const objBody = await objResponse.json();

            const boneWeights = new Float32Array(objBody.vert.length * 16 / 3);
            for (const bone of objBody.skeleton) {
                RunningCube.assignBoneWeightsToVertices(bone, boneWeights);
            }
            
            const boneTransforms = RunningCube.updateAnimation(0, objBody);

            const boneTransformsUniformBuffer: GPUBuffer = createGPUBuffer(device, boneTransforms, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
            const boneWeightBuffer: GPUBuffer = createGPUBuffer(device, boneWeights, GPUBufferUsage.VERTEX);
            const positionBuffer: GPUBuffer = createGPUBuffer(device, new Float32Array(objBody.vert), GPUBufferUsage.VERTEX);

            const indexSize = objBody.indices.length;
            const indexBuffer: GPUBuffer = createGPUBuffer(device, new Uint16Array(objBody.indices), GPUBufferUsage.INDEX);

            const unifromBindGroupLayoutBone: GPUBindGroupLayout = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: {}
                    }
                ]
            });
            const uniformBindGroupBone: GPUBindGroup = device.createBindGroup({
                layout: unifromBindGroupLayoutBone,
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: boneTransformsUniformBuffer
                        }
                    }
                ]
            });
            uniformBindGroupBone.label = "uniformBindGroupBone";

            const uniformBindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
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
                    }
                ]
            });

            const ambientUniformBuffer = createGPUBuffer(device, new Float32Array([0.25, 0.25, 0.25, 1.0]), GPUBufferUsage.UNIFORM);
            const diffuseUniformBuffer = createGPUBuffer(device, new Float32Array([0.75, 0.75, 0.95, 1.0]), GPUBufferUsage.UNIFORM);
            const specularUniformBuffer = createGPUBuffer(device, new Float32Array([1.0, 1.0, 1.0, 1.0]), GPUBufferUsage.UNIFORM);
            const shininessUniformBuffer = createGPUBuffer(device, new Float32Array([20.0]), GPUBufferUsage.UNIFORM);

            const uniformBindGroup: GPUBindGroup = device.createBindGroup({
                layout: uniformBindGroupLayout,
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
                    }
                ]
            });
            uniformBindGroup.label = "uniformBindGroup";

            const positionAttribDesc: GPUVertexAttribute = {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3'
            };

            const positionBufferLayoutDesc: GPUVertexBufferLayout = {
                attributes: [positionAttribDesc],
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 6,
                stepMode: 'vertex'
            };

            const normalAttribDesc: GPUVertexAttribute = {
                shaderLocation: 1,
                offset: Float32Array.BYTES_PER_ELEMENT  * 3,
                format: 'float32x3'
            };

            const normalBufferLayoutDesc: GPUVertexBufferLayout = {
                attributes: [normalAttribDesc],
                arrayStride: Float32Array.BYTES_PER_ELEMENT  * 6,
                stepMode: 'vertex'
            };
            const boneWeight0AttribDesc: GPUVertexAttribute = {
                shaderLocation: 2,
                offset: 0,
                format: 'float32x4'
            };

            const boneWeight1AttribDesc: GPUVertexAttribute = {
                shaderLocation: 3,
                offset: Float32Array.BYTES_PER_ELEMENT  * 4,
                format: 'float32x4'
            };

            const boneWeight2AttribDesc: GPUVertexAttribute = {
                shaderLocation: 4,
                offset: Float32Array.BYTES_PER_ELEMENT  * 8,
                format: 'float32x4'
            };

            const boneWeight3AttribDesc: GPUVertexAttribute = {
                shaderLocation: 5,
                offset: Float32Array.BYTES_PER_ELEMENT  * 12,
                format: 'float32x4'
            };

            const boneWeightBufferLayoutDesc: GPUVertexBufferLayout = {
                attributes: [boneWeight0AttribDesc, boneWeight1AttribDesc, boneWeight2AttribDesc, boneWeight3AttribDesc],
                arrayStride: Float32Array.BYTES_PER_ELEMENT  * 16,
                stepMode: 'vertex'
            };

            const layout = device.createPipelineLayout(
                {bindGroupLayouts: [uniformBindGroupLayout, unifromBindGroupLayoutBone]}
            );
            const colorState: GPUColorTargetState = {
                format: "bgra8unorm" 
            };

            const pipelineDesc: GPURenderPipelineDescriptor = {
                layout: layout,
                vertex: {
                    module: shaderModule,
                    entryPoint: 'vs_main',
                    buffers: [positionBufferLayoutDesc, normalBufferLayoutDesc, boneWeightBufferLayoutDesc]
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: 'fs_main',
                    targets: [colorState]
                },
                primitive: {
                    topology: "triangle-list",
                    frontFace: "ccw",
                    cullMode: "none"
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: "less",
                    format: "depth32float"
                }
            };

            const pipeline: GPURenderPipeline = device.createRenderPipeline(pipelineDesc);

            return new RunningCube(pipeline, positionBuffer, boneWeightBuffer, boneTransformsUniformBuffer, uniformBindGroup, uniformBindGroupBone, indexBuffer, indexSize, objBody);
    }

    public encodeRenderPass(renderPassEncoder: GPURenderPassEncoder) {
        renderPassEncoder.setPipeline(this._pipeline);
        renderPassEncoder.setBindGroup(0, this._uniformBindGroup);
        renderPassEncoder.setBindGroup(1, this._uniformBindGroupBone);
        renderPassEncoder.setVertexBuffer(0, this._positionBuffer);
        renderPassEncoder.setVertexBuffer(1, this._positionBuffer);
        renderPassEncoder.setVertexBuffer(2, this._boneWeightBuffer);
        renderPassEncoder.setIndexBuffer(this._indexBuffer!, 'uint16');
        renderPassEncoder.drawIndexed(this._indexSize!);
    }

    public static updateAnimation(time: number, objBody: any) {
        const boneTransforms: Float32Array = new Float32Array(16*16);
        
        for (const bone of objBody.skeleton) {
            RunningCube.deriveBoneTransformHelper(time, bone, glMatrix.mat4.identity(glMatrix.mat4.create()), boneTransforms);
        }

        return boneTransforms;
    }

    private static interpolateVertexAttributes(time: number, vertexAttributes: any[], interpolate: (attr1: any, attr2: any, t: number) => any) {
        const moddedTime = (time * 1000) % vertexAttributes[vertexAttributes.length - 1].time;
        let startIndex = 0;
        while (startIndex < vertexAttributes.length - 1 && moddedTime > vertexAttributes[startIndex + 1].time) {
            startIndex++;
        } 

 
        const endIndex = (startIndex + 1) % vertexAttributes.length;
        
        if (startIndex == vertexAttributes.length - 1) {
            return interpolate(vertexAttributes[0], vertexAttributes[0], 0.5);
        }

        const endTime = vertexAttributes[endIndex].time;
        const startTime = vertexAttributes[startIndex].time;

        const factor = (moddedTime - startTime) /  (endTime -  startTime);
        return interpolate(vertexAttributes[startIndex], vertexAttributes[endIndex], factor);
    }

    private static deriveBoneTransformHelper(time: number, bone: any, parentTransform: glMatrix.mat4, boneTransforms: Float32Array) {
        if (bone.id !== undefined) {
            const offsetMatrix = glMatrix.mat4.fromValues(
                bone.offsetMatrix[0],
                bone.offsetMatrix[4],
                bone.offsetMatrix[8],
                bone.offsetMatrix[12],
                bone.offsetMatrix[1],
                bone.offsetMatrix[5],
                bone.offsetMatrix[9],
                bone.offsetMatrix[13],
                bone.offsetMatrix[2],
                bone.offsetMatrix[6],
                bone.offsetMatrix[10],
                bone.offsetMatrix[14],
                bone.offsetMatrix[3],
                bone.offsetMatrix[7],
                bone.offsetMatrix[11],
                bone.offsetMatrix[15]);

            if (bone.ani !== undefined) {
                const interpolatedPosition = RunningCube.interpolateVertexAttributes(time, bone.ani.pos, (pos1, pos2, factor) => {
                    return glMatrix.vec3.lerp(glMatrix.vec3.create(), glMatrix.vec3.fromValues(pos1.pos[0], pos1.pos[1], pos1.pos[2]),
                                glMatrix.vec3.fromValues(pos2.pos[0], pos2.pos[1], pos2.pos[2]), factor);
                });
                const translationMatrix = glMatrix.mat4.fromTranslation(glMatrix.mat4.create(), interpolatedPosition);

                const interpolatedQuat = RunningCube.interpolateVertexAttributes(time, bone.ani.rot, (quat1, quat2, factor) => {
                    return glMatrix.quat.lerp(glMatrix.quat.create(),
                        glMatrix.quat.fromValues(quat1.q[1], quat1.q[2], quat1.q[3], quat1.q[0]),
                        glMatrix.quat.fromValues(quat2.q[1], quat2.q[2], quat2.q[3], quat2.q[0]),
                        factor
                    );
                });
                const rotationMatrix = glMatrix.mat4.fromQuat(glMatrix.mat4.create(), interpolatedQuat);

                const interpolatedScale = RunningCube.interpolateVertexAttributes(time, bone.ani.scal, (scal1, scal2, factor) => {
                    return glMatrix.vec3.lerp(glMatrix.vec3.create(), glMatrix.vec3.fromValues(scal1.pos[0], scal1.pos[1], scal1.pos[2]),
                        glMatrix.vec3.fromValues(scal2.pos[0], scal2.pos[1], scal2.pos[2]), factor);
                });
                const scalingMatrix = glMatrix.mat4.fromScaling(glMatrix.mat4.create(), interpolatedScale);

                const rotation_x_scale = glMatrix.mat4.multiply(glMatrix.mat4.create(), rotationMatrix, scalingMatrix);
                const locationTransformation = glMatrix.mat4.multiply(glMatrix.mat4.create(), translationMatrix, rotation_x_scale);
                const globalTransformation = glMatrix.mat4.multiply(glMatrix.mat4.create(), parentTransform, locationTransformation);
                const finalBoneTransformation = glMatrix.mat4.multiply(glMatrix.mat4.create(), globalTransformation, offsetMatrix);

                boneTransforms.set(finalBoneTransformation, bone.id * 16);

                for (const boneChild of bone.children) {
                    RunningCube.deriveBoneTransformHelper(time, boneChild, globalTransformation, boneTransforms);
                }
            } else {
                const nodeTransform = glMatrix.mat4.fromValues(bone.nodeTransform[0],
                    bone.nodeTransform[4],
                    bone.nodeTransform[8],
                    bone.nodeTransform[12],
                    bone.nodeTransform[1],
                    bone.nodeTransform[5],
                    bone.nodeTransform[9],
                    bone.nodeTransform[13],
                    bone.nodeTransform[2],
                    bone.nodeTransform[6],
                    bone.nodeTransform[10],
                    bone.nodeTransform[14],
                    bone.nodeTransform[3],
                    bone.nodeTransform[7],
                    bone.nodeTransform[11],
                    bone.nodeTransform[15]);

                const globalBoneTransform = glMatrix.mat4.multiply(glMatrix.mat4.create(), parentTransform, nodeTransform);
                const finalBoneTransformation = glMatrix.mat4.multiply(glMatrix.mat4.create(), globalBoneTransform, offsetMatrix);
                boneTransforms.set(finalBoneTransformation, bone.id * 16);

                for (const boneChild of bone.children) {
                    RunningCube.deriveBoneTransformHelper(time, boneChild, globalBoneTransform, boneTransforms);
                }
            }
        } else {
            const nodeTransform = glMatrix.mat4.fromValues(bone.nodeTransform[0],
                bone.nodeTransform[4],
                bone.nodeTransform[8],
                bone.nodeTransform[12],
                bone.nodeTransform[1],
                bone.nodeTransform[5],
                bone.nodeTransform[9],
                bone.nodeTransform[13],
                bone.nodeTransform[2],
                bone.nodeTransform[6],
                bone.nodeTransform[10],
                bone.nodeTransform[14],
                bone.nodeTransform[3],
                bone.nodeTransform[7],
                bone.nodeTransform[11],
                bone.nodeTransform[15]);

            const globalTransformation = glMatrix.mat4.multiply(glMatrix.mat4.create(), parentTransform, nodeTransform);
            for (const boneChild of bone.children) {
                RunningCube.deriveBoneTransformHelper(time, boneChild, globalTransformation, boneTransforms);
            }
        }
    }

    private static assignBoneWeightsToVertices(bone: any, boneWeights: Float32Array) {
        if (bone.weights) {
            for (let i = 0; i < bone.weights.length; i++) {
                const {id, w} = bone.weights[i];
                boneWeights[id * 16 + bone.id] = w;
            }
        }

        if (bone.children) {
            for (const childBone of bone.children) {
                RunningCube.assignBoneWeightsToVertices(childBone, boneWeights);
            }
        }
    }

    private constructor(pipeline: GPURenderPipeline, positionBuffer: GPUBuffer, boneWeightBuffer: GPUBuffer, boneTransformsUniformBuffer: GPUBuffer,
        uniformBindGroup: GPUBindGroup, uniformBindGroupBone: GPUBindGroup, indexBuffer: GPUBuffer, indexSize: number, objBody: any) {
       this._pipeline = pipeline;
       this._positionBuffer = positionBuffer;
       this._boneWeightBuffer = boneWeightBuffer;
       this._boneTransformsUniformBuffer = boneTransformsUniformBuffer;
       this._uniformBindGroup = uniformBindGroup;
       this._uniformBindGroupBone = uniformBindGroupBone;
       this._indexBuffer = indexBuffer;
       this._indexSize = indexSize;
       this._objBody = objBody;
   }
}