import { useEffect, useRef } from "react";
import triangleWgsl from "./shaders/triangle.wgsl?raw";
import textureWgsl from "./shaders/textured_shape.wgsl?raw";
import * as glMatrix from "gl-matrix";

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = async () => {
    const webGpuContext = await WebGPUContext.create(canvasRef.current!);
    if (webGpuContext.error) {
      console.error(webGpuContext.error);
      return;
    }

    //BASIC TRIANGLE
    // const offset = new Float32Array([
    //   0.1, 0.1, 0.1
    // ]);
    // const positions = new Float32Array([
    //   1.0, -1.0, 0.0, -1.0, -1.0, 0.0, 0.0, 1.0, 0.0
    // ]);
    // const colors = new Float32Array([
    //   1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0
    // ]);
    // webGpuContext.instance!.render_vertex_color_offset(triangleWgsl, 3, 1, positions, colors, offset);

    //TEXTURED SHAPE
    const transformationMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(), 
      glMatrix.vec3.fromValues(100, 100, 100), 
      glMatrix.vec3.fromValues(0,0,0), 
      glMatrix.vec3.fromValues(0.0, 0.0, 1.0));
    const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, 640.0 / 480.0, 0.1, 1000.0);
    const positions = new Float32Array([
      100.0, -100.0, 0.0,
      0.0, 100.0, 0.0,
      -100.0, -100.0, 0.0
    ]);
    const texCoords = new Float32Array([
      1.0, 0.0,
      0.0, 0.0,
      0.5, 1.0
    ]);
    webGpuContext.instance!.render_textured_shape(textureWgsl, 3, 1, positions, texCoords, Float32Array.from(transformationMatrix), Float32Array.from(projectionMatrix), "baboon.png");

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

interface IBindGroupInput {
  type: "buffer" | "texture" | "sampler";
  buffer?: GPUBuffer;
  texture?: GPUTexture;
  sampler?: GPUSampler;
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

  private _createUniformBindGroup(bindGroupInputs: IBindGroupInput[]): IUniformBindGroup {
    const layoutEntries = [];
    const bindGroupEntries = [];
    for (let i = 0; i < bindGroupInputs.length; i++) {
      const input = bindGroupInputs[i];
      switch (input.type) {
        case "buffer":
          layoutEntries.push({ binding: i, visibility: GPUShaderStage.VERTEX, buffer: {} });
          bindGroupEntries.push({ binding: i, resource: { buffer: input.buffer! } });
          break;
        case "texture":
          layoutEntries.push({ binding: i, visibility: GPUShaderStage.FRAGMENT, texture: {} });
          bindGroupEntries.push({ binding: i, resource: input.texture!.createView() });
          break;
        case "sampler":
          layoutEntries.push({ binding: i, visibility: GPUShaderStage.FRAGMENT, sampler: {} });
          bindGroupEntries.push({ binding: i, resource: input.sampler! });
          break;
      }
    }
    const uniformBindGroupLayout = this._device.createBindGroupLayout({
      entries: layoutEntries
    });

    const uniformBindGroup = this._device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: bindGroupEntries
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
        frontFace: 'ccw' as GPUFrontFace,
        cullMode: 'back' as GPUCullMode,
      },
    }

    const pipeline = this._device.createRenderPipeline(pipelineDescriptor);
    return pipeline;
  }

  private _createTexture(imageBitmap: ImageBitmap): GPUTexture {
    const textureDescriptor: GPUTextureDescriptor = {
      size: { width: imageBitmap.width, height: imageBitmap.height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    }

    const texture = this._device.createTexture(textureDescriptor);

    this._device.queue.copyExternalImageToTexture({ source: imageBitmap }, {texture}, textureDescriptor.size);

    return texture;
  }

  private _createSampler(): GPUSampler {
    const samplerDescriptor: GPUSamplerDescriptor = {
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    }

    const sampler = this._device.createSampler(samplerDescriptor);
    return sampler;
  }

  public render_vertex_color_offset(shaderCode: string, vertexCount: number, instanceCount: number, vertices: Float32Array, colors: Float32Array, offset: Float32Array) {

    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(vertices, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: colorBuffer, layout: colorBufferLayout } = this._createSingleAttributeVertexBuffer(colors, { format: "float32x3", offset: 0, shaderLocation: 1 }, 3 * Float32Array.BYTES_PER_ELEMENT);

    const offsetBindGroupInput: IBindGroupInput = {
      type: "buffer",
      buffer: this._createGPUBuffer(offset, GPUBufferUsage.UNIFORM),
    }
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([offsetBindGroupInput]);

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

  public async render_textured_shape(shaderCode: string, vertexCount: number, instanceCount: number, vertices: Float32Array, texCoords: Float32Array,
    transformationMatrix: Float32Array, projectionMatrix: Float32Array, imgUri: string) {
    const response = await fetch(imgUri);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // CREATE UNIFORMS
    const transformationMatrixBuffer = this._createGPUBuffer(transformationMatrix, GPUBufferUsage.UNIFORM);
    const projectionMatrixBuffer = this._createGPUBuffer(projectionMatrix, GPUBufferUsage.UNIFORM);
    const texture = this._createTexture(imageBitmap);
    const sampler = this._createSampler();

    const transformationMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      buffer: transformationMatrixBuffer,
    }
    const projectionMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      buffer: projectionMatrixBuffer,
    }
    const textureBindGroupInput: IBindGroupInput = {
      type: "texture",
      texture: texture,
    }
    const samplerBindGroupInput: IBindGroupInput = {
      type: "sampler",
      sampler: sampler,
    }
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([transformationMatrixBindGroupInput, projectionMatrixBindGroupInput, textureBindGroupInput, samplerBindGroupInput]);

    // CREATE VERTEX BUFFERS
    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(vertices, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: texCoordBuffer, layout: texCoordBufferLayout } = this._createSingleAttributeVertexBuffer(texCoords, { format: "float32x2", offset: 0, shaderLocation: 1 }, 2 * Float32Array.BYTES_PER_ELEMENT);

    // CREATE COMMAND ENCODER
    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget());
    passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, texCoordBufferLayout], [uniformBindGroupLayout]));
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, texCoordBuffer);
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