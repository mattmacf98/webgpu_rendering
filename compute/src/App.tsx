import { useEffect } from 'react'
import prefixSum from './shaders/prefix_sum.wgsl?raw'
import addSum from './shaders/add_sum.wgsl?raw'
import scanSum from './shaders/scan_sum.wgsl?raw'
import './App.css'

const App = () => {

  const prefixSum = async () => {
    const testArray = [];
    for (let i = 0; i < 1024; i++) {
      testArray.push(Math.floor(Math.random() * 100) + 1);
    }

    const context = await WebGPUComputeContext.create();

    const res = await context.instance!.prefix_sum(new Float32Array(testArray));
    console.log(testArray);
    console.log(res);
  }

  useEffect(() => {
    prefixSum();
  });

  return (
    <div>Check the console</div>
  )
};

class WebGPUComputeContext {

  private static _instance: WebGPUComputeContext | null = null;
  private _device: GPUDevice;

  public static async create() {
    if (WebGPUComputeContext._instance) {
      return { instance: WebGPUComputeContext._instance };
    }

    // make sure gpu is supported
    if (!navigator.gpu) {
      return { error: "WebGPU not supported" };
    }

    //grab the adapter
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return { error: "Failed to get WebGPU adapter" };
    }

    //create the device (should be done immediately after adapter in case adapter is lost)
    const device = await adapter.requestDevice();
    if (!device) {
      return { error: "Failed to get WebGPU device" };
    }

    WebGPUComputeContext._instance = new WebGPUComputeContext(device);
    return { instance: WebGPUComputeContext._instance };
  }

  private constructor(device: GPUDevice) {
    this._device = device;
  }

  private _createShaderModule(source: string) {
    const shaderModule = this._device.createShaderModule({ code: source });
    return shaderModule;
  }

  public createGPUBuffer(data: Float32Array | Uint16Array | Uint32Array, usage: GPUBufferUsageFlags): GPUBuffer {
    const bufferDesc: GPUBufferDescriptor = {
      size: data.byteLength,
      usage: usage,
      mappedAtCreation: true
    }
  
    const buffer = this._device.createBuffer(bufferDesc);
    if (data instanceof Float32Array) {
      const writeArray = new Float32Array(buffer.getMappedRange());
      writeArray.set(data);
    } else if (data instanceof Uint16Array) {
      const writeArray = new Uint16Array(buffer.getMappedRange());
      writeArray.set(data);
    } else if (data instanceof Uint32Array) {
      const writeArray = new Uint32Array(buffer.getMappedRange());
      writeArray.set(data);
    }
  
    buffer.unmap();
    return buffer;
  }

  public async prefix_sum(input: Float32Array): Promise<Float32Array> { 
    const pass1ShaderModule = this._createShaderModule(prefixSum);
    const pass2ShaderModule = this._createShaderModule(scanSum);
    const pass3ShaderModule = this._createShaderModule(addSum);

    const pass1UniformBindGroupLayout = this._device.createBindGroupLayout({
      entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'read-only-storage' }
        },
        {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        },
        {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        }
      ]
    });

    const pass2UniformBindGroupLayout = this._device.createBindGroupLayout({
      entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'read-only-storage' }
        },
        {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        },
        {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {}
        }
      ]
    });

    const pass3UniformBindGroupLayout = this._device.createBindGroupLayout({
      entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        },
        {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "read-only-storage" }
        }
      ]
    });

    const arraySize = input.length;
    const chunkCount = Math.ceil(arraySize / 512);

    // get nearest power of 2 for chunkCount
    let powerOf2 = 1;
    while (powerOf2 < chunkCount) {
      powerOf2 *= 2;
    }

    const inputArrayBuffer = this.createGPUBuffer(new Float32Array(input), GPUBufferUsage.STORAGE);
    const outputArrayBuffer = this.createGPUBuffer(new Float32Array(input), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const readOutputArrayBuffer = this.createGPUBuffer(new Float32Array(input), GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);

    const sumArrayBuffer = this.createGPUBuffer(new Float32Array(powerOf2), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const outputSumArrayBuffer = this.createGPUBuffer(new Float32Array(powerOf2), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const readSumArrayBuffer = this.createGPUBuffer(new Float32Array(powerOf2), GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);

    const sumSizeBuffer = this.createGPUBuffer(new Uint32Array([powerOf2]), GPUBufferUsage.UNIFORM);

    const pass1UniformBindGroup = this._device.createBindGroup({
      layout: pass1UniformBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: inputArrayBuffer
          }
        },
        {
          binding: 1,
          resource: {
            buffer: outputArrayBuffer
          }
        },
        {
          binding: 2,
          resource: {
            buffer: sumArrayBuffer
          }
        }
      ]
    });

    const pass2UniformBindGroup = this._device.createBindGroup({
      layout: pass2UniformBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: sumArrayBuffer
          }
        },
        {
          binding: 1,
          resource: {
            buffer: outputSumArrayBuffer
          }
        },
        {
          binding: 2,
          resource: {
            buffer: sumSizeBuffer
          }
        }
      ]
    });

    const pass3UniformBindGroup = this._device.createBindGroup({
      layout: pass3UniformBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: outputArrayBuffer
          }
        },
        {
          binding: 1,
          resource: {
            buffer: outputSumArrayBuffer
          }
        }
      ]
    });

    const pass1Pipeline = this._device.createComputePipeline({
      layout: this._device.createPipelineLayout({
        bindGroupLayouts: [pass1UniformBindGroupLayout]
      }),
      compute: {
        module: pass1ShaderModule,
        entryPoint: 'main'
      }
    });

    const pass2Pipeline = this._device.createComputePipeline({
      layout: this._device.createPipelineLayout({
        bindGroupLayouts: [pass2UniformBindGroupLayout]
      }),
      compute: {
        module: pass2ShaderModule,
        entryPoint: 'main'
      }
    });

    const pass3Pipeline = this._device.createComputePipeline({
      layout: this._device.createPipelineLayout({
        bindGroupLayouts: [pass3UniformBindGroupLayout]
      }),
      compute: {
        module: pass3ShaderModule,
        entryPoint: 'main'
      }
    });

    const computePassDescriptor = {};

    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder1 = commandEncoder.beginComputePass(computePassDescriptor);
    passEncoder1.setPipeline(pass1Pipeline);
    passEncoder1.setBindGroup(0, pass1UniformBindGroup);
    passEncoder1.dispatchWorkgroups(chunkCount);
    passEncoder1.end();

    const passEncoder2 = commandEncoder.beginComputePass(computePassDescriptor);
    passEncoder2.setPipeline(pass2Pipeline);
    passEncoder2.setBindGroup(0, pass2UniformBindGroup);
    passEncoder2.dispatchWorkgroups(1);
    passEncoder2.end();

    const passEncoder3 = commandEncoder.beginComputePass(computePassDescriptor);
    passEncoder3.setPipeline(pass3Pipeline);
    passEncoder3.setBindGroup(0, pass3UniformBindGroup);
    passEncoder3.dispatchWorkgroups(chunkCount);
    passEncoder3.end();


    commandEncoder.copyBufferToBuffer(outputArrayBuffer, 0, readOutputArrayBuffer, 0, input.length * 4);
    commandEncoder.copyBufferToBuffer(outputSumArrayBuffer, 0, readSumArrayBuffer, 0, powerOf2 * 4);

    await this._device.queue.submit([commandEncoder.finish()]);
    await readOutputArrayBuffer.mapAsync(GPUMapMode.READ, 0, input.length * 4);

    const outputArray = new Float32Array(readOutputArrayBuffer.getMappedRange());
    return outputArray;
  }
}

export default App