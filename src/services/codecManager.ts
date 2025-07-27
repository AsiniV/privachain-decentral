/**
 * Codec and Media Support Service for PrivaChain Browser
 * Provides comprehensive support for modern web technologies, codecs, and media formats
 */

export interface CodecInfo {
  name: string
  type: 'video' | 'audio' | 'image' | 'container'
  supported: boolean
  description: string
  mimeTypes: string[]
}

export interface MediaCapabilities {
  video: VideoCodecSupport
  audio: AudioCodecSupport
  image: ImageFormatSupport
  streaming: StreamingSupport
  webgl: WebGLSupport
  webassembly: WebAssemblySupport
}

export interface VideoCodecSupport {
  h264: boolean
  h265: boolean
  vp8: boolean
  vp9: boolean
  av1: boolean
  webm: boolean
  mp4: boolean
}

export interface AudioCodecSupport {
  aac: boolean
  mp3: boolean
  opus: boolean
  vorbis: boolean
  flac: boolean
  wav: boolean
}

export interface ImageFormatSupport {
  webp: boolean
  avif: boolean
  heic: boolean
  jpeg: boolean
  png: boolean
  gif: boolean
  svg: boolean
}

export interface StreamingSupport {
  hls: boolean
  dash: boolean
  webrtc: boolean
  mse: boolean
  eme: boolean
}

export interface WebGLSupport {
  webgl1: boolean
  webgl2: boolean
  webgpu: boolean
}

export interface WebAssemblySupport {
  wasm: boolean
  wasmStreaming: boolean
  wasmSIMD: boolean
  wasmThreads: boolean
}

class CodecManager {
  private capabilities: MediaCapabilities | null = null
  private supportedCodecs: CodecInfo[] = []

  async initialize(): Promise<void> {
    this.capabilities = await this.detectCapabilities()
    this.supportedCodecs = this.generateCodecList()
  }

