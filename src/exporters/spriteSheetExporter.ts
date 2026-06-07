import type { AnimationFrame, PixelData } from '@/types';

export class SpriteSheetExporter {
  private frames: AnimationFrame[];
  private scale: number;
  private frameWidth: number;
  private frameHeight: number;

  constructor(frames: AnimationFrame[], scale: number = 4) {
    this.frames = frames;
    this.scale = scale;
    this.frameWidth = frames[0]?.pixelData.width || 32;
    this.frameHeight = frames[0]?.pixelData.height || 32;
  }

  async exportAsSpriteSheet(
    columns: number = 0
  ): Promise<{ blob: Blob; columns: number; rows: number }> {
    const frameCount = this.frames.length;
    const cols = columns || Math.ceil(Math.sqrt(frameCount));
    const rows = Math.ceil(frameCount / cols);

    const canvas = document.createElement('canvas');
    canvas.width = this.frameWidth * this.scale * cols;
    canvas.height = this.frameHeight * this.scale * rows;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('无法创建 Canvas 上下文');
    }

    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < frameCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const frame = this.frames[i];

      this.drawFrame(
        ctx,
        frame.pixelData,
        col * this.frameWidth * this.scale,
        row * this.frameHeight * this.scale
      );
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ blob, columns: cols, rows });
        } else {
          reject(new Error('无法生成精灵图'));
        }
      }, 'image/png');
    });
  }

  private drawFrame(
    ctx: CanvasRenderingContext2D,
    pixelData: PixelData,
    offsetX: number,
    offsetY: number
  ): void {
    for (let y = 0; y < this.frameHeight; y++) {
      for (let x = 0; x < this.frameWidth; x++) {
        ctx.fillStyle = pixelData.pixels[y][x];
        ctx.fillRect(
          offsetX + x * this.scale,
          offsetY + y * this.scale,
          this.scale,
          this.scale
        );
      }
    }
  }

  exportMetadata(columns: number, rows: number): string {
    const metadata = {
      version: '1.0',
      frameCount: this.frames.length,
      columns,
      rows,
      frameWidth: this.frameWidth * this.scale,
      frameHeight: this.frameHeight * this.scale,
      originalWidth: this.frameWidth,
      originalHeight: this.frameHeight,
      scale: this.scale,
      frames: this.frames.map((frame, index) => ({
        index,
        id: frame.id,
        timestamp: frame.timestamp,
        background: frame.background,
      })),
    };

    return JSON.stringify(metadata, null, 2);
  }

  getFrameCount(): number {
    return this.frames.length;
  }
}

export const createSpriteSheetExporter = (frames: AnimationFrame[], scale?: number) => {
  return new SpriteSheetExporter(frames, scale);
};
