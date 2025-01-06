export const createGPUBuffer = (device: GPUDevice, data: Float32Array | Uint16Array | Uint32Array, usage: GPUBufferUsageFlags): GPUBuffer => {
    const bufferDesc: GPUBufferDescriptor = {
      size: data.byteLength,
      usage: usage,
      mappedAtCreation: true
    }
  
    const buffer = device.createBuffer(bufferDesc);
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

export const img2Texture = async (device: GPUDevice, filePath: string): Promise<GPUTexture> => {
  const response = await fetch(filePath);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);
  const textureDescriptor: GPUTextureDescriptor = {
    size: { width: imageBitmap.width, height: imageBitmap.height },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  }

  const texture = device.createTexture(textureDescriptor);

  device.queue.copyExternalImageToTexture({ source: imageBitmap }, {texture}, textureDescriptor.size);

  return texture;
}