import { ObjDataExtractor } from "../ObjDataExctractor";
import { createGPUBuffer } from "../Utils";
import { Pipeline } from "./Pipeline";

export class Teapot {
    private _positionBuffer: GPUBuffer;
    private _normalBuffer: GPUBuffer;
    private _uniformBindGroup: GPUBindGroup;
    private _indexBuffer?: GPUBuffer;
    private _indexSize?: number;

    public static async init(device: GPUDevice, pipeline: Pipeline): Promise<Teapot> {
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

        const ambientUniformBuffer = createGPUBuffer(device, new Float32Array([0.05, 0.01, 0.01, 1.0]), GPUBufferUsage.UNIFORM);
        const diffuseUniformBuffer = createGPUBuffer(device, new Float32Array([0.85, 0.05, 0.05, 0.5]), GPUBufferUsage.UNIFORM);
        const specularUniformBuffer = createGPUBuffer(device, new Float32Array([1.0, 1.0, 1.0, 1.0]), GPUBufferUsage.UNIFORM);
        const shininessUniformBuffer = createGPUBuffer(device, new Float32Array([80.0]), GPUBufferUsage.UNIFORM);
        const offsetUniformBuffer = createGPUBuffer(device, new Float32Array([0.0, 0.0, 0.0]), GPUBufferUsage.UNIFORM);

        const uniformBindGroup = device.createBindGroup({
            layout: pipeline.uniformBindGroupLayoutObject,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: offsetUniformBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: ambientUniformBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: diffuseUniformBuffer
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: specularUniformBuffer
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: shininessUniformBuffer
                    }
                }
            ]
        });


        return new Teapot(positionBuffer, normalBuffer, uniformBindGroup, indexBuffer, indexSize);
    }

    public encodeRenderPass(renderPassEncoder: GPURenderPassEncoder, pipeline: Pipeline, peelingTextureIndex: number) {
        renderPassEncoder.setPipeline(pipeline.renderPipeline);
        renderPassEncoder.setBindGroup(0, pipeline.uniformBindGroupGlobal);
        renderPassEncoder.setBindGroup(1, this._uniformBindGroup);
        if (peelingTextureIndex % 2 == 0) {
            renderPassEncoder.setBindGroup(2, pipeline.uniformBindGroupPeeling0);
        } else {
            renderPassEncoder.setBindGroup(2, pipeline.uniformBindGroupPeeling1);
        }
        renderPassEncoder.setVertexBuffer(0, this._positionBuffer);
        renderPassEncoder.setVertexBuffer(1, this._normalBuffer);
        renderPassEncoder.setIndexBuffer(this._indexBuffer!, 'uint16');
        renderPassEncoder.drawIndexed(this._indexSize!);
    }

    private constructor(positionBuffer: GPUBuffer, normalBuffer: GPUBuffer, uniformBindGroup: GPUBindGroup, indexBuffer: GPUBuffer, indexSize: number) {
        this._positionBuffer = positionBuffer;
        this._normalBuffer = normalBuffer;
        this._uniformBindGroup = uniformBindGroup;
        this._indexBuffer = indexBuffer;
        this._indexSize = indexSize;
    }
}