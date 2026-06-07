import type { DreamTheater } from '@/types';

export class ZipExporter {
  private theater: DreamTheater;

  constructor(theater: DreamTheater) {
    this.theater = theater;
  }

  async exportAsJSON(): Promise<Blob> {
    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      type: 'dream-theater',
      theater: this.theater,
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  }

  getExportFilename(): string {
    const safeTitle = this.theater.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${safeTitle}_${timestamp}.json`;
  }

  exportMetadata(): string {
    const metadata = {
      title: this.theater.title,
      originalDream: this.theater.originalDream,
      sceneCount: this.theater.scenes.length,
      totalDuration: this.theater.totalDuration,
      fps: this.theater.fps,
      ruleSetId: this.theater.ruleSetId,
      createdAt: this.theater.createdAt,
      updatedAt: this.theater.updatedAt,
      scenes: this.theater.scenes.map(scene => ({
        actNumber: scene.actNumber,
        title: scene.title,
        description: scene.description,
        duration: scene.duration,
        entityCount: scene.entities.length,
      })),
    };

    return JSON.stringify(metadata, null, 2);
  }

  getThumbnailData(): string {
    if (this.theater.scenes.length === 0) return '';

    const firstScene = this.theater.scenes[0];
    const { pixelData } = firstScene.frame;
    const scale = 4;

    const canvas = document.createElement('canvas');
    canvas.width = pixelData.width * scale;
    canvas.height = pixelData.height * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < pixelData.height; y++) {
      for (let x = 0; x < pixelData.width; x++) {
        ctx.fillStyle = pixelData.pixels[y][x];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    return canvas.toDataURL('image/png');
  }

  async generateShareText(): Promise<string> {
    const sceneList = this.theater.scenes
      .map((s, i) => `${i + 1}. ${s.title} - ${s.description}`)
      .join('\n');

    return `🎬 ${this.theater.title}\n\n` +
           `梦境描述：${this.theater.originalDream}\n\n` +
           `分镜剧情：\n${sceneList}\n\n` +
           `共 ${this.theater.scenes.length} 幕，总时长 ${(this.theater.totalDuration / 1000).toFixed(1)} 秒\n` +
           `—— 来自「像素占梦」梦境分镜剧场`;
  }
}

export const createZipExporter = (theater: DreamTheater) => {
  return new ZipExporter(theater);
};
