import type { Entity, PixelData } from '@/types';
import { createEmptyPixelData, randomChoice, randomInt } from '@/utils/pixelUtils';

export class LayoutSystem {
  private width: number;
  private height: number;
  private background: string;
  private palette: string[];

  constructor(width: number, height: number, background: string, palette: string[]) {
    this.width = width;
    this.height = height;
    this.background = background;
    this.palette = palette;
  }

  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  updateBackground(background: string): void {
    this.background = background;
  }

  updatePalette(palette: string[]): void {
    this.palette = palette;
  }

  renderEntitiesToPixelData(entities: Entity[]): PixelData {
    const pixelData = createEmptyPixelData(this.width, this.height, this.background);

    const sortedEntities = [...entities].sort((a, b) => {
      const aY = a.y + a.height;
      const bY = b.y + b.height;
      return aY - bY;
    });

    for (const entity of sortedEntities) {
      this.drawEntity(pixelData, entity);
    }

    return pixelData;
  }

  private drawEntity(pixelData: PixelData, entity: Entity): void {
    const { pixels } = pixelData;

    for (let dy = 0; dy < entity.height; dy++) {
      for (let dx = 0; dx < entity.width; dx++) {
        const x = entity.x + dx;
        const y = entity.y + dy;

        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          if (this.isEntityPixel(entity, dx, dy)) {
            pixels[y][x] = entity.color;
          }
        }
      }
    }

