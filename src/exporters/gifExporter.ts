import type { AnimationFrame, PixelData } from '@/types';

export class GifExporter {
  private frames: AnimationFrame[];
  private width: number;
  private height: number;
  private scale: number;

  constructor(frames: AnimationFrame[], scale: number = 4) {
    this.frames = frames;
    this.width = frames[0]?.pixelData.width || 32;
    this.height = frames[0]?.pixelData.height || 32;
    this.scale = scale;
  }

  async exportAsPNGSequence(): Promise<{ filename: string; blob: Blob }[]> {
    const results: { filename: string; blob: Blob }[] = [];

    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i];
      const blob = await this.frameToBlob(frame.pixelData);
      results.push({
        filename: `frame_${i.toString().padStart(4, '0')}.png`,
        blob,
      });
    }

    return results;
  }

  async frameToBlob(pixelData: PixelData): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = this.width * this.scale;
    canvas.height = this.height * this.scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('无法创建 Canvas 上下文');
    }

    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        ctx.fillStyle = pixelData.pixels[y][x];
        ctx.fillRect(
          x * this.scale,
          y * this.scale,
          this.scale,
          this.scale
        );
      }
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('无法生成 Blob'));
        }
      }, 'image/png');
    });
  }

  async exportAsSingleImage(frameIndex: number = 0): Promise<Blob> {
    if (frameIndex < 0 || frameIndex >= this.frames.length) {
      throw new Error('帧索引超出范围');
    }
    return this.frameToBlob(this.frames[frameIndex].pixelData);
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  getDimensions(): { width: number; height: number } {
    return {
      width: this.width * this.scale,
      height: this.height * this.scale,
    };
  }
}

export const createGifExporter = (frames: AnimationFrame[], scale?: number) => {
  return new GifExporter(frames, scale);
};
