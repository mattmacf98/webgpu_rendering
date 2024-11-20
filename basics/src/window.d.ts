interface Navigator {
    gpu: GPU;
}

interface GPU {
    getPreferredCanvasFormat(): unknown;
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface GPURequestAdapterOptions {
    powerPreference?: 'low-power' | 'high-performance';
    forceFallbackAdapter?: boolean;
}

interface GPUAdapter {
    readonly name: string;
    readonly features: GPUSupportedFeatures;
    readonly limits: GPUSupportedLimits;
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice | null>;
}

interface GPUDevice {
    readonly features: GPUSupportedFeatures;
    readonly limits: GPUSupportedLimits;
    readonly queue: GPUQueue;
    destroy(): void;
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
    createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
    createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
}

interface GPUSupportedFeatures {
    has(feature: string): boolean;
}

interface GPUSupportedLimits {
    get(limit: string): number;
}