import { useEffect, useRef } from "react";
import triangleWgsl from "./shaders/triangle.wgsl?raw";
import textureWgsl from "./shaders/textured_shape.wgsl?raw";
import fake3dWgsl from "./shaders/fake_3d.wgsl?raw";
import vertGaussianBlurWgsl from "./shaders/vert_gaussian_blur.wgsl?raw";
import horizGaussianBlurWgsl from "./shaders/horiz_gaussian_blur.wgsl?raw";
import depthTestingWgsl from "./shaders/depth_testing.wgsl?raw";
import objModelWgsl from "./shaders/obj_model.wgsl?raw";
import * as glMatrix from "gl-matrix";
import ObjFileParser from "obj-file-parser";

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = async () => {
    const primitiveState: GPUPrimitiveState = {
      topology: 'triangle-list' as GPUPrimitiveTopology,
      frontFace: 'ccw' as GPUFrontFace,
      cullMode: 'none' as GPUCullMode,
    }
    const webGpuContext = await WebGPUContext.create({
      canvas: canvasRef.current!,
      primitiveState,
      depthStencilState: {
        depthWriteEnabled: true,
        depthCompare: 'less' as GPUCompareFunction,
        format: 'depth24plus-stencil8' as GPUTextureFormat,
      }
    });
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
    // const transformationMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(), 
    //   glMatrix.vec3.fromValues(100, 100, 100), 
    //   glMatrix.vec3.fromValues(0,0,0), 
    //   glMatrix.vec3.fromValues(0.0, 0.0, 1.0));
    // const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, 640.0 / 480.0, 0.1, 1000.0);
    // const positions = new Float32Array([
    //   100.0, -100.0, 0.0,
    //   0.0, 100.0, 0.0,
    //   -100.0, -100.0, 0.0
    // ]);
    // const texCoords = new Float32Array([
    //   1.0, 0.0,
    //   0.0, 0.0,
    //   0.5, 1.0
    // ]);
    // webGpuContext.instance!.render_textured_shape(textureWgsl, 3, 1, positions, texCoords, Float32Array.from(transformationMatrix), Float32Array.from(projectionMatrix), "baboon.png");

    //DEPTH TESTING
    // const transformationMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(), glMatrix.vec3.fromValues(300, 300, 300), glMatrix.vec3.fromValues(0, 0, 0), glMatrix.vec3.fromValues(0.0, 0.0, 1.0));
    // const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, 640.0 / 480.0, 0.1, 1000.0);
    // const positions = new Float32Array([
    //   -100.0, 100.0, 0.0,
    //   -100.0, 100.0, 200.0,
    //   100.0, 100.0, 0.0,
    //   100.0, 100.0, 200.0,

    //   100.0, -100.0, 0.0,
    //   100.0, -100.0, 200.0,

    //   -100.0, -100.0, 0.0,
    //   -100.0, -100.0, 200.0,

    //   -100.0, 100.0, 0.0,
    //   -100.0, 100.0, 200.0
    // ]);
    // const primitiveState: GPUPrimitiveState = {
    //   topology: 'triangle-strip' as GPUPrimitiveTopology,
    //   frontFace: 'ccw' as GPUFrontFace,
    //   cullMode: 'none' as GPUCullMode,
    // }
    // const depthStencilState: GPUDepthStencilState = {
    //   depthWriteEnabled: true,
    //   depthCompare: 'less' as GPUCompareFunction,
    //   format: 'depth24plus-stencil8' as GPUTextureFormat,
    // }
    // webGpuContext.instance!.render_depth_testing(depthTestingWgsl, 10, 1, positions, Float32Array.from(transformationMatrix), Float32Array.from(projectionMatrix), primitiveState, depthStencilState);

    //MODEL LOADING
    const modelViewMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(), glMatrix.vec3.fromValues(3, 3, 3), glMatrix.vec3.fromValues(0, 0, 0), glMatrix.vec3.fromValues(0.0, 0.0, 1.0));
    const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, 640.0 / 480.0, 0.1, 1000.0);
    const modelViewMatrixInverse = glMatrix.mat4.invert(glMatrix.mat4.create(), modelViewMatrix);
    const normalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), modelViewMatrixInverse);
    const lightDirection = glMatrix.vec3.fromValues(-1, -1, -1);
    const viewDirection = glMatrix.vec3.fromValues(-1, -1, -1);

    webGpuContext.instance!.render_obj_model(objModelWgsl, "teapot.obj", Float32Array.from(modelViewMatrix), Float32Array.from(projectionMatrix), Float32Array.from(normalMatrix), Float32Array.from(lightDirection), Float32Array.from(viewDirection));

    // GAUSSIAN BLUR
    // const transformationMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(), 
    //   glMatrix.vec3.fromValues(0, 0, 10), 
    //   glMatrix.vec3.fromValues(0,0,0), 
    //   glMatrix.vec3.fromValues(0.0, 1.0, 0.0));
    // const orthProjMatrix = glMatrix.mat4.ortho(glMatrix.mat4.create(), -320.0, 320.0, 240.0, -240.0, -1000.0, 1000.0);
    // const positions = new Float32Array([
    //   100.0, -100.0, 0.0,
    //   100.0, 100.0, 0.0,
    //   -100.0, -100.0, 0.0,
    //   -100.0, 100.0, 0.0
    // ]);
    // const texCoords = new Float32Array([
    //   1.0, 0.0,
    //   1.0, 1.0,
    //   0.0, 0.0,
    //   0.0, 1.0
    // ]);
    // webGpuContext.instance!.render_gaussian_blur(vertGaussianBlurWgsl, horizGaussianBlurWgsl, 4, 1, positions, texCoords, Float32Array.from(transformationMatrix), Float32Array.from(orthProjMatrix), "baboon.png");
  
    // VIDEO TEXTURE
    // const transformationMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(), 
    //   glMatrix.vec3.fromValues(100, 100, 100), 
    //   glMatrix.vec3.fromValues(0,0,0), 
    //   glMatrix.vec3.fromValues(0.0, 0.0, 1.0));
    // const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, 640.0 / 480.0, 0.1, 1000.0);
    // const positions = new Float32Array([
    //   100.0, -100.0, 0.0,
    //   100.0, 100.0, 0.0,
    //   -100.0, -100.0, 0.0,
    //   -100.0, 100.0, 0.0
    // ]);
    // const texCoords = new Float32Array([
    //   1.0,
    //   0.0,

    //   1.0,
    //   1.0,

    //   0.0,
    //   0.0,

    //   0.0,
    //   1.0
    // ]);
    // webGpuContext.instance!.render_video_texture(textureWgsl, 4, 1, positions, texCoords, Float32Array.from(transformationMatrix), Float32Array.from(projectionMatrix), "Firefox.mp4");

    //TEXT RENDERING
    //   const translateMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(),
    //           glMatrix.vec3.fromValues(0, 0, 500), glMatrix.vec3.fromValues(0, 0, 0), glMatrix.vec3.fromValues(0.0, 1.0, 0.0));

    //   const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(),
    //       1.4, 640.0 / 480.0, 0.1, 1000.0);

    //   webGpuContext.instance!.render_text(textureWgsl, Float32Array.from(translateMatrix), Float32Array.from(projectionMatrix), "Hello, World!", 320, 240, 0.5, "bold", "Arial", "white", 32, 28);
    // }

    //FAKE 3D
    // const positions = new Float32Array([
    //     1.0, -1.0, 0.0,
    //     1.0, 1.0, 0.0,
    //     -1.0, -1.0, 0.0,
    //     -1.0, 1.0, 0.0
    // ]);

    // const texCoords = new Float32Array([
    //     1.0,
    //     1.0,

    //     1.0,
    //     0.0,

    //     0.0,
    //     1.0,

    //     0.0,
    //     0.0
    // ]);
    // webGpuContext.instance!.render_fake_3d(fake3dWgsl, 4, 1, positions, texCoords, "portrait.jpg", "depth.png");
  }

  useEffect(() => {
    if (canvasRef.current) {
      render();
    }
  }, []);

  return (
    <div style={{display: "flex", flexDirection: "column", height: "100%", position: "relative"}}>
      <canvas ref={canvasRef} width={640} height={480} style={{flexGrow: 1, flexShrink: 0}}></canvas>
    </div>
  )
};


interface WebGpuContextInitResult {
  instance?: WebGPUContext;
  error?: string;
}

interface IBindGroupInput {
  type: "buffer" | "texture" | "sampler";
  visibility: number;
  readonly?: boolean;
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

interface IWebGPUContextOptions {
  canvas: HTMLCanvasElement;
  primitiveState: GPUPrimitiveState;
  depthStencilState?: GPUDepthStencilState;
  msaa?: number;
}
class WebGPUContext {
  private static VERTEX_ENTRY_POINT = "vs_main";
  private static FRAGMENT_ENTRY_POINT = "fs_main";
  private static _instance: WebGPUContext;
  private _context: GPUCanvasContext;
  private _device: GPUDevice;
  private _canvas: HTMLCanvasElement;
  private _primitiveState: GPUPrimitiveState;
  private _depthStencilState?: GPUDepthStencilState;
  private _msaa?: number;

  public static async create(options: IWebGPUContextOptions): Promise<WebGpuContextInitResult> {
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
    const context = options.canvas.getContext("webgpu");
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

    WebGPUContext._instance = new WebGPUContext(context, device, options.canvas, options.primitiveState, options.depthStencilState, options.msaa);
    return { instance: WebGPUContext._instance };
  }

  private constructor(context: GPUCanvasContext, device: GPUDevice, canvas: HTMLCanvasElement, primitiveState: GPUPrimitiveState, depthStencilState?: GPUDepthStencilState, msaa?: number) {
    this._context = context;
    this._device = device;
    this._canvas = canvas;
    this._primitiveState = primitiveState;
    this._depthStencilState = depthStencilState;
    this._msaa = msaa;
  }

  private _createRenderTarget(colorAttachmentTexture: GPUTexture, clearValue: {r: number, g: number, b: number, a: number}, msaa?: number, depthTexture?: GPUTexture): GPURenderPassDescriptor { 
    const textureView = colorAttachmentTexture.createView();
    let colorAttachment: GPURenderPassColorAttachment;
    if (msaa) {
      const msaaTexture = this._device.createTexture({
        size: { width: this._canvas.width, height: this._canvas.height },
        sampleCount: msaa,
        format: navigator.gpu.getPreferredCanvasFormat() as GPUTextureFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      colorAttachment = {
        view: msaaTexture.createView(),
        resolveTarget: textureView,
        clearValue: clearValue,
        loadOp: "clear",
        storeOp: "store",
      }
    } else {
      colorAttachment = {
        view: textureView,
        clearValue: clearValue,
        loadOp: "clear",
        storeOp: "store",
      }
    }

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment]
    }

    if (depthTexture) {
      renderPassDescriptor.depthStencilAttachment = {
        view: depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        stencilClearValue: 0,
        stencilLoadOp: 'clear',
        stencilStoreOp: 'store'
      }
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
          const layoutEntry = { binding: i, visibility: input.visibility, buffer: {} }
          if (input.readonly) {
            layoutEntry.buffer = {type: "read-only-storage"};
          }
          layoutEntries.push(layoutEntry);
          bindGroupEntries.push({ binding: i, resource: { buffer: input.buffer! } });
          break;
        case "texture":
          layoutEntries.push({ binding: i, visibility: input.visibility, texture: {} });
          bindGroupEntries.push({ binding: i, resource: input.texture!.createView() });
          break;
        case "sampler":
          layoutEntries.push({ binding: i, visibility: input.visibility, sampler: {} });
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

  private _createPipeline(shaderModule: GPUShaderModule, vertexBuffers: GPUVertexBufferLayout[], uniformBindGroups: GPUBindGroupLayout[], colorFormat: GPUTextureFormat, blend?: GPUBlendState): GPURenderPipeline {
    // layour
    const pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor = {bindGroupLayouts: uniformBindGroups};
    const layout = this._device.createPipelineLayout(pipelineLayoutDescriptor);

    //TODO: parametrize?
    const colorState: GPUColorTargetState = {
      format: colorFormat,
    }
    if (blend) {
      colorState.blend = blend;
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
      primitive: this._primitiveState,
      depthStencil: this._depthStencilState,
      multisample: this._msaa ? { count: this._msaa} : undefined
    }

    const pipeline = this._device.createRenderPipeline(pipelineDescriptor);
    return pipeline;
  }

  private _createTextureFromImage(imageBitmap: ImageBitmap): GPUTexture {
    const textureDescriptor: GPUTextureDescriptor = {
      size: { width: imageBitmap.width, height: imageBitmap.height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    }

    const texture = this._device.createTexture(textureDescriptor);

    this._device.queue.copyExternalImageToTexture({ source: imageBitmap }, {texture}, textureDescriptor.size);

    return texture;
  }

  private _createDepthTexture(): GPUTexture {
    const depthTextureDesc: GPUTextureDescriptor = {
      size: { width: this._canvas.width, height: this._canvas.height },
      dimension: '2d',
      sampleCount: this._msaa,
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT 
    };

    const depthTexture = this._device.createTexture(depthTextureDesc);
    return depthTexture;
  }

  private _createTexture(width: number, height: number): GPUTexture { 
    const textureDescriptor: GPUTextureDescriptor = {
      size: { width, height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    }

    const texture = this._device.createTexture(textureDescriptor);
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
      visibility: GPUShaderStage.VERTEX,
      buffer: this._createGPUBuffer(offset, GPUBufferUsage.UNIFORM),
    }
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([offsetBindGroupInput]);

    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(this._context.getCurrentTexture(), {r: 1.0, g: 0.0, b: 0.0, a: 1.0}, this._msaa));
    passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, colorBufferLayout], [uniformBindGroupLayout], "bgra8unorm"));
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
    const texture = this._createTextureFromImage(imageBitmap);
    const sampler = this._createSampler();

    const transformationMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: transformationMatrixBuffer,
    }
    const projectionMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: projectionMatrixBuffer,
    }
    const textureBindGroupInput: IBindGroupInput = {
      type: "texture",
      visibility: GPUShaderStage.FRAGMENT,
      texture: texture,
    }
    const samplerBindGroupInput: IBindGroupInput = {
      type: "sampler",
      visibility: GPUShaderStage.FRAGMENT,
      sampler: sampler,
    }
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([transformationMatrixBindGroupInput, projectionMatrixBindGroupInput, textureBindGroupInput, samplerBindGroupInput]);

    // CREATE VERTEX BUFFERS
    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(vertices, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: texCoordBuffer, layout: texCoordBufferLayout } = this._createSingleAttributeVertexBuffer(texCoords, { format: "float32x2", offset: 0, shaderLocation: 1 }, 2 * Float32Array.BYTES_PER_ELEMENT);

    // CREATE COMMAND ENCODER
    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(this._context.getCurrentTexture(), {r: 1.0, g: 0.0, b: 0.0, a: 1.0}, this._msaa));
    passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, texCoordBufferLayout], [uniformBindGroupLayout], "bgra8unorm"));
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, texCoordBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(vertexCount, instanceCount);
    passEncoder.end();

    this._device.queue.submit([commandEncoder.finish()]);
  }

  public render_depth_testing(shaderCode: string, vertexCount: number, instanceCount: number, vertices: Float32Array, transformationMatrix: Float32Array, projectionMatrix: Float32Array) {
    const depthTexture = this._createDepthTexture();

    const transformationMatrixBuffer = this._createGPUBuffer(transformationMatrix, GPUBufferUsage.UNIFORM);
    const projectionMatrixBuffer = this._createGPUBuffer(projectionMatrix, GPUBufferUsage.UNIFORM);

    const transformationMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: transformationMatrixBuffer,
    }
    const projectionMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: projectionMatrixBuffer,
    }
  
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([transformationMatrixBindGroupInput, projectionMatrixBindGroupInput]);

    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(vertices, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);

    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(this._context.getCurrentTexture(), {r: 1.0, g: 0.0, b: 0.0, a: 1.0}, this._msaa, depthTexture));
    passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout], [uniformBindGroupLayout], "bgra8unorm"));
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(vertexCount, instanceCount);
    passEncoder.end();

    this._device.queue.submit([commandEncoder.finish()]);
  }

  public async render_obj_model(shaderCode: string, objFilePath: string, transformationMatrix: Float32Array, projectionMatrix: Float32Array, normalMatrix: Float32Array, 
    lightDirection: Float32Array, viewDirection: Float32Array) {
    const objResponse = await fetch(objFilePath);
    const objBlob = await objResponse.blob();
    const objText = await objBlob.text();
    const objDataExtractor = new ObjDataExtractor(objText);

    let depthTexture = this._createDepthTexture();

    const transformationMatrixBuffer = this._createGPUBuffer(transformationMatrix, GPUBufferUsage.UNIFORM);
    const projectionMatrixBuffer = this._createGPUBuffer(projectionMatrix, GPUBufferUsage.UNIFORM);
    const normalMatrixBuffer = this._createGPUBuffer(normalMatrix, GPUBufferUsage.UNIFORM);
    const lightDirectionBuffer = this._createGPUBuffer(lightDirection, GPUBufferUsage.UNIFORM);
    const viewDirectionBuffer = this._createGPUBuffer(viewDirection, GPUBufferUsage.UNIFORM);

    const transformationMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: transformationMatrixBuffer,
    }
    const projectionMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: projectionMatrixBuffer,
    }
    const normalMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: normalMatrixBuffer,
    }
    const lightDirectionBindGroupInput: IBindGroupInput = { 
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: lightDirectionBuffer,
    }
    const viewDirectionBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: viewDirectionBuffer,
    }
  
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([transformationMatrixBindGroupInput, projectionMatrixBindGroupInput, normalMatrixBindGroupInput, lightDirectionBindGroupInput, viewDirectionBindGroupInput]);

    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(objDataExtractor.vertexPositions, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: normalBuffer, layout: normalBufferLayout } = this._createSingleAttributeVertexBuffer(objDataExtractor.normals, { format: "float32x3", offset: 0, shaderLocation: 1 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const indexBuffer = this._createGPUBuffer(objDataExtractor.indices, GPUBufferUsage.INDEX);

    const render = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const currenCanvasWidth = this._canvas.clientWidth * devicePixelRatio;
      const currentCanvasHeight = this._canvas.clientHeight * devicePixelRatio;


      let projectionMatrixUpdateBuffer = null;
      if (currenCanvasWidth != this._canvas.width || currentCanvasHeight != this._canvas.height) { 
        this._canvas.width = currenCanvasWidth;
        this._canvas.height = currentCanvasHeight;

        depthTexture.destroy();
        depthTexture = this._createDepthTexture();

        const updateProjectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, this._canvas.width / this._canvas.height, 0.1, 1000.0);
        projectionMatrixUpdateBuffer = this._createGPUBuffer(Float32Array.from(updateProjectionMatrix), GPUBufferUsage.COPY_SRC);
      }

      const commandEncoder = this._device.createCommandEncoder();
      if (projectionMatrixUpdateBuffer != null) {
        commandEncoder.copyBufferToBuffer(projectionMatrixBuffer, 0, projectionMatrixBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
      }

      const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(this._context.getCurrentTexture(), {r: 1.0, g: 0.0, b: 0.0, a: 1.0}, this._msaa, depthTexture));
      passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
      passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, normalBufferLayout], [uniformBindGroupLayout], "bgra8unorm"));
      passEncoder.setVertexBuffer(0, positionBuffer);
      passEncoder.setVertexBuffer(1, normalBuffer);
      passEncoder.setIndexBuffer(indexBuffer, "uint16");
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.drawIndexed(objDataExtractor.indices.length, 1, 0, 0, 0);
      passEncoder.end();
  
      this._device.queue.submit([commandEncoder.finish()]);
    }
   
    requestAnimationFrame(render);
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(render);
    });
    resizeObserver.observe(this._canvas);
  }

  public async render_gaussian_blur(shaderCodeOne: string, shaderCodeTwo: string, vertexCount: number, instanceCount: number, vertices: Float32Array, texCoords: Float32Array,
    transformationMatrix: Float32Array, projectionMatrix: Float32Array, imgUri: string) {
    const response = await fetch(imgUri);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // CREATE UNIFORMS
    const transformationMatrixBuffer = this._createGPUBuffer(transformationMatrix, GPUBufferUsage.UNIFORM);
    const projectionMatrixBuffer = this._createGPUBuffer(projectionMatrix, GPUBufferUsage.UNIFORM);
    const texture = this._createTextureFromImage(imageBitmap);
    const sampler = this._createSampler();
    const passOneTexture = this._createTexture(texture.width, texture.height);

    const imgSizeBuffer = this._createGPUBuffer(new Float32Array([imageBitmap.width, imageBitmap.height]), GPUBufferUsage.UNIFORM);
    let kValues = []
 
    const kernelSize = 8.0;
    const sigma = 8.0;
    let intensity = 0.0;
    
    for (let y = - kernelSize; y <= kernelSize; y += 1.0) {
        let gaussian_value = 1.0 / Math.sqrt(2.0 * Math.PI * sigma * sigma) * Math.exp(-y * y / (2.0 * sigma * sigma));
        intensity += gaussian_value;
        kValues.push(gaussian_value);
    }
    const kernelBuffer = this._createGPUBuffer(new Float32Array(kValues), GPUBufferUsage.STORAGE);
    const kernelSizeBuffer = this._createGPUBuffer(new Float32Array([kernelSize]), GPUBufferUsage.UNIFORM);

    const transformationMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: transformationMatrixBuffer,
    }
    const projectionMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: projectionMatrixBuffer,
    }
    const imageSizeBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.FRAGMENT,
      buffer: imgSizeBuffer,
    }
    const textureBindGroupInput: IBindGroupInput = {
      type: "texture",
      visibility: GPUShaderStage.FRAGMENT,
      texture: texture,
    }
    const samplerBindGroupInput: IBindGroupInput = {
      type: "sampler",
      visibility: GPUShaderStage.FRAGMENT,
      sampler: sampler,
    }
    const kernelBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.FRAGMENT,
      readonly: true,
      buffer: kernelBuffer,
    }
    const kernelSizeBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.FRAGMENT,
      buffer: kernelSizeBuffer,
    }
    const passOneTextureBindGroupInput: IBindGroupInput = {
      type: "texture",
      visibility: GPUShaderStage.FRAGMENT,
      texture: passOneTexture,
    }


    const { bindGroupLayout: uniformBindGroupLayoutPassOne, bindGroup: uniformBindGroupPassOne } = this._createUniformBindGroup([imageSizeBindGroupInput, textureBindGroupInput, samplerBindGroupInput, kernelBindGroupInput, kernelSizeBindGroupInput]);
    const { bindGroupLayout: uniformBindGroupLayoutPassTwo, bindGroup: uniformBindGroupPassTwo } = this._createUniformBindGroup([transformationMatrixBindGroupInput, projectionMatrixBindGroupInput, imageSizeBindGroupInput, passOneTextureBindGroupInput, samplerBindGroupInput, kernelBindGroupInput, kernelSizeBindGroupInput]);

    // CREATE VERTEX BUFFERS
    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(vertices, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: texCoordBufferOne, layout: texCoordBufferLayoutOne } = this._createSingleAttributeVertexBuffer(texCoords, { format: "float32x2", offset: 0, shaderLocation: 0 }, 2 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: texCoordBufferTwo, layout: texCoordBufferLayoutTwo } = this._createSingleAttributeVertexBuffer(texCoords, { format: "float32x2", offset: 0, shaderLocation: 1 }, 2 * Float32Array.BYTES_PER_ELEMENT);

    // CREATE COMMAND ENCODER
    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(passOneTexture, {r: 0.0, g: 0.0, b: 0.0, a: 0.0}));
    passEncoder.setViewport(0, 0, texture.width, texture.height, 0, 1);
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCodeOne), [texCoordBufferLayoutOne], [uniformBindGroupLayoutPassOne], "rgba8unorm"));
    passEncoder.setVertexBuffer(0, texCoordBufferOne);
    passEncoder.setBindGroup(0, uniformBindGroupPassOne);
    passEncoder.draw(vertexCount, instanceCount);
    passEncoder.end();

    const passEncoderTwo = commandEncoder.beginRenderPass(this._createRenderTarget(this._context.getCurrentTexture(), {r: 1.0, g: 0.0, b: 0.0, a: 1.0}));
    passEncoderTwo.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoderTwo.setPipeline(this._createPipeline(this._createShaderModule(shaderCodeTwo), [positionBufferLayout, texCoordBufferLayoutTwo], [uniformBindGroupLayoutPassTwo], "bgra8unorm"));
    passEncoderTwo.setVertexBuffer(0, positionBuffer);
    passEncoderTwo.setVertexBuffer(1, texCoordBufferTwo);
    passEncoderTwo.setBindGroup(0, uniformBindGroupPassTwo);
    passEncoderTwo.draw(vertexCount, instanceCount);
    passEncoderTwo.end();
   
    this._device.queue.submit([commandEncoder.finish()]);
  }

  public async render_video_texture(shaderCode: string, vertexCount: number, instanceCount: number, vertices: Float32Array, texCoords: Float32Array,
    transformationMatrix: Float32Array, projectionMatrix: Float32Array, videoUrl: string) {
    const videoLoader = await VideoLoader.create(videoUrl);
    const videoTexture = this._createTexture(videoLoader.videoElement.videoWidth, videoLoader.videoElement.videoHeight);
    videoLoader.videoElement.ontimeupdate = async (event) => {
      const imagedData = await createImageBitmap(videoLoader.videoElement);
      this._device.queue.copyExternalImageToTexture({ source: imagedData }, {texture: videoTexture}, {width: imagedData.width, height: imagedData.height});
    }

    const transformationMatrixBuffer = this._createGPUBuffer(transformationMatrix, GPUBufferUsage.UNIFORM);
    const projectionMatrixBuffer = this._createGPUBuffer(projectionMatrix, GPUBufferUsage.UNIFORM);
    const sampler = this._createSampler();

    const transformationMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: transformationMatrixBuffer,
    }
    const projectionMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: projectionMatrixBuffer,
    }
    const textureBindGroupInput: IBindGroupInput = {
      type: "texture",
      visibility: GPUShaderStage.FRAGMENT,
      texture: videoTexture,
    }
    const samplerBindGroupInput: IBindGroupInput = {
      type: "sampler",
      visibility: GPUShaderStage.FRAGMENT,
      sampler: sampler,
    }
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([transformationMatrixBindGroupInput, projectionMatrixBindGroupInput, textureBindGroupInput, samplerBindGroupInput]);

    // CREATE VERTEX BUFFERS
    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(vertices, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: texCoordBuffer, layout: texCoordBufferLayout } = this._createSingleAttributeVertexBuffer(texCoords, { format: "float32x2", offset: 0, shaderLocation: 1 }, 2 * Float32Array.BYTES_PER_ELEMENT);

    // CREATE COMMAND ENCODER
    const render = () => {
      const commandEncoder = this._device.createCommandEncoder();

      const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(this._context.getCurrentTexture(), {r: 1.0, g: 0.0, b: 0.0, a: 1.0}, this._msaa));
      passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
      passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, texCoordBufferLayout], [uniformBindGroupLayout], "bgra8unorm"));
      passEncoder.setVertexBuffer(0, positionBuffer);
      passEncoder.setVertexBuffer(1, texCoordBuffer);
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.draw(vertexCount, instanceCount);
      passEncoder.end();

      this._device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);
  }

  public async render_text(shaderCode: string, transformationMatrix: Float32Array, projectionMatrix: Float32Array,
     text: string, width: number, height: number, alpha: number, fontWeight: string, fontFamily: string, fillStyle: string, fontSize: number, textLength: number) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0,0, width, height);
    ctx.globalAlpha = alpha;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fillStyle;
    const textMeasure = ctx.measureText(text);

    ctx.fillText(text, 0, textLength);

    const neareastPowerof2 = 1 << (32 - Math.clz32(Math.ceil(textMeasure.width)));
    const texture = this._createTexture(neareastPowerof2, fontSize);
    this._device.queue.copyExternalImageToTexture({ source: canvas, origin: {x: 0, y:0}}, {texture: texture}, {width: neareastPowerof2, height: fontSize});

    const transformationMatrixBuffer = this._createGPUBuffer(transformationMatrix, GPUBufferUsage.UNIFORM);
    const projectionMatrixBuffer = this._createGPUBuffer(projectionMatrix, GPUBufferUsage.UNIFORM);
    const sampler = this._createSampler();

    const transformationMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: transformationMatrixBuffer,
    }
    const projectionMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.VERTEX,
      buffer: projectionMatrixBuffer,
    }
    const textureBindGroupInput: IBindGroupInput = {
      type: "texture",
      visibility: GPUShaderStage.FRAGMENT,
      texture: texture,
    }
    const samplerBindGroupInput: IBindGroupInput = {
      type: "sampler",
      visibility: GPUShaderStage.FRAGMENT,
      sampler: sampler,
    }
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([transformationMatrixBindGroupInput, projectionMatrixBindGroupInput, textureBindGroupInput, samplerBindGroupInput]);

    const positions = new Float32Array([
        textMeasure.width *0.5, -16.0, 0.0,
        textMeasure.width*0.5, 16.0, 0.0,
        -textMeasure.width*0.5, -16.0, 0.0,
        -textMeasure.width*0.5, 16.0, 0.0
    ]);

    const w = textMeasure.width / neareastPowerof2;
    const texCoords = new Float32Array([
      w,
      1.0,
      
      w,
      0.0,

      0.0,
      1.0,

      0.0,
      0.0
    ]);

    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(positions, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: texCoordBuffer, layout: texCoordBufferLayout } = this._createSingleAttributeVertexBuffer(texCoords, { format: "float32x2", offset: 0, shaderLocation: 1 }, 2 * Float32Array.BYTES_PER_ELEMENT);

    const blend: GPUBlendState = {
      color: {
        srcFactor: "one",
        dstFactor: "one-minus-src",
        operation: "add",
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src",
        operation: "add",
      }
    }

    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(this._context.getCurrentTexture(), {r: 1.0, g: 0.0, b: 0.0, a: 1.0}, this._msaa));
    passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, texCoordBufferLayout], [uniformBindGroupLayout], "bgra8unorm", blend));
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, texCoordBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(4, 1);
    passEncoder.end();

    this._device.queue.submit([commandEncoder.finish()]);
  }

  public async render_fake_3d(shaderCode: string, vertexCount: number, instanceCount: number, vertices: Float32Array, texCoords: Float32Array, diffuseTextureUrl: string, depthTextureUrl:string) {
    const diffuseImageBitmap = await createImageBitmap(await (await fetch(diffuseTextureUrl)).blob());
    console.log("diffuse decoderd");
    const depthImageBitmap = await createImageBitmap(await (await fetch(depthTextureUrl)).blob());

    const diffuseTexture = this._createTextureFromImage(diffuseImageBitmap);
    const depthTexture = this._createTextureFromImage(depthImageBitmap);
    const sampler = this._createSampler();
    const offset = new Float32Array([0.0, 0.0]);
    const offsetUnifromBuffer = this._createGPUBuffer(offset, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

    const diffuseTextureBindGroupInput: IBindGroupInput = {
      type: "texture",
      visibility: GPUShaderStage.FRAGMENT,
      texture: diffuseTexture,
    }

    const depthTextureBindGroupInput: IBindGroupInput = {
      type: "texture",
      visibility: GPUShaderStage.FRAGMENT,
      texture: depthTexture,
    }

    const samplerBindGroupInput: IBindGroupInput = {
      type: "sampler",
      visibility: GPUShaderStage.FRAGMENT,
      sampler: sampler,
    }

    const offsetBindGroupInput: IBindGroupInput = {
      type: "buffer",
      visibility: GPUShaderStage.FRAGMENT,
      buffer: offsetUnifromBuffer,
    }

    
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([diffuseTextureBindGroupInput, depthTextureBindGroupInput, samplerBindGroupInput, offsetBindGroupInput]);


    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(vertices, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: texCoordBuffer, layout: texCoordBufferLayout } = this._createSingleAttributeVertexBuffer(texCoords, { format: "float32x2", offset: 0, shaderLocation: 1 }, 2 * Float32Array.BYTES_PER_ELEMENT);

    const render = async (offset: number[]) => {
 
      const offsetUnifromBufferUpdate = this._createGPUBuffer(new Float32Array(offset), GPUBufferUsage.COPY_SRC);

      const commandEncoder = this._device.createCommandEncoder();

      commandEncoder.copyBufferToBuffer(offsetUnifromBufferUpdate, 0, offsetUnifromBuffer, 0, 2 * Float32Array.BYTES_PER_ELEMENT);
      const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(this._context.getCurrentTexture(), {r: 1.0, g: 0.0, b: 0.0, a: 1.0}, this._msaa));
      passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
      passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, texCoordBufferLayout], [uniformBindGroupLayout], "bgra8unorm"));
      passEncoder.setVertexBuffer(0, positionBuffer);
      passEncoder.setVertexBuffer(1, texCoordBuffer);
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.draw(vertexCount, instanceCount);
      passEncoder.end();

      this._device.queue.submit([commandEncoder.finish()]);
      await this._device.queue.onSubmittedWorkDone();
      offsetUnifromBufferUpdate.destroy();
    }

    this._canvas.addEventListener("mousemove", (event) => {
      const rect = this._canvas.getBoundingClientRect();
      const mousePos = {x: (event.clientX - rect.left) / (rect.right - rect.left) * this._canvas.width, y: (event.clientY - rect.top) / (rect.bottom - rect.top) * this._canvas.height};
      const offset  = { x: mousePos.x * 2.0 / this._canvas.width - 1.0, y: mousePos.y * 2.0 / this._canvas.height - 1.0 };

      render([offset.x * 0.01, offset.y * 0.01]);
    });
    
    requestAnimationFrame(() => render([0.0, 0.0]));
  }
}


class VideoLoader {
  private _videoElement: HTMLVideoElement;

  public static async create(videoUrl: string): Promise<VideoLoader> { 
    const videoElement = document.createElement("video");
    videoElement.playsInline = true;
    videoElement.muted = true;
    videoElement.loop = true;

    const videoReadyPromise = new Promise<void>((resolve) => {
      let playing = false;
      let timeUpdated = false;

      videoElement.addEventListener("playing", () => {
        playing = true;
        if (playing && timeUpdated) {
          resolve();
        }
      });

      videoElement.addEventListener("timeupdate", () => {
        timeUpdated = true;
        if (playing && timeUpdated) {
          resolve();
        }
      });
    });

    videoElement.src = videoUrl;
    videoElement.play();

    await videoReadyPromise;

    return new VideoLoader(videoElement);
  }

  constructor(videoElement: HTMLVideoElement) {
    this._videoElement = videoElement;
  }

  get videoElement(): HTMLVideoElement {
    return this._videoElement;
  }
}

class ObjDataExtractor {
  private _vertexPositions: Float32Array;
  private _indices: Uint16Array;
  private _normals: Float32Array;
  constructor(objText: String) {
    const objFileParser = new ObjFileParser(objText);
    const objFile = objFileParser.parse();
    this._vertexPositions = new Float32Array(objFile.models[0].vertices.flatMap(v => [v.x, v.y, v.z]));

    const indices: number[] = [];
    const normals: number[] = Array(this._vertexPositions.length).fill(0);
    for (const face of objFile.models[0].faces) {
      let points = [];
      let facet_indices = [];
      for (const v of face.vertices) {
        const index = v.vertexIndex - 1;
        indices.push(index);

        const vertex = glMatrix.vec3.fromValues(this._vertexPositions[index * 3], this._vertexPositions[index * 3 + 1], this._vertexPositions[index * 3 + 2]);
        points.push(vertex);
        facet_indices.push(index);
      }

      const v1 = glMatrix.vec3.subtract(glMatrix.vec3.create(), points[1], points[0]);
      const v2 = glMatrix.vec3.subtract(glMatrix.vec3.create(), points[2], points[0]);
      const cross = glMatrix.vec3.cross(glMatrix.vec3.create(), v1, v2);
      const normal = glMatrix.vec3.normalize(glMatrix.vec3.create(), cross);

      for (let i  of facet_indices) {
        normals[i*3] += normal[0];
        normals[i*3 + 1] += normal[1];
        normals[i*3 + 2] += normal[2];
      }
    }
    this._normals = new Float32Array(normals);

    this._indices = new Uint16Array(indices);
  }

  public get vertexPositions(): Float32Array {
    return this._vertexPositions;
  }

  public get indices(): Uint16Array {
    return this._indices;
  }

  public get normals(): Float32Array {
    return this._normals;
  }
}