import { useEffect } from 'react'
import prefixSum from './shaders/prefix_sum.wgsl?raw'
import addSum from './shaders/add_sum.wgsl?raw'
import scanSum from './shaders/scan_sum.wgsl?raw'
import radixPrefixSum from './shaders/radix_prefix_sum.wgsl?raw'
import radixScanSum from './shaders/radix_scan_sum.wgsl?raw'
import radixShuffle from './shaders/radix_shuffle.wgsl?raw'
import './App.css'

const App = () => {

  const prefixSum = async () => {
    const testArray = [];
    for (let i = 0; i < 1024; i++) {
      testArray.push(Math.floor(Math.random() * 100) + 1);
    }
  
    const context = await WebGPUComputeContext.create();

    const res = await context.instance!.prefixSum(new Float32Array(testArray));
    console.log(testArray);
    console.log(res);
  }

  const radixSort = async () => {
    const testArray = [];
    const testIdArray = [];
    for (let i = 0; i < 1024; i++) {
      testArray.push(Math.floor(Math.random() * 100) + 1);
      testIdArray.push(i);
    }
  
    const context = await WebGPUComputeContext.create();

    const res = await context.instance!.radixSort(new Uint32Array(testArray), new Uint32Array(testIdArray));
    console.log(testArray);
    console.log(res);
  }

  useEffect(() => {
    radixSort();
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

  public async radixSort(input: Uint32Array, inputIds: Uint32Array): Promise<Uint32Array> {
    const chunkCount = Math.ceil(input.length / 512);

    const pass1ShaderModule = this._createShaderModule(radixPrefixSum);
    const pass2ShaderModule = this._createShaderModule(radixScanSum);
    const pass3ShaderModule = this._createShaderModule(radixShuffle);

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


    let uniformBindGroupLayoutRadixId = this._device.createBindGroupLayout({
      entries: [
          {
              binding: 0,
              visibility: GPUShaderStage.COMPUTE,
              buffer: {}
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
            buffer: { type: "read-only-storage" }
        },
        {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "read-only-storage" }
        },
        {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "read-only-storage" }
        },
        {
            binding: 3,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "read-only-storage" }
        },
        {
            binding: 4,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {}
        },
        {
            binding: 5,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        },
        {
            binding: 6,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        }
      ]
    });


    // get nearest power of 2 for chunkCount
    let powerOf2 = 1;
    while (powerOf2 < chunkCount) {
      powerOf2 *= 2;
    }

    const inputArrayBuffer = this.createGPUBuffer(input, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const inputIdxArrayBuffer = this.createGPUBuffer(inputIds, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    
    const tempBuffer = this.createGPUBuffer(new Uint32Array(input.length*4), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const outputArrayBuffer = this.createGPUBuffer(new Uint32Array(input.length), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const outputIdArrayBuffer = this.createGPUBuffer(new Uint32Array(inputIds), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);

    const sumArrayBuffer = this.createGPUBuffer(new Uint32Array(powerOf2 * 4), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const outputSumArrayBuffer = this.createGPUBuffer(new Uint32Array(powerOf2 * 4), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const readOutputSumArrayBuffer = this.createGPUBuffer(new Uint32Array(powerOf2 * 4), GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);

    const readOutputArrayBuffer = this.createGPUBuffer(new Uint32Array(input.length), GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
    const readOutputIdArrayBuffer = this.createGPUBuffer(new Uint32Array(input.length), GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
    const sumSizeBuffer = this.createGPUBuffer(new Uint32Array([powerOf2]), GPUBufferUsage.UNIFORM);

    const radixIdUniformBuffers = [];

    for (let i = 0; i < 16; i++) {
      const radixIdUniformBuffer = this.createGPUBuffer(new Uint32Array([i]), GPUBufferUsage.UNIFORM);
      radixIdUniformBuffers.push(radixIdUniformBuffer);
    }

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
            buffer: tempBuffer
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

    let pass1UniformBindGroupOut = this._device.createBindGroup({
      layout: pass1UniformBindGroupLayout,
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
                  buffer: tempBuffer
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

    const uniformBindGroupRadixIds = [];
    for (let i = 0; i < 16; i++) {
      const uniformBindGroupRadixId = this._device.createBindGroup({
        layout: uniformBindGroupLayoutRadixId,
        entries: [
          {
            binding: 0,
            resource: {
              buffer: radixIdUniformBuffers[i]
            }
          }
        ]
      });

      uniformBindGroupRadixIds.push(uniformBindGroupRadixId);
    }

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
            buffer: inputArrayBuffer
          }
        },
        {
          binding: 1,
          resource: {
            buffer: inputIdxArrayBuffer
          }
        },
        {
          binding: 2,
          resource: {
            buffer: tempBuffer
          }
        },
        {
          binding: 3,
          resource: {
            buffer: outputSumArrayBuffer
          },
        },
        {
          binding: 4,
          resource: {
            buffer: sumSizeBuffer
          }
        },
        {
          binding: 5,
          resource: {
            buffer: outputArrayBuffer
          }
        },
        {
          binding: 6,
          resource: {
            buffer: outputIdArrayBuffer
          }
        }
      ]
    });

    let pass3UniformBindGroupOut = this._device.createBindGroup({
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
                  buffer: outputIdArrayBuffer
              }
          },
          {
              binding: 2,
              resource: {
                  buffer: tempBuffer
              }
          },
          {
              binding: 3,
              resource: {
                  buffer: outputSumArrayBuffer
              }
          },
          {
              binding: 4,
              resource: {
                  buffer: sumSizeBuffer
              }
          },
          {
              binding: 5,
              resource: {
                  buffer: inputArrayBuffer
              }
          },
          {
              binding: 6,
              resource: {
                  buffer: inputIdxArrayBuffer
              }
          }
      ]
  });

    const pass1Pipeline = this._device.createComputePipeline({
      layout: this._device.createPipelineLayout({
        bindGroupLayouts: [pass1UniformBindGroupLayout, uniformBindGroupLayoutRadixId]
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
        bindGroupLayouts: [pass3UniformBindGroupLayout, uniformBindGroupLayoutRadixId]
      }),
      compute: {
        module: pass3ShaderModule,
        entryPoint: 'main'
      }
    });

    const computePassDescriptor = {};
    const commandEncoder = this._device.createCommandEncoder();
    for (let i = 0; i < 16; i++) {
      const passEncoder1 = commandEncoder.beginComputePass(computePassDescriptor);
      passEncoder1.setPipeline(pass1Pipeline);
      if (i % 2 == 0) {
        passEncoder1.setBindGroup(0, pass1UniformBindGroup);
      } else {
        passEncoder1.setBindGroup(0, pass1UniformBindGroupOut);
      }
      passEncoder1.setBindGroup(1, uniformBindGroupRadixIds[i]);
      passEncoder1.dispatchWorkgroups(chunkCount);
      passEncoder1.end();

      const pass2Encoder = commandEncoder.beginComputePass(computePassDescriptor);
      pass2Encoder.setPipeline(pass2Pipeline);
      pass2Encoder.setBindGroup(0, pass2UniformBindGroup);
      pass2Encoder.dispatchWorkgroups(1);
      pass2Encoder.end();

      const pass3Encoder = commandEncoder.beginComputePass(computePassDescriptor);
      pass3Encoder.setPipeline(pass3Pipeline);
      if (i % 2 == 0) {
        pass3Encoder.setBindGroup(0, pass3UniformBindGroup);
      } else {
        pass3Encoder.setBindGroup(0, pass3UniformBindGroupOut);
      }
      pass3Encoder.setBindGroup(1, uniformBindGroupRadixIds[i]);
      pass3Encoder.dispatchWorkgroups(chunkCount);
      pass3Encoder.end();
    }

    commandEncoder.copyBufferToBuffer(inputArrayBuffer, 0, readOutputArrayBuffer, 0, input.length * 4);
    commandEncoder.copyBufferToBuffer(inputIdxArrayBuffer, 0, readOutputIdArrayBuffer, 0, input.length * 4);
    commandEncoder.copyBufferToBuffer(outputSumArrayBuffer, 0, readOutputSumArrayBuffer, 0, powerOf2 * 4 * 4);

    this._device.queue.submit([commandEncoder.finish()]);
    await this._device.queue.onSubmittedWorkDone();

    await readOutputArrayBuffer.mapAsync(GPUMapMode.READ, 0, input.length * 4);
    const d = new Uint32Array(readOutputArrayBuffer.getMappedRange());

    return d;
  }

  public async prefixSum(input: Float32Array): Promise<Float32Array> { 
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