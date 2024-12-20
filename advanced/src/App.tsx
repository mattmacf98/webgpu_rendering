import { useEffect } from "react"
import { Controls } from "./controls/Controls";
import { Arcball } from "./controls/ArcBall";
import { createGPUBuffer } from "./meshes/Utils";
import * as glMatrix from "gl-matrix";
import { Stencil } from "./meshes/Stencil";
import { Plane } from "./meshes/Plane";
import { Frame } from "./meshes/Frame";
import { Teapot } from "./meshes/Teapot";

const App = () => {

  const startRendering = async () => {
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

    const stencil = await Stencil.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer);
    const plane = await Plane.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer);
    const frame = await Frame.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer);
    const teapot = await Teapot.init(device!, modelViewMatrixUniformBuffer, projectionMatrixUnifromBuffer, normalMatrixUniformBuffer, viewDirectionUniformBuffer, lightDirectionBuffer);

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

  useEffect(() => {
    startRendering()
  }, [])

  return (
    <canvas id="canvas" width="640" height="480" style={{width: "100%", height: "100%"}}></canvas>
  )
}

export default App