    if (entity.properties.glowing as boolean) {
      this.drawGlowEffect(pixelData, entity);
    }
  }

  private isEntityPixel(entity: Entity, dx: number, dy: number): boolean {
    const centerX = Math.floor(entity.width / 2);
    const centerY = Math.floor(entity.height / 2);

    if (entity.properties.glowing as boolean) {
      const dist = Math.sqrt(
        Math.pow(dx - centerX, 2) + Math.pow(dy - centerY, 2)
      );
      return dist < Math.min(centerX, centerY);
    }

    if (entity.type === 'star') {
      return (
        dx === centerX ||
        dy === centerY ||
        Math.abs(dx - centerX) === Math.abs(dy - centerY)
      );
    }

    if (entity.type === 'moon') {
      const dist = Math.sqrt(
        Math.pow(dx - centerX, 2) + Math.pow(dy - centerY, 2)
      );
      return dist < Math.min(centerX, centerY) && !(dx > centerX && dy > centerY);
    }

    if (entity.type === 'cloud') {
      return dy !== 0 && dy !== entity.height - 1 || (dx !== 0 && dx !== entity.width - 1);
    }

    if (entity.type === 'tree') {
      if (dy < entity.height * 0.4) {
        const dist = Math.sqrt(
          Math.pow(dx - centerX, 2) + Math.pow(dy - centerY * 0.5, 2)
        );
        return dist < centerX * 1.2;
      } else {
        return dx >= centerX - 1 && dx <= centerX + 1;
      }
    }

    if (entity.type === 'castle' || entity.type === 'skyscraper') {
      if (dx === 0 || dx === entity.width - 1 || dy === 0) {
        return true;
      }
      if (dy > 0 && dy % 3 === 0 && dx % 3 === 1) {
        return true;
      }
      return false;
    }

    if (entity.type === 'protagonist' || entity.type === 'human') {
      if (dy < 2) return true;
      if (dy >= 2 && dy < 4 && dx >= 1 && dx <= entity.width - 2) return true;
      if (dy >= 4 && (dx === 0 || dx === entity.width - 1)) return true;
      return false;
    }

    if (entity.type === 'river' || entity.type === 'data_stream') {
      const waveOffset = Math.sin(dx * 0.5) * 0.5;
      return Math.abs(dy - centerY + waveOffset) < entity.height * 0.4;
    }

    if (entity.type === 'mountain') {
      const peakX = centerX;
      const peakY = 0;
      const distFromPeak = Math.abs(dx - peakX);
      const expectedY = (distFromPeak / centerX) * entity.height;
      return dy >= expectedY;
    }

    if (entity.type === 'rain' || entity.type === 'neon_sign') {
      return true;
    }

    const margin = 0.2;
    return (
      dx >= entity.width * margin &&
      dx < entity.width * (1 - margin) &&
      dy >= entity.height * margin &&
      dy < entity.height * (1 - margin)
    );
  }

  private drawGlowEffect(pixelData: PixelData, entity: Entity): void {
    const { pixels } = pixelData;
    const glowRadius = 2;

    for (let dy = -glowRadius; dy < entity.height + glowRadius; dy++) {
      for (let dx = -glowRadius; dx < entity.width + glowRadius; dx++) {
        const x = entity.x + dx;
        const y = entity.y + dy;

        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          if (pixels[y][x] === this.background) {
            const distToEntity = this.getDistanceToEntity(entity, dx, dy);
            if (distToEntity < glowRadius) {
              const alpha = 1 - distToEntity / glowRadius;
              pixels[y][x] = this.blendColors(
                this.background,
                entity.color,
                alpha * 0.5
              );
            }
          }
        }
      }
    }
  }

  private getDistanceToEntity(entity: Entity, dx: number, dy: number): number {
    if (dx >= 0 && dx < entity.width && dy >= 0 && dy < entity.height) {
      return 0;
    }

    let minDist = Infinity;

    for (let ey = 0; ey < entity.height; ey++) {
      for (let ex = 0; ex < entity.width; ex++) {
        if (this.isEntityPixel(entity, ex, ey)) {
          const dist = Math.sqrt(Math.pow(dx - ex, 2) + Math.pow(dy - ey, 2));
          minDist = Math.min(minDist, dist);
        }
      }
    }

    return minDist;
  }

  private blendColors(color1: string, color2: string, ratio: number): string {
    const hex = (c: string) => parseInt(c.slice(1), 16);
    const r1 = (hex(color1) >> 16) & 255;
    const g1 = (hex(color1) >> 8) & 255;
    const b1 = hex(color1) & 255;
    const r2 = (hex(color2) >> 16) & 255;
    const g2 = (hex(color2) >> 8) & 255;
    const b2 = hex(color2) & 255;

    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  createTransformedFrame(
    entities: Entity[],
    transform: (entity: Entity, progress: number) => Entity,
    progress: number
  ): PixelData {
    const transformedEntities = entities.map(e => transform(e, progress));
    return this.renderEntitiesToPixelData(transformedEntities);
  }

  addRandomNoise(pixelData: PixelData, intensity: number): PixelData {
    const { pixels, width, height } = pixelData;
    const result = {
      width,
      height,
      pixels: pixels.map(row => [...row]),
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.random() < intensity) {
          result.pixels[y][x] = randomChoice(this.palette);
        }
      }
    }

    return result;
  }

  animateEntity(
    entity: Entity,
    animationType: string,
    frameIndex: number,
    totalFrames: number
  ): Entity {
    const progress = frameIndex / totalFrames;

    switch (animationType) {
      case 'float':
        return {
          ...entity,
          y: entity.y + Math.sin(progress * Math.PI * 2) * 2,
        };
      case 'walk':
        return {
          ...entity,
          x: entity.x + Math.sin(progress * Math.PI * 4) * 1,
        };
      case 'pulse':
        const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
        return {
          ...entity,
          width: Math.round(entity.width * scale),
          height: Math.round(entity.height * scale),
        };
      case 'twinkle':
        return {
          ...entity,
          properties: {
            ...entity.properties,
            visible: Math.sin(progress * Math.PI * 4) > 0.5,
          },
        };
      default:
        return entity;
    }
  }
}

export const createLayoutSystem = (
  width: number,
  height: number,
  background: string,
  palette: string[]
): LayoutSystem => {
  return new LayoutSystem(width, height, background, palette);
};
