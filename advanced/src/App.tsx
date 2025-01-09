import { useEffect } from "react"
import { Controls } from "./controls/Controls";
import { Arcball } from "./controls/ArcBall";
import { createGPUBuffer } from "./meshes/Utils";
import * as glMatrix from "gl-matrix";
import { Stencil } from "./meshes/stencil/Stencil";
import { Plane } from "./meshes/stencil/Plane";
import { Frame } from "./meshes/stencil/Frame";
import { Teapot } from "./meshes/stencil/Teapot";
import { Teapot as ShadowTeapot} from "./meshes/shadowmap/Teapot";
import { Plane as ShadowPlane } from "./meshes/shadowmap/Plane";
import { Teapot as ToonTeapot } from "./meshes/toon/Teapot";
import { Teapot as TransparentTeapot } from "./meshes/transparency/Teapot";
import objModelWgsl from "./shaders/object_shader.wgsl?raw";
import stencilWgsl from "./shaders/stencil_shader.wgsl?raw";
import shadowObjModelWgsl from "./shaders/object_with_shadow_shader.wgsl?raw";
import shadowLightWgsl from "./shaders/light_view_shader.wgsl?raw";
import toonObjModelWgsl from "./shaders/object_toon_shader.wgsl?raw";
import outlineShader from "./shaders/outline_shader.wgsl?raw";
import skyBoxShader from "./shaders/skybox_shader.wgsl?raw";
import finalBlendShader from "./shaders/final_blend_shader.wgsl?raw";
import blendShader from "./shaders/blend_shader.wgsl?raw";
import transparencyObjModelWgsl from "./shaders/object_transparency_shader.wgsl?raw";
import { Skybox } from "./meshes/skybox";
import { Pipeline } from "./meshes/transparency/Pipeline";
import { Final } from "./meshes/transparency/Final";
import { Blend } from "./meshes/transparency/Blend";

const App = () => {
  useEffect(() => {
    renderTransparencyExample()
  }, [])

  return (
    <canvas id="canvas" width="640" height="480" style={{width: "100%", height: "100%"}}></canvas>
  )
}

const renderTransparencyExample = async () => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu");
  const canvasConfig: GPUCanvasConfiguration = {
    device: device!,
    format: navigator.gpu.getPreferredCanvasFormat() as GPUTextureFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    alphaMode: "opaque",
  }
  context!.configure(canvasConfig);
  let angle = 0.0;

  const arcball = new Arcball(5.0);
  const modelViewMatrix = arcball.getMatrices();
  const modelViewMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const viewDir = glMatrix.vec3.fromValues(-10.0, -10.0, -10.0);
  const viewDirectionUniformBuffer = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  const lightDirectionBuffer = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const modelViewMatrixInverse = glMatrix.mat4.invert(glMatrix.mat4.create(), modelViewMatrix)!;
  const normalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), modelViewMatrixInverse);
  const normalMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(normalMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, canvas.width / canvas.height, 0.1, 1000.0);
  const projectionMatrixUnifromBuffer = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const pipeline = await Pipeline.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer, transparencyObjModelWgsl);
  const teapot = await TransparentTeapot.init(device!, pipeline);
  const final = await Final.init(device!, finalBlendShader);
  const blend =  await Blend.init(device!, blendShader);

  let depthTexture0: GPUTexture | null = null;
  let depthStencilAttachment0: GPURenderPassDepthStencilAttachment | undefined = undefined;

  let depthTexture1: GPUTexture | null = null;
  let depthStencilAttachment1: GPURenderPassDepthStencilAttachment | undefined = undefined;

  let dstTexture: GPUTexture | null = null;
  let colorTextureForCleanup: GPUTexture | null = null;

  async function render() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    let currentCanvasWidth = canvas.clientWidth * devicePixelRatio;
    let currentCanvasHeight = canvas.clientHeight * devicePixelRatio;

    let projectionMatrixUniformBufferUpdate = null;
    let colorTextureForDebugging: GPUTexture | null = null;

    if (currentCanvasWidth != canvas.width || currentCanvasHeight != canvas.height || colorTextureForDebugging == null || dstTexture == null || depthTexture0 == null || depthTexture1 ==  null) {
      canvas.width = currentCanvasWidth;
      canvas.height = currentCanvasHeight;

      if (depthTexture0 !== null) {
          depthTexture0.destroy();
      }

      if (depthTexture1 !== null) {
        depthTexture1.destroy();
      }

      const depthTextureDesc: GPUTextureDescriptor = {
          size: [canvas.width, canvas.height, 1],
          dimension: '2d',
          format: 'depth32float',
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
      };

      depthTexture0 = device!.createTexture(depthTextureDesc);
      depthTexture0.label = "DEPTH_0"
      depthTexture1 = device!.createTexture(depthTextureDesc);
      depthTexture1.label = "DEPTH_1"

      pipeline.updateDepthPeelingUniformGroup(device!, depthTexture0, depthTexture1);


      depthStencilAttachment0 = {
          view: depthTexture1.createView(),
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store'
      };

      depthStencilAttachment1 = {
        view: depthTexture0.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      };

      let projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(),
          1.4, canvas.width / canvas.height, 0.1, 1000.0);

      projectionMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.COPY_SRC);

      const colorTextureForDstDesc: GPUTextureDescriptor = {
        size: [canvas.width, canvas.height, 1],
        dimension: '2d',
        format: 'bgra8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
      };

      if (colorTextureForCleanup !== null) {
        colorTextureForCleanup.destroy();
      }

      colorTextureForDebugging = device!.createTexture(colorTextureForDstDesc);
      colorTextureForDebugging.label ="DEBUG_TEXTURE";
      colorTextureForCleanup = colorTextureForDebugging;

      if (dstTexture !== null) {
        dstTexture.destroy();
      }

      dstTexture = device!.createTexture(colorTextureForDstDesc);
      dstTexture.label ="DEST_TEXTURE";

      blend.updateTexture(device!, colorTextureForDebugging);
      final.updateTexture(device!, dstTexture);
    }

    const modelViewMatrix = arcball.getMatrices();
    const modelViewMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.COPY_SRC);

    const modelViewMatrixInverse = glMatrix.mat4.invert(glMatrix.mat4.create(), modelViewMatrix);
    const normalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), modelViewMatrixInverse);
    const normalMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(normalMatrix), GPUBufferUsage.COPY_SRC);

    const viewDir = glMatrix.vec3.fromValues(-arcball.forward[0], -arcball.forward[1], -arcball.forward[2]);
    const viewDirectionUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.COPY_SRC);

    const lightDir = glMatrix.vec3.fromValues(Math.cos(angle) * 8.0, Math.sin(angle) * 8.0, 10);
    const lightDirectionBufferUpdate = createGPUBuffer(device!, new Float32Array(lightDir), GPUBufferUsage.COPY_SRC);

    const colorTexture = context!.getCurrentTexture();
    const colorTextureView = colorTexture.createView();

    const colorAttachment0: GPURenderPassColorAttachment = {
      view: colorTextureForDebugging!.createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: 'clear',
      storeOp: 'store'
    };

    const colorAttachment1: GPURenderPassColorAttachment = {
      view: colorTextureForDebugging!.createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: 'clear',
      storeOp: 'store'
    };

    const cleanUpColorAttachment: GPURenderPassColorAttachment ={
        view: dstTexture!.createView(),
        clearValue: {r: 0, g: 0, b: 0, a: 1},
        loadOp: 'clear',
        storeOp: 'store'
    }

    const blendColorAttachment: GPURenderPassColorAttachment ={
      view: dstTexture!.createView(),
      clearValue: {r: 0, g: 0, b: 0, a: 0},
      loadOp: 'load',
      storeOp: 'store'
    }

    const finalColorAttachment: GPURenderPassColorAttachment ={
      view: colorTextureView,
      clearValue: {r: 0, g: 0, b: 0, a: 1},
      loadOp: 'load',
      storeOp: 'store'
    }

    const renderPassCleanupDesc: GPURenderPassDescriptor = {
      colorAttachments: [cleanUpColorAttachment]
    };

    const renderPassDesc0: GPURenderPassDescriptor =  {
      colorAttachments: [colorAttachment0],
      depthStencilAttachment: depthStencilAttachment0
    }

    const renderPassDesc1: GPURenderPassDescriptor =  {
      colorAttachments: [colorAttachment1],
      depthStencilAttachment: depthStencilAttachment1
    }

    const renderPassBlend: GPURenderPassDescriptor = {
      colorAttachments: [blendColorAttachment]
    }

    const renderPassFinal: GPURenderPassDescriptor = {
      colorAttachments: [finalColorAttachment]
    }

    const commandEncoder = device!.createCommandEncoder();
    if (projectionMatrixUniformBufferUpdate != null) {
      commandEncoder.copyBufferToBuffer(projectionMatrixUniformBufferUpdate, 0, projectionMatrixUnifromBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    }
    commandEncoder.copyBufferToBuffer(modelViewMatrixUniformBufferUpdate, 0, modelViewMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(normalMatrixUniformBufferUpdate, 0, normalMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(viewDirectionUniformBufferUpdate, 0, viewDirectionUniformBuffer, 0, 3 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(lightDirectionBufferUpdate, 0, lightDirectionBuffer, 0, 3 * Float32Array.BYTES_PER_ELEMENT);

    const passEncoderCleanup = commandEncoder.beginRenderPass(renderPassCleanupDesc);
    passEncoderCleanup.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    passEncoderCleanup.end();

    for (let p = 0; p < 6; p++) {
      const passEncoder0 = p % 2 == 0 ? commandEncoder.beginRenderPass(renderPassDesc0) : commandEncoder.beginRenderPass(renderPassDesc1);
      passEncoder0.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
      teapot.encodeRenderPass(passEncoder0, pipeline, p);
      passEncoder0.end()

      const passEncoder1 = commandEncoder.beginRenderPass(renderPassBlend);
      passEncoder1.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
      blend.encodeRenderPass(passEncoder1);
      passEncoder1.end()
    }
    
    const finalEncoder = commandEncoder.beginRenderPass(renderPassFinal);
    final.encodeRenderPass(finalEncoder);
    finalEncoder.end();

    device!.queue.submit([commandEncoder.finish()]);
    await device!.queue.onSubmittedWorkDone();

    if (projectionMatrixUniformBufferUpdate) {
      projectionMatrixUniformBufferUpdate.destroy();
    }
    modelViewMatrixUniformBufferUpdate.destroy();
    normalMatrixUniformBufferUpdate.destroy();
    viewDirectionUniformBufferUpdate.destroy();
    lightDirectionBufferUpdate.destroy();

    angle += 0.01;
    requestAnimationFrame(render);
  }

  new Controls(canvas, arcball, render);
  requestAnimationFrame(render);
}

const renderSkyboxExample = async () => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu");
  const canvasConfig: GPUCanvasConfiguration = {
    device: device!,
    format: navigator.gpu.getPreferredCanvasFormat() as GPUTextureFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    alphaMode: "opaque",
  }
  context!.configure(canvasConfig);
  let angle = 0.0;

  const arcball = new Arcball(15.0);
  const modelViewMatrix = arcball.getMatrices();
  const modelViewMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, canvas.width / canvas.height, 0.1, 1000.0);
  const projectionMatrixUnifromBuffer = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const skybox = await Skybox.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, skyBoxShader);

  let depthTexture: GPUTexture | null = null;
  let depthStencilAttachment: GPURenderPassDepthStencilAttachment | undefined = undefined;

  async function render() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    let currentCanvasWidth = canvas.clientWidth * devicePixelRatio;
    let currentCanvasHeight = canvas.clientHeight * devicePixelRatio;

    let projectionMatrixUniformBufferUpdate = null;

    if (currentCanvasWidth != canvas.width || currentCanvasHeight != canvas.height) {
      canvas.width = currentCanvasWidth;
      canvas.height = currentCanvasHeight;

      if (depthTexture !== null) {
          depthTexture.destroy();
      }

      const depthTextureDesc: GPUTextureDescriptor = {
          size: [canvas.width, canvas.height, 1],
          dimension: '2d',
          format: 'depth32float',
          usage: GPUTextureUsage.RENDER_ATTACHMENT
      };

      depthTexture = device!.createTexture(depthTextureDesc);
      let depthTextureView = depthTexture.createView();

      depthStencilAttachment = {
          view: depthTextureView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store'
      };

      let projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(),
          1.4, canvas.width / canvas.height, 0.1, 1000.0);

      projectionMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.COPY_SRC);
    }

    const modelViewMatrix = arcball.getMatrices();
    const modelViewMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.COPY_SRC);

    const colorTexture = context!.getCurrentTexture();
    const colorTextureView = colorTexture.createView();

    const colorAttachment: GPURenderPassColorAttachment = {
      view: colorTextureView,
      clearValue: { r: 1, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store'
    };

    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment],
      depthStencilAttachment: depthStencilAttachment
    };

    const commandEncoder = device!.createCommandEncoder();
    if (projectionMatrixUniformBufferUpdate != null) {
      commandEncoder.copyBufferToBuffer(projectionMatrixUniformBufferUpdate, 0, projectionMatrixUnifromBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    }
    commandEncoder.copyBufferToBuffer(modelViewMatrixUniformBufferUpdate, 0, modelViewMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);

    const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
    passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1)
    skybox.encodeRenderPass(passEncoder);
    passEncoder.end()

    device!.queue.submit([commandEncoder.finish()]);
    await device!.queue.onSubmittedWorkDone();

    if (projectionMatrixUniformBufferUpdate) {
      projectionMatrixUniformBufferUpdate.destroy();
    }
    modelViewMatrixUniformBufferUpdate.destroy();

    angle += 0.01;
    requestAnimationFrame(render);
  }

  new Controls(canvas, arcball, render);
  requestAnimationFrame(render);
}

const renderToonShaderExample = async () => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu");
  const canvasConfig: GPUCanvasConfiguration = {
    device: device!,
    format: navigator.gpu.getPreferredCanvasFormat() as GPUTextureFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    alphaMode: "opaque",
  }
  context!.configure(canvasConfig);
  let angle = 0.0;

  const sampler: GPUSampler = device!.createSampler({
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
    magFilter: 'linear',
    minFilter: 'linear',
    compare: 'less'
  });

  const lightDepthTextureDesc: GPUTextureDescriptor = {
    size: [1024, 1024, 1],
    dimension: '2d',
    format: "depth32float",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
  }
  const ligthDepthTexture: GPUTexture = device!.createTexture(lightDepthTextureDesc);

  const arcball = new Arcball(15.0);
  const modelViewMatrix = arcball.getMatrices();
  const modelViewMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const viewDir = glMatrix.vec3.fromValues(-10.0, -10.0, -10.0);
  const viewDirectionUniformBuffer = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  const lightDirectionBuffer = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const modelViewMatrixInverse = glMatrix.mat4.invert(glMatrix.mat4.create(), modelViewMatrix)!;
  const normalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), modelViewMatrixInverse);
  const normalMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(normalMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, canvas.width / canvas.height, 0.1, 1000.0);
  const projectionMatrixUnifromBuffer = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const lightProjectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), Math.acos(0.9) * 2.0, 1.0, 1.0, 100.0);
  const lightProjectionMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(lightProjectionMatrix), GPUBufferUsage.UNIFORM);
  const lightModelViewMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const screenDim = new Float32Array([canvas.width, canvas.height]);
  const screenDimUniformBuffer = createGPUBuffer(device!, screenDim, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const teapot = await ToonTeapot.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer, ligthDepthTexture, sampler, 
    lightModelViewMatrixUniformBuffer, lightProjectionMatrixUniformBuffer, screenDimUniformBuffer, toonObjModelWgsl, shadowLightWgsl, outlineShader);

  const plane = await ShadowPlane.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer, ligthDepthTexture,
    sampler, lightModelViewMatrixUniformBuffer, lightProjectionMatrixUniformBuffer, shadowObjModelWgsl);

  const lightDepthAttachment: GPURenderPassDepthStencilAttachment = {
    view: ligthDepthTexture.createView(),
    depthClearValue: 1,
    depthLoadOp: 'clear',
    depthStoreOp: 'store'
  };

  const lightColorTextureDesc: GPUTextureDescriptor = {
    size: [1024, 1024, 1],
    dimension: "2d",
    format: 'bgra8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  }

  const ligthColorTexture: GPUTexture = device!.createTexture(lightColorTextureDesc);

  const lightColorAttachment: GPURenderPassColorAttachment = {
    view: ligthColorTexture.createView(),
    clearValue: {r: 1, g: 0, b: 0, a: 1},
    loadOp: "load",
    storeOp: "store"
  }

  const lightRenderPassDesc: GPURenderPassDescriptor = {
    colorAttachments: [lightColorAttachment],
    depthStencilAttachment: lightDepthAttachment
  }

  const copiedBuffer = createGPUBuffer(device!, new Float32Array(1024 * 1024), GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);

  let depthTexture: GPUTexture | null = null;
  let depthStencilAttachment: GPURenderPassDepthStencilAttachment | undefined = undefined;

  async function render() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    let currentCanvasWidth = canvas.clientWidth * devicePixelRatio;
    let currentCanvasHeight = canvas.clientHeight * devicePixelRatio;

    let projectionMatrixUniformBufferUpdate = null;

    if (currentCanvasWidth != canvas.width || currentCanvasHeight != canvas.height) {
      canvas.width = currentCanvasWidth;
      canvas.height = currentCanvasHeight;

      if (depthTexture !== null) {
          depthTexture.destroy();
      }

      const depthTextureDesc: GPUTextureDescriptor = {
          size: [canvas.width, canvas.height, 1],
          dimension: '2d',
          format: 'depth32float',
          usage: GPUTextureUsage.RENDER_ATTACHMENT
      };

      depthTexture = device!.createTexture(depthTextureDesc);
      let depthTextureView = depthTexture.createView();

      depthStencilAttachment = {
          view: depthTextureView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store'
      };

      let projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(),
          1.4, canvas.width / canvas.height, 0.1, 1000.0);

      projectionMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.COPY_SRC);
    }

    const modelViewMatrix = arcball.getMatrices();
    const modelViewMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.COPY_SRC);
    const modelViewMatrixInverse = glMatrix.mat4.invert(glMatrix.mat4.create(), modelViewMatrix)!;
    const normalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), modelViewMatrixInverse);
    const normalMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(normalMatrix), GPUBufferUsage.COPY_SRC);

    const viewDir = glMatrix.vec3.fromValues(-arcball.forward[0], -arcball.forward[1], -arcball.forward[2]);
    const viewDirectionUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.COPY_SRC);

    const lightDir = glMatrix.vec3.fromValues(Math.cos(angle) * 8.0, Math.sin(angle) * 8.0, 10);
    const lightDirectionBufferUpdate = createGPUBuffer(device!, new Float32Array(lightDir), GPUBufferUsage.COPY_SRC);

    let lightModelViewMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(),
    glMatrix.vec3.fromValues(Math.cos(angle) * 8.0, Math.sin(angle) * 8.0, 10),
    glMatrix.vec3.fromValues(0, 0, 0), glMatrix.vec3.fromValues(0.0, 0.0, 1.0));
    const lightModelViewMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(lightModelViewMatrix), GPUBufferUsage.COPY_SRC);


    const colorTexture = context!.getCurrentTexture();
    const colorTextureView = colorTexture.createView();

    const colorAttachment: GPURenderPassColorAttachment = {
      view: colorTextureView,
      clearValue: { r: 1, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store'
    };

    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment],
      depthStencilAttachment: depthStencilAttachment
    };

    const commandEncoder = device!.createCommandEncoder();
    if (projectionMatrixUniformBufferUpdate != null) {
      commandEncoder.copyBufferToBuffer(projectionMatrixUniformBufferUpdate, 0, projectionMatrixUnifromBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    }
    commandEncoder.copyBufferToBuffer(lightModelViewMatrixUniformBufferUpdate, 0,lightModelViewMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(modelViewMatrixUniformBufferUpdate, 0, modelViewMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(normalMatrixUniformBufferUpdate, 0, normalMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(viewDirectionUniformBufferUpdate, 0, viewDirectionUniformBuffer, 0, 3 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(lightDirectionBufferUpdate, 0, lightDirectionBuffer, 0, 3 * Float32Array.BYTES_PER_ELEMENT);

    const lightPassEncoder = commandEncoder.beginRenderPass(lightRenderPassDesc);
    lightPassEncoder.setViewport(0, 0, 1024, 1024, 0, 1);
    teapot.encodeLightRenderPass(lightPassEncoder);
    lightPassEncoder.end();
    commandEncoder.copyTextureToBuffer({texture: ligthDepthTexture, origin: {x: 0, y:0}}, {buffer: copiedBuffer, bytesPerRow: 1024 * 4}, {width: 1024, height: 1024});

    const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
    passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    teapot.encodeRenderPass(passEncoder);
    plane.encodeRenderPass(passEncoder);
    passEncoder.end()

    device!.queue.submit([commandEncoder.finish()]);
    await device!.queue.onSubmittedWorkDone();

    if (projectionMatrixUniformBufferUpdate) {
      projectionMatrixUniformBufferUpdate.destroy();
    }
    modelViewMatrixUniformBufferUpdate.destroy();
    normalMatrixUniformBufferUpdate.destroy();
    viewDirectionUniformBufferUpdate.destroy();
    lightDirectionBufferUpdate.destroy();
    lightModelViewMatrixUniformBufferUpdate.destroy();
    angle += 0.01;
    requestAnimationFrame(render);
  }

  new Controls(canvas, arcball, render);
  requestAnimationFrame(render);
}

const renderShadowExample = async () => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu");
  const canvasConfig: GPUCanvasConfiguration = {
    device: device!,
    format: navigator.gpu.getPreferredCanvasFormat() as GPUTextureFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    alphaMode: "opaque",
  }
  context!.configure(canvasConfig);
  let angle = 0.0;

  const sampler: GPUSampler = device!.createSampler({
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
    magFilter: 'linear',
    minFilter: 'linear',
    compare: 'less'
  });

  const lightDepthTextureDesc: GPUTextureDescriptor = {
    size: [1024, 1024, 1],
    dimension: '2d',
    format: "depth32float",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
  }
  const ligthDepthTexture: GPUTexture = device!.createTexture(lightDepthTextureDesc);

  const arcball = new Arcball(15.0);
  const modelViewMatrix = arcball.getMatrices();
  const modelViewMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const viewDir = glMatrix.vec3.fromValues(-10.0, -10.0, -10.0);
  const viewDirectionUniformBuffer = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  const lightDirectionBuffer = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const modelViewMatrixInverse = glMatrix.mat4.invert(glMatrix.mat4.create(), modelViewMatrix)!;
  const normalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), modelViewMatrixInverse);
  const normalMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(normalMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, canvas.width / canvas.height, 0.1, 1000.0);
  const projectionMatrixUnifromBuffer = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const lightProjectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), Math.acos(0.9) * 2.0, 1.0, 1.0, 100.0);
  const lightProjectionMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(lightProjectionMatrix), GPUBufferUsage.UNIFORM);
  const lightModelViewMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const teapot = await ShadowTeapot.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer, ligthDepthTexture, sampler, 
    lightModelViewMatrixUniformBuffer, lightProjectionMatrixUniformBuffer, shadowObjModelWgsl, shadowLightWgsl);

  const plane = await ShadowPlane.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer, ligthDepthTexture,
    sampler, lightModelViewMatrixUniformBuffer, lightProjectionMatrixUniformBuffer, shadowObjModelWgsl);

  const lightDepthAttachment: GPURenderPassDepthStencilAttachment = {
    view: ligthDepthTexture.createView(),
    depthClearValue: 1,
    depthLoadOp: 'clear',
    depthStoreOp: 'store'
  };

  const lightColorTextureDesc: GPUTextureDescriptor = {
    size: [1024, 1024, 1],
    dimension: "2d",
    format: 'bgra8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  }

  const ligthColorTexture: GPUTexture = device!.createTexture(lightColorTextureDesc);

  const lightColorAttachment: GPURenderPassColorAttachment = {
    view: ligthColorTexture.createView(),
    clearValue: {r: 1, g: 0, b: 0, a: 1},
    loadOp: "load",
    storeOp: "store"
  }

  const lightRenderPassDesc: GPURenderPassDescriptor = {
    colorAttachments: [lightColorAttachment],
    depthStencilAttachment: lightDepthAttachment
  }

  const copiedBuffer = createGPUBuffer(device!, new Float32Array(1024 * 1024), GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);

  let depthTexture: GPUTexture | null = null;
  let depthStencilAttachment: GPURenderPassDepthStencilAttachment | undefined = undefined;

  async function render() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    let currentCanvasWidth = canvas.clientWidth * devicePixelRatio;
    let currentCanvasHeight = canvas.clientHeight * devicePixelRatio;

    let projectionMatrixUniformBufferUpdate = null;

    if (currentCanvasWidth != canvas.width || currentCanvasHeight != canvas.height) {
      canvas.width = currentCanvasWidth;
      canvas.height = currentCanvasHeight;

      if (depthTexture !== null) {
          depthTexture.destroy();
      }

      const depthTextureDesc: GPUTextureDescriptor = {
          size: [canvas.width, canvas.height, 1],
          dimension: '2d',
          format: 'depth32float',
          usage: GPUTextureUsage.RENDER_ATTACHMENT
      };

      depthTexture = device!.createTexture(depthTextureDesc);
      let depthTextureView = depthTexture.createView();

      depthStencilAttachment = {
          view: depthTextureView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store'
      };

      let projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(),
          1.4, canvas.width / canvas.height, 0.1, 1000.0);

      projectionMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.COPY_SRC);
    }

    const modelViewMatrix = arcball.getMatrices();
    const modelViewMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.COPY_SRC);
    const modelViewMatrixInverse = glMatrix.mat4.invert(glMatrix.mat4.create(), modelViewMatrix)!;
    const normalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), modelViewMatrixInverse);
    const normalMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(normalMatrix), GPUBufferUsage.COPY_SRC);

    const viewDir = glMatrix.vec3.fromValues(-arcball.forward[0], -arcball.forward[1], -arcball.forward[2]);
    const viewDirectionUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.COPY_SRC);

    const lightDir = glMatrix.vec3.fromValues(Math.cos(angle) * 8.0, Math.sin(angle) * 8.0, 10);
    const lightDirectionBufferUpdate = createGPUBuffer(device!, new Float32Array(lightDir), GPUBufferUsage.COPY_SRC);

    let lightModelViewMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(),
    glMatrix.vec3.fromValues(Math.cos(angle) * 8.0, Math.sin(angle) * 8.0, 10),
    glMatrix.vec3.fromValues(0, 0, 0), glMatrix.vec3.fromValues(0.0, 0.0, 1.0));
    const lightModelViewMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(lightModelViewMatrix), GPUBufferUsage.COPY_SRC);


    const colorTexture = context!.getCurrentTexture();
    const colorTextureView = colorTexture.createView();

    const colorAttachment: GPURenderPassColorAttachment = {
      view: colorTextureView,
      clearValue: { r: 1, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store'
    };

    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment],
      depthStencilAttachment: depthStencilAttachment
    };

    const commandEncoder = device!.createCommandEncoder();
    if (projectionMatrixUniformBufferUpdate != null) {
      commandEncoder.copyBufferToBuffer(projectionMatrixUniformBufferUpdate, 0, projectionMatrixUnifromBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    }
    commandEncoder.copyBufferToBuffer(lightModelViewMatrixUniformBufferUpdate, 0,lightModelViewMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(modelViewMatrixUniformBufferUpdate, 0, modelViewMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(normalMatrixUniformBufferUpdate, 0, normalMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(viewDirectionUniformBufferUpdate, 0, viewDirectionUniformBuffer, 0, 3 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(lightDirectionBufferUpdate, 0, lightDirectionBuffer, 0, 3 * Float32Array.BYTES_PER_ELEMENT);

    const lightPassEncoder = commandEncoder.beginRenderPass(lightRenderPassDesc);
    lightPassEncoder.setViewport(0, 0, 1024, 1024, 0, 1);
    teapot.encodeLightRenderPass(lightPassEncoder);
    lightPassEncoder.end();
    commandEncoder.copyTextureToBuffer({texture: ligthDepthTexture, origin: {x: 0, y:0}}, {buffer: copiedBuffer, bytesPerRow: 1024 * 4}, {width: 1024, height: 1024});

    const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
    passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    teapot.encodeRenderPass(passEncoder);
    plane.encodeRenderPass(passEncoder);
    passEncoder.end()

    device!.queue.submit([commandEncoder.finish()]);
    await device!.queue.onSubmittedWorkDone();

    if (projectionMatrixUniformBufferUpdate) {
      projectionMatrixUniformBufferUpdate.destroy();
    }
    modelViewMatrixUniformBufferUpdate.destroy();
    normalMatrixUniformBufferUpdate.destroy();
    viewDirectionUniformBufferUpdate.destroy();
    lightDirectionBufferUpdate.destroy();
    lightModelViewMatrixUniformBufferUpdate.destroy();
    angle += 0.01;
    requestAnimationFrame(render);
  }

  new Controls(canvas, arcball, render);
  requestAnimationFrame(render);
}

const renderDepthStencilExample = async () => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu");
  const canvasConfig: GPUCanvasConfiguration = {
    device: device!,
    format: navigator.gpu.getPreferredCanvasFormat() as GPUTextureFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    alphaMode: "opaque",
  }
  context!.configure(canvasConfig);
  let angle = 0.0;

  const arcball = new Arcball(6.0);
  const modelViewMatrix = arcball.getMatrices();
  const modelViewMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const viewDir = glMatrix.vec3.fromValues(-10.0, -10.0, -10.0);
  const viewDirectionUniformBuffer = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  const lightDirectionBuffer = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const modelViewMatrixInverse = glMatrix.mat4.invert(glMatrix.mat4.create(), modelViewMatrix)!;
  const normalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), modelViewMatrixInverse);
  const normalMatrixUniformBuffer = createGPUBuffer(device!, new Float32Array(normalMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, canvas.width / canvas.height, 0.1, 1000.0);
  const projectionMatrixUnifromBuffer = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const stencil = await Stencil.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, stencilWgsl);
  const plane = await Plane.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer, objModelWgsl);
  const frame = await Frame.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer, objModelWgsl);
  const teapot = await Teapot.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer, objModelWgsl);

  let depthTexture: GPUTexture | null = null;
  let depthStencilAttachmentOne: GPURenderPassDepthStencilAttachment | undefined = undefined;
  let depthStencilAttachmentTwo: GPURenderPassDepthStencilAttachment | undefined = undefined;

  async function render() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const currentCanvasHeight = canvas.clientHeight * devicePixelRatio;
    const currentCanvasWidth = canvas.clientWidth * devicePixelRatio;

    let projectionMatrixUniformBufferUpdate = null;

    // update projection and depth textures if canvas changes
    if (currentCanvasWidth != canvas.width || currentCanvasHeight != canvas.height) {
      canvas.width = currentCanvasWidth;
      canvas.height = currentCanvasHeight;

      if (depthTexture != null) {
        depthTexture.destroy();
      }

      depthTexture = device!.createTexture({
        size: [canvas.width, canvas.height, 1],
        dimension: "2d",
        format: "depth24plus-stencil8",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
      });
      const depthTextureView = depthTexture.createView();

      depthStencilAttachmentOne = {
        view: depthTextureView,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        stencilClearValue: 0,
        stencilLoadOp: "clear",
        stencilStoreOp: "store",
        stencilReadOnly: false
      };

      depthStencilAttachmentTwo = {
          view: depthTextureView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
          stencilClearValue: 0,
          stencilReadOnly: true
      };

      const projectionMatrix = glMatrix.mat4.perspective(glMatrix.mat4.create(), 1.4, canvas.width / canvas.height, 0.1, 1000.0);
      projectionMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(projectionMatrix), GPUBufferUsage.COPY_SRC);
    }

    // handle arcball movement
    const modelViewMatrix = arcball.getMatrices();
    const modelViewMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(modelViewMatrix), GPUBufferUsage.COPY_SRC);
    const modelViewMatrixInverse = glMatrix.mat4.invert(glMatrix.mat4.create(), modelViewMatrix)!;
    const normalMatrix = glMatrix.mat4.transpose(glMatrix.mat4.create(), modelViewMatrixInverse);
    const normalMatrixUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(normalMatrix), GPUBufferUsage.COPY_SRC);

    const viewDir = glMatrix.vec3.fromValues(-arcball.forward[0], -arcball.forward[1], -arcball.forward[2]);
    const viewDirectionUniformBufferUpdate = createGPUBuffer(device!, new Float32Array(viewDir), GPUBufferUsage.COPY_SRC);

    const lightDir = glMatrix.vec3.fromValues(Math.cos(angle) * 8.0, Math.sin(angle) * 8.0, 10);
    const lightDirectionBufferUpdate = createGPUBuffer(device!, new Float32Array(lightDir), GPUBufferUsage.COPY_SRC);

    const colorTexture = context!.getCurrentTexture();
    const colorTextureView = colorTexture.createView();

    let colorAttachmentOne: GPURenderPassColorAttachment = {
      view: colorTextureView,
      clearValue: { r: 1, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store'
    };
    let colorAttachmentTwo: GPURenderPassColorAttachment = {
        view: colorTextureView,
        clearValue: { r: 0, g: 0, b: 1, a: 1 },
        loadOp: 'load',
        storeOp: 'store'
    };

    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachmentOne],
      depthStencilAttachment: depthStencilAttachmentOne
    };
    const renderPassDesc2: GPURenderPassDescriptor = {
        colorAttachments: [colorAttachmentTwo],
        depthStencilAttachment: depthStencilAttachmentTwo
    };

    const commandEncoder = device!.createCommandEncoder();

    if (projectionMatrixUniformBufferUpdate != null) {
      commandEncoder.copyBufferToBuffer(projectionMatrixUniformBufferUpdate, 0, projectionMatrixUnifromBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    }
    commandEncoder.copyBufferToBuffer(modelViewMatrixUniformBufferUpdate, 0, modelViewMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(normalMatrixUniformBufferUpdate, 0, normalMatrixUniformBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(viewDirectionUniformBufferUpdate, 0, viewDirectionUniformBuffer, 0, 3 * Float32Array.BYTES_PER_ELEMENT);
    commandEncoder.copyBufferToBuffer(lightDirectionBufferUpdate, 0, lightDirectionBuffer, 0, 3 * Float32Array.BYTES_PER_ELEMENT);

    const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
    passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    passEncoder.setStencilReference(0xFF);
    stencil.encodeRenderPass(passEncoder);
    passEncoder.end();

    const passEncoderTwo = commandEncoder.beginRenderPass(renderPassDesc2);
    passEncoderTwo.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    passEncoderTwo.setStencilReference(0x0);
    plane.encodeRenderPass(passEncoderTwo);
    teapot.encodeRenderPass(passEncoderTwo);
    passEncoderTwo.end();

    const passEncoderThree = commandEncoder.beginRenderPass(renderPassDesc2);
    passEncoderThree.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    passEncoderThree.setStencilReference(0x0);
    frame.encodeRenderPass(passEncoderThree);
    passEncoderThree.end();

    device!.queue.submit([commandEncoder.finish()]);

    await device!.queue.onSubmittedWorkDone();
    if (projectionMatrixUniformBufferUpdate != null) {
      projectionMatrixUniformBufferUpdate.destroy();
    }
    modelViewMatrixUniformBufferUpdate.destroy();
    normalMatrixUniformBufferUpdate.destroy();
    viewDirectionUniformBufferUpdate.destroy();
    lightDirectionBufferUpdate.destroy();
    
    angle += 0.01;
    requestAnimationFrame(render);
  }

  new Controls(canvas, arcball, render);
  requestAnimationFrame(render);
}

export default App
