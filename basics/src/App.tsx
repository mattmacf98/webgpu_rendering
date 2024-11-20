import { useEffect, useRef } from "react";
import triangleWgsl from "./shaders/triangle.wgsl?raw";
import textureWgsl from "./shaders/textured_shape.wgsl?raw";
import depthTestingWgsl from "./shaders/depth_testing.wgsl?raw";
import objModelWgsl from "./shaders/obj_model.wgsl?raw";
import * as glMatrix from "gl-matrix";
import ObjFileParser from "obj-file-parser";

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

    const primitiveState: GPUPrimitiveState = {
      topology: 'triangle-list' as GPUPrimitiveTopology,
      frontFace: 'ccw' as GPUFrontFace,
      cullMode: 'none' as GPUCullMode,
    }
    const depthStencilState: GPUDepthStencilState = {
      depthWriteEnabled: true,
      depthCompare: 'less' as GPUCompareFunction,
      format: 'depth24plus-stencil8' as GPUTextureFormat,
    }
    webGpuContext.instance!.render_obj_model(objModelWgsl, "teapot.obj", Float32Array.from(modelViewMatrix), Float32Array.from(projectionMatrix),
      Float32Array.from(normalMatrix), Float32Array.from(lightDirection), Float32Array.from(viewDirection), primitiveState, depthStencilState, 4);
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

  private _createRenderTarget(depthTexture?: GPUTexture, msaa?: number): GPURenderPassDescriptor {
    const colorTexture = this._context.getCurrentTexture();
    const colorTextureView = colorTexture.createView();

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
        resolveTarget: colorTextureView,
        clearValue: { r: 1, g: 0, b: 0, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      }
    } else {
      colorAttachment = {
        view: colorTextureView,
        clearValue: { r: 1, g: 0, b: 0, a: 1 },
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

  private _createPipeline(shaderModule: GPUShaderModule, vertexBuffers: GPUVertexBufferLayout[], uniformBindGroups: GPUBindGroupLayout[], 
    primitiveState: GPUPrimitiveState, depthStencilState?: GPUDepthStencilState, msaa?: number): GPURenderPipeline {
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
      primitive: primitiveState,
      depthStencil: depthStencilState,
      multisample: msaa ? { count: msaa} : undefined
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

  private _createDepthTexture(msaa?: number): GPUTexture {
    const depthTextureDesc: GPUTextureDescriptor = {
      size: { width: this._canvas.width, height: this._canvas.height },
      dimension: '2d',
      sampleCount: msaa,
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT 
    };

    const depthTexture = this._device.createTexture(depthTextureDesc);
    return depthTexture;
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

  public render_vertex_color_offset(shaderCode: string, vertexCount: number, instanceCount: number, vertices: Float32Array, colors: Float32Array, offset: Float32Array, primitiveState: GPUPrimitiveState) {

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
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, colorBufferLayout], [uniformBindGroupLayout], primitiveState));
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, colorBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(vertexCount, instanceCount);
    passEncoder.end();

    this._device.queue.submit([commandEncoder.finish()]);
  }

  public async render_textured_shape(shaderCode: string, vertexCount: number, instanceCount: number, vertices: Float32Array, texCoords: Float32Array,
    transformationMatrix: Float32Array, projectionMatrix: Float32Array, imgUri: string, primitiveState: GPUPrimitiveState) {
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
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, texCoordBufferLayout], [uniformBindGroupLayout], primitiveState));
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, texCoordBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(vertexCount, instanceCount);
    passEncoder.end();

    this._device.queue.submit([commandEncoder.finish()]);
  }

  public render_depth_testing(shaderCode: string, vertexCount: number, instanceCount: number, vertices: Float32Array, transformationMatrix: Float32Array, projectionMatrix: Float32Array, primitiveState: GPUPrimitiveState, depthStencilState: GPUDepthStencilState) {
    const depthTexture = this._createDepthTexture();

    const transformationMatrixBuffer = this._createGPUBuffer(transformationMatrix, GPUBufferUsage.UNIFORM);
    const projectionMatrixBuffer = this._createGPUBuffer(projectionMatrix, GPUBufferUsage.UNIFORM);

    const transformationMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      buffer: transformationMatrixBuffer,
    }
    const projectionMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      buffer: projectionMatrixBuffer,
    }
  
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([transformationMatrixBindGroupInput, projectionMatrixBindGroupInput]);

    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(vertices, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);

    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(depthTexture));
    passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout], [uniformBindGroupLayout], primitiveState, depthStencilState));
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(vertexCount, instanceCount);
    passEncoder.end();

    this._device.queue.submit([commandEncoder.finish()]);
  }

  public async render_obj_model(shaderCode: string, objFilePath: string, transformationMatrix: Float32Array, projectionMatrix: Float32Array, normalMatrix: Float32Array, 
    lightDirection: Float32Array, viewDirection: Float32Array, primitiveState: GPUPrimitiveState, depthStencilState: GPUDepthStencilState, msaa: number) {
    const objResponse = await fetch(objFilePath);
    const objBlob = await objResponse.blob();
    const objText = await objBlob.text();
    const objDataExtractor = new ObjDataExtractor(objText);

    const depthTexture = this._createDepthTexture(msaa);

    const transformationMatrixBuffer = this._createGPUBuffer(transformationMatrix, GPUBufferUsage.UNIFORM);
    const projectionMatrixBuffer = this._createGPUBuffer(projectionMatrix, GPUBufferUsage.UNIFORM);
    const normalMatrixBuffer = this._createGPUBuffer(normalMatrix, GPUBufferUsage.UNIFORM);
    const lightDirectionBuffer = this._createGPUBuffer(lightDirection, GPUBufferUsage.UNIFORM);
    const viewDirectionBuffer = this._createGPUBuffer(viewDirection, GPUBufferUsage.UNIFORM);

    const transformationMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      buffer: transformationMatrixBuffer,
    }
    const projectionMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      buffer: projectionMatrixBuffer,
    }
    const normalMatrixBindGroupInput: IBindGroupInput = {
      type: "buffer",
      buffer: normalMatrixBuffer,
    }
    const lightDirectionBindGroupInput: IBindGroupInput = { 
      type: "buffer",
      buffer: lightDirectionBuffer,
    }
    const viewDirectionBindGroupInput: IBindGroupInput = {
      type: "buffer",
      buffer: viewDirectionBuffer,
    }
  
    const { bindGroupLayout: uniformBindGroupLayout, bindGroup: uniformBindGroup } = this._createUniformBindGroup([transformationMatrixBindGroupInput, projectionMatrixBindGroupInput, normalMatrixBindGroupInput, lightDirectionBindGroupInput, viewDirectionBindGroupInput]);

    const { buffer: positionBuffer, layout: positionBufferLayout } = this._createSingleAttributeVertexBuffer(objDataExtractor.vertexPositions, { format: "float32x3", offset: 0, shaderLocation: 0 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const { buffer: normalBuffer, layout: normalBufferLayout } = this._createSingleAttributeVertexBuffer(objDataExtractor.normals, { format: "float32x3", offset: 0, shaderLocation: 1 }, 3 * Float32Array.BYTES_PER_ELEMENT);
    const indexBuffer = this._createGPUBuffer(objDataExtractor.indices, GPUBufferUsage.INDEX);
   
    const commandEncoder = this._device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(this._createRenderTarget(depthTexture, msaa));
    passEncoder.setViewport(0, 0, this._canvas.width, this._canvas.height, 0, 1);
    passEncoder.setPipeline(this._createPipeline(this._createShaderModule(shaderCode), [positionBufferLayout, normalBufferLayout], [uniformBindGroupLayout], primitiveState, depthStencilState, msaa));
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, normalBuffer);
    passEncoder.setIndexBuffer(indexBuffer, "uint16");
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.drawIndexed(objDataExtractor.indices.length, 1, 0, 0, 0);
    passEncoder.end();

    this._device.queue.submit([commandEncoder.finish()]);
  }

  private constructor(context: GPUCanvasContext, device: GPUDevice, canvas: HTMLCanvasElement) {
    this._context = context;
    this._device = device;
    this._canvas = canvas;
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