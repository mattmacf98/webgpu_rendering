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

    webGpuContext.instance!.render(triangleWgsl, "fs_main", "vs_main", 3, 1);
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
class WebGPUContext {
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

  public createRenderTarget(): GPURenderPassDescriptor {
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

  public createShaderModule(source: string) {
    const shaderModule = this._device.createShaderModule({ code: source });
    return shaderModule;
  }

  public createPipeline(shaderModule: GPUShaderModule, fragmentEntryPoint: string, vertexEntryPoint: string): GPURenderPipeline {
    // layour
    const pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor = {bindGroupLayouts: []};
    const layout = this._device.createPipelineLayout(pipelineLayoutDescriptor);

    //TODO: parametrize?
    const colorState = {
      format: 'bgra8unorm' as GPUTextureFormat,
    }

    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      layout: layout,
      vertex: {
        module: shaderModule,
        entryPoint: vertexEntryPoint,
        buffers: []
      },
      fragment: {
        module: shaderModule,
        entryPoint: fragmentEntryPoint,
        targets: [colorState],
      },
      primitive: {
        topology: 'triangle-list' as GPUPrimitiveTopology,
        frontFace: 'ccw' as GPUFrontFace,
        cullMode: 'back' as GPUCullMode,
      },
    }

    const pipeline = this._device.createRenderPipeline(pipelineDescriptor);
    return pipeline;
  }

  public render(shaderCode: string, fragmentEntryPoint: string, vertexEntryPoint: string, vertexCount: number, instanceCount: number) {
    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this.createRenderTarget());
    passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoder.setPipeline(this.createPipeline(this.createShaderModule(shaderCode), fragmentEntryPoint, vertexEntryPoint));
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