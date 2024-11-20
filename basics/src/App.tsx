import { useEffect, useRef } from "react";
import triangleWgsl from "./shaders/triangle.wgsl?raw";

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = async () => {
    const webGpuContext = await WebGPUContext.create(canvasRef.current!);
    if (webGpuContext.error) {
      console.error(webGpuContext.error);
      return;
    }

    const offset = new Float32Array([
      0.1, 0.1, 0.1
    ]);
    const positions = new Float32Array([
      1.0, -1.0, 0.0, -1.0, -1.0, 0.0, 0.0, 1.0, 0.0
    ]);
    const colors = new Float32Array([
      1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0
    ]);
    webGpuContext.instance!.render(triangleWgsl, 3, 1, positions, colors, offset);
  }

  useEffect(() => {
    if (canvasRef.current) {
      render();
    }
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} width={640} height={480}></canvas>
    </div>
  )
};

export default App;


interface WebGpuContextInitResult {
  instance?: WebGPUContext;
  error?: string;
}

interface IGPUVertexBuffer {
  buffer: GPUBuffer;
  layout: GPUVertexBufferLayout;
}

interface IUniformBindGroup {
  bindGroupLayout: GPUBindGroupLayout;
  bindGroup: GPUBindGroup;
}

class WebGPUContext {
  private static VERTEX_ENTRY_POINT = "vs_main";
  private static FRAGMENT_ENTRY_POINT = "fs_main";
  private static _instance: WebGPUContext;
  private _context: GPUCanvasContext;
  private _device: GPUDevice;
  private _canvas: HTMLCanvasElement;

  public static async create(canvas: HTMLCanvasElement): Promise<WebGpuContextInitResult> {
    if (WebGPUContext._instance) {
      return { instance: WebGPUContext._instance };
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

    //create the context
    const context = canvas.getContext("webgpu");
    if (!context) {
      return { error: "Failed to get WebGPU context" };
    }

    const canvasConfig: GPUCanvasConfiguration = {
      device: device,
      format: navigator.gpu.getPreferredCanvasFormat() as GPUTextureFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      alphaMode: "opaque",
    }

    context.configure(canvasConfig);

    WebGPUContext._instance = new WebGPUContext(context, device, canvas);
    return { instance: WebGPUContext._instance };
  }

  private _createRenderTarget(): GPURenderPassDescriptor {
    const colorTexture = this._context.getCurrentTexture();
    const colorTextureView = colorTexture.createView();

    const colorAttachment: GPURenderPassColorAttachment = {
      view: colorTextureView,
      clearValue: { r: 1, g: 0, b: 0, a: 1 },
      loadOp: "clear",
      storeOp: "store",
    }

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment]
    }

    return renderPassDescriptor;
  }

  private _createGPUBuffer(data: Float32Array | Uint16Array, usage: GPUBufferUsageFlags): GPUBuffer {
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
    }
  
    buffer.unmap();
    return buffer;
  }

  private _createSingleAttributeVertexBuffer(vertexAttributeData: Float32Array, attributeDesc: GPUVertexAttribute, arrayStride: number): IGPUVertexBuffer {
    const layout: GPUVertexBufferLayout = {
      arrayStride,
      stepMode: "vertex",
      attributes: [attributeDesc],
    }

    const buffer = this._createGPUBuffer(vertexAttributeData, GPUBufferUsage.VERTEX);

    return { buffer, layout };
  }

  private _createUniformBindGroup(uniformData: Float32Array): IUniformBindGroup {
    const uniformBindGroupLayout = this._device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {}
      }]
    });

    const uniformBuffer = this._createGPUBuffer(uniformData, GPUBufferUsage.UNIFORM);

    const uniformBindGroup = this._device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: uniformBuffer }
      }]
    });

    return { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup };
  }

  private _createShaderModule(source: string) {
    const shaderModule = this._device.createShaderModule({ code: source });
    return shaderModule;
  }

  private _createPipeline(shaderModule: GPUShaderModule, vertexBuffers: GPUVertexBufferLayout[], uniformBindGroups: GPUBindGroupLayout[]): GPURenderPipeline {
    // layour
    const pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor = {bindGroupLayouts: uniformBindGroups};
    const layout = this._device.createPipelineLayout(pipelineLayoutDescriptor);

    //TODO: parametrize?
    const colorState = {
      format: 'bgra8unorm' as GPUTextureFormat,
    }

    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      layout: layout,
      vertex: {
        module: shaderModule,
        entryPoint: WebGPUContext.VERTEX_ENTRY_POINT,
        buffers: vertexBuffers,
      },
      fragment: {
        module: shaderModule,
        entryPoint: WebGPUContext.FRAGMENT_ENTRY_POINT,
        targets: [colorState],
      },
      primitive: {
        topology: 'triangle-list' as GPUPrimitiveTopology,
        frontFace: 'cw' as GPUFrontFace,
        cullMode: 'back' as GPUCullMode,
      },
    }

    const pipeline = this._device.createRenderPipeline(pipelineDescriptor);
    return pipeline;
  }

  public render(shaderCode: string, vertexCount: number, instanceCount: number, vertices: Float32Array, colors: Float32Array, offset: Float32Array) {

    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(vertices, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: colorBuffer, layout: colorBufferLayout } = this._createSingleAttributeVertexBuffer(colors, { format: "float32x3", offset: 0, shaderLocation: 1 }, 3 * Float32Array.BYTES_PER_ELEMENT);

    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup(offset);

    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget());
    passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, colorBufferLayout], [uniformBindGroupLayout]));
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, colorBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(vertexCount, instanceCount);
    passEncoder.end();

    this._device.queue.submit([commandEncoder.finish()]);
  }

  private constructor(context: GPUCanvasContext, device: GPUDevice, canvas: HTMLCanvasElement) {
    this._context = context;
    this._device = device;
    this._canvas = canvas;
  }
}