  private async detectCapabilities(): Promise<MediaCapabilities> {
    const video = document.createElement('video')
    const audio = document.createElement('audio')
    const canvas = document.createElement('canvas')
    // Check for WebGL support for future hardware acceleration features
    const hasWebGL = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))

    return {
      video: {
        h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '',
        h265: video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== '',
        vp8: video.canPlayType('video/webm; codecs="vp8"') !== '',
        vp9: video.canPlayType('video/webm; codecs="vp9"') !== '',
        av1: video.canPlayType('video/mp4; codecs="av01.0.04M.08"') !== '',
        webm: video.canPlayType('video/webm') !== '',
        mp4: video.canPlayType('video/mp4') !== ''
      },
      audio: {
        aac: audio.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '',
        mp3: audio.canPlayType('audio/mpeg') !== '',
        opus: audio.canPlayType('audio/ogg; codecs="opus"') !== '',
        vorbis: audio.canPlayType('audio/ogg; codecs="vorbis"') !== '',
        flac: audio.canPlayType('audio/flac') !== '',
        wav: audio.canPlayType('audio/wav') !== ''
      },
      image: {
        webp: await this.supportsImageFormat('webp'),
        avif: await this.supportsImageFormat('avif'),
        heic: await this.supportsImageFormat('heic'),
        jpeg: true,
        png: true,
        gif: true,
        svg: true
      },
      streaming: {
        hls: this.supportsHLS(),
        dash: this.supportsDASH(),
        webrtc: this.supportsWebRTC(),
        mse: this.supportsMSE(),
        eme: this.supportsEME()
      },
      webgl: {
        webgl1: !!canvas.getContext('webgl'),
        webgl2: !!canvas.getContext('webgl2'),
        webgpu: 'gpu' in navigator
      },
      webassembly: {
        wasm: typeof WebAssembly === 'object',
        wasmStreaming: typeof WebAssembly.instantiateStreaming === 'function',
        wasmSIMD: await this.supportsWasmSIMD(),
        wasmThreads: await this.supportsWasmThreads()
      }
    }
  }

  private async supportsImageFormat(format: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      
      // Test images for each format
      const testImages = {
        webp: 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA',
        avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=',
        heic: 'data:image/heic;base64,AAABAAEAEBAAAAEACAAgAAAAGAAAACgAAABAAAAAgAAAABAAAAAQAAAAEAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAAQAAAAEAAAAAQAAAAEAAAAAQAAAAE='
      }
      
      img.src = testImages[format as keyof typeof testImages] || ''
    })
  }

  private supportsHLS(): boolean {
    const video = document.createElement('video')
    return video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
           video.canPlayType('application/x-mpegURL') !== ''
  }

  private supportsDASH(): boolean {
    return 'MediaSource' in window && MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"')
  }

  private supportsWebRTC(): boolean {
    return 'RTCPeerConnection' in window || 'webkitRTCPeerConnection' in window || 'mozRTCPeerConnection' in window
  }

  private supportsMSE(): boolean {
    return 'MediaSource' in window
  }

  private supportsEME(): boolean {
    return 'requestMediaKeySystemAccess' in navigator
  }

  private async supportsWasmSIMD(): Promise<boolean> {
    try {
      const wasmCode = new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 7, 8, 1, 4, 116, 101, 115, 116, 0, 0, 10, 15, 1, 13, 0, 65, 0, 253, 15, 253, 98, 11
      ])
      await WebAssembly.compile(wasmCode)
      return true
    } catch {
      return false
    }
  }

  private async supportsWasmThreads(): Promise<boolean> {
    return 'SharedArrayBuffer' in window && 'Atomics' in window
  }

  private generateCodecList(): CodecInfo[] {
    if (!this.capabilities) return []

    const codecs: CodecInfo[] = [
      // VideoCamera Codecs
      {
        name: 'H.264 (AVC)',
        type: 'video',
        supported: this.capabilities.video.h264,
        description: 'Industry standard video codec, widely supported',
        mimeTypes: ['video/mp4; codecs="avc1.42E01E"', 'video/mp4; codecs="avc1.4D401E"']
      },
      {
        name: 'H.265 (HEVC)',
        type: 'video',
        supported: this.capabilities.video.h265,
        description: 'Next-generation video codec with better compression',
        mimeTypes: ['video/mp4; codecs="hev1.1.6.L93.B0"', 'video/mp4; codecs="hvc1.1.6.L93.B0"']
      },
      {
        name: 'VP8',
        type: 'video',
        supported: this.capabilities.video.vp8,
        description: 'Open-source video codec by Google',
        mimeTypes: ['video/webm; codecs="vp8"']
      },
      {
        name: 'VP9',
        type: 'video',
        supported: this.capabilities.video.vp9,
        description: 'Advanced open-source video codec',
        mimeTypes: ['video/webm; codecs="vp9"']
      },
      {
        name: 'AV1',
        type: 'video',
        supported: this.capabilities.video.av1,
        description: 'Royalty-free next-generation video codec',
        mimeTypes: ['video/mp4; codecs="av01.0.04M.08"', 'video/webm; codecs="av01.0.04M.08"']
      },

      // Audio Codecs
      {
        name: 'AAC',
        type: 'audio',
        supported: this.capabilities.audio.aac,
        description: 'Advanced Audio Coding, high-quality compression',
        mimeTypes: ['audio/mp4; codecs="mp4a.40.2"', 'audio/aac']
      },
      {
        name: 'MP3',
        type: 'audio',
        supported: this.capabilities.audio.mp3,
        description: 'MPEG-1 Audio Layer III, universal compatibility',
        mimeTypes: ['audio/mpeg', 'audio/mp3']
      },
      {
        name: 'Opus',
        type: 'audio',
        supported: this.capabilities.audio.opus,
        description: 'Low-latency audio codec, ideal for real-time',
        mimeTypes: ['audio/ogg; codecs="opus"', 'audio/webm; codecs="opus"']
      },
      {
        name: 'Vorbis',
        type: 'audio',
        supported: this.capabilities.audio.vorbis,
        description: 'Open-source audio codec',
        mimeTypes: ['audio/ogg; codecs="vorbis"']
      },
      {
        name: 'FLAC',
        type: 'audio',
        supported: this.capabilities.audio.flac,
        description: 'Lossless audio compression',
        mimeTypes: ['audio/flac']
      },

      // Image Formats
      {
        name: 'WebP',
        type: 'image',
        supported: this.capabilities.image.webp,
        description: 'Modern image format with excellent compression',
        mimeTypes: ['image/webp']
      },
      {
        name: 'AVIF',
        type: 'image',
        supported: this.capabilities.image.avif,
        description: 'Next-generation image format based on AV1',
        mimeTypes: ['image/avif']
      },
      {
        name: 'HEIC',
        type: 'image',
        supported: this.capabilities.image.heic,
        description: 'High Efficiency Image Container',
        mimeTypes: ['image/heic', 'image/heif']
      }
    ]

    return codecs
  }

  getCapabilities(): MediaCapabilities | null {
    return this.capabilities
  }

  getSupportedCodecs(): CodecInfo[] {
    return this.supportedCodecs
  }

  canPlayMedia(mimeType: string): boolean {
    if (!this.capabilities) return false

    const video = document.createElement('video')
    const audio = document.createElement('audio')

    if (mimeType.startsWith('video/')) {
      return video.canPlayType(mimeType) !== ''
    } else if (mimeType.startsWith('audio/')) {
      return audio.canPlayType(mimeType) !== ''
    }

    return false
  }

  getOptimalVideoCodec(): string {
    if (!this.capabilities) return 'video/mp4; codecs="avc1.42E01E"'

    // Prefer AV1 > VP9 > H.265 > H.264 > VP8
    if (this.capabilities.video.av1) return 'video/webm; codecs="av01.0.04M.08"'
    if (this.capabilities.video.vp9) return 'video/webm; codecs="vp9"'
    if (this.capabilities.video.h265) return 'video/mp4; codecs="hev1.1.6.L93.B0"'
    if (this.capabilities.video.h264) return 'video/mp4; codecs="avc1.42E01E"'
    if (this.capabilities.video.vp8) return 'video/webm; codecs="vp8"'

    return 'video/mp4; codecs="avc1.42E01E"'
  }

  getOptimalAudioCodec(): string {
    if (!this.capabilities) return 'audio/mp4; codecs="mp4a.40.2"'

    // Prefer Opus > AAC > Vorbis > MP3
    if (this.capabilities.audio.opus) return 'audio/webm; codecs="opus"'
    if (this.capabilities.audio.aac) return 'audio/mp4; codecs="mp4a.40.2"'
    if (this.capabilities.audio.vorbis) return 'audio/ogg; codecs="vorbis"'
    if (this.capabilities.audio.mp3) return 'audio/mpeg'

    return 'audio/mp4; codecs="mp4a.40.2"'
  }

  // Polyfill and compatibility methods
  addPolyfills(): void {
    this.addWebRTCPolyfill()
    this.addWebAssemblyPolyfill()
    this.addIntersectionObserverPolyfill()
    this.addResizeObserverPolyfill()
  }

  private addWebRTCPolyfill(): void {
    if (!window.RTCPeerConnection) {
      window.RTCPeerConnection = (window as Record<string, unknown>).webkitRTCPeerConnection || 
                                 (window as Record<string, unknown>).mozRTCPeerConnection || 
                                 (window as Record<string, unknown>).msRTCPeerConnection
    }

    if (!navigator.getUserMedia) {
      navigator.getUserMedia = (navigator as Record<string, unknown>).webkitGetUserMedia || 
                              (navigator as Record<string, unknown>).mozGetUserMedia || 
                              (navigator as Record<string, unknown>).msGetUserMedia
    }
  }

  private addWebAssemblyPolyfill(): void {
    if (!('WebAssembly' in window)) {
      console.warn('WebAssembly not supported, some features may not work')
      // Could load a WebAssembly polyfill here if needed
    }
  }

  private addIntersectionObserverPolyfill(): void {
    if (!('IntersectionObserver' in window)) {
      // Simplified polyfill for basic functionality
      (window as Record<string, unknown>).IntersectionObserver = class {
        constructor(callback: (entries: unknown[]) => void) {
          this.callback = callback
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
  }

  private addResizeObserverPolyfill(): void {
    if (!('ResizeObserver' in window)) {
      // Simplified polyfill for basic functionality
      (window as Record<string, unknown>).ResizeObserver = class {
        constructor(callback: (entries: unknown[]) => void) {
          this.callback = callback
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
  }

  // Performance optimization methods
  optimizeForDevice(): void {
    const capabilities = this.getCapabilities()
    if (!capabilities) return

    // Disable hardware acceleration for older devices
    if (!capabilities.webgl.webgl2) {
      document.documentElement.style.setProperty('--enable-hw-accel', 'false')
    }

    // Adjust video quality based on capabilities
    if (!capabilities.video.h265 && !capabilities.video.av1) {
      document.documentElement.style.setProperty('--max-video-quality', '720p')
    }

    // Enable efficient codecs when available
    if (capabilities.image.webp) {
      document.documentElement.style.setProperty('--preferred-image-format', 'webp')
    }
  }

  // Content security and validation
  validateMediaUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      
      // Check for secure protocols
      if (!['https:', 'blob:', 'data:'].includes(urlObj.protocol)) {
        return false
      }

      // Basic validation for media extensions
      const validExtensions = [
        'mp4', 'webm', 'ogg', 'avi', 'mov',
        'mp3', 'wav', 'flac', 'aac', 'opus',
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'
      ]

      const extension = urlObj.pathname.split('.').pop()?.toLowerCase()
      if (extension && !validExtensions.includes(extension)) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  // Progressive enhancement
  enhanceMediaElements(): void {
    // Enhance video elements
    document.querySelectorAll('video').forEach(video => {
      if (!video.hasAttribute('preload')) {
        video.setAttribute('preload', 'metadata')
      }
      
      if (!video.hasAttribute('crossorigin')) {
        video.setAttribute('crossorigin', 'anonymous')
      }
    })

    // Enhance audio elements
    document.querySelectorAll('audio').forEach(audio => {
      if (!audio.hasAttribute('preload')) {
        audio.setAttribute('preload', 'none')
      }
    })

    // Enhance images with lazy loading
    document.querySelectorAll('img').forEach(img => {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy')
      }
    })
  }
}

// Create global codec manager instance
export const codecManager = new CodecManager()

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    codecManager.initialize().then(() => {
      codecManager.addPolyfills()
      codecManager.optimizeForDevice()
      codecManager.enhanceMediaElements()
    })
  })
}

export default codecManager