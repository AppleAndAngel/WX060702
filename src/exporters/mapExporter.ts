import type { DreamMap, MapNode, MapConnection } from '@/types/dreamMap';
import { downloadBlob } from '@/utils/pixelUtils';

export interface MapExportOptions {
  format: 'png' | 'jpeg';
  quality: number;
  scale: number;
  includeTitle: boolean;
  includeLegend: boolean;
  includeNodeLabels: boolean;
  includeWatermark: boolean;
}

const DEFAULT_OPTIONS: MapExportOptions = {
  format: 'png',
  quality: 0.95,
  scale: 2,
  includeTitle: true,
  includeLegend: true,
  includeNodeLabels: true,
  includeWatermark: true,
};

export class MapExporter {
  private options: MapExportOptions;

  constructor(options?: Partial<MapExportOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  updateOptions(options: Partial<MapExportOptions>): void {
    this.options = { ...this.options, ...options };
  }

  async exportMap(map: DreamMap, filename?: string): Promise<void> {
    const canvas = await this.renderMapToCanvas(map);
    const blob = await this.canvasToBlob(canvas);
    const exportFilename = filename || this.generateFilename(map);
    downloadBlob(blob, exportFilename);
  }

  async exportMapAsDataURL(map: DreamMap): Promise<string> {
    const canvas = await this.renderMapToCanvas(map);
    return canvas.toDataURL(
      this.options.format === 'png' ? 'image/png' : 'image/jpeg',
      this.options.quality
    );
  }

  private async renderMapToCanvas(map: DreamMap): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建Canvas上下文');

    const scale = this.options.scale;
    let contentHeight = map.height;
    let contentOffsetY = 0;

    if (this.options.includeTitle) {
      contentHeight += 80;
      contentOffsetY = 80;
    }
    if (this.options.includeLegend) {
      contentHeight += 120;
    }

    canvas.width = map.width * scale;
    canvas.height = contentHeight * scale;

    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;

    this.drawBackground(ctx, map);
    this.drawGrid(ctx, map, contentOffsetY);
    this.drawConnections(ctx, map, contentOffsetY);
    this.drawNodes(ctx, map, contentOffsetY);
    
    if (this.options.includeTitle) {
      this.drawTitle(ctx, map);
    }
    
    if (this.options.includeLegend) {
      this.drawLegend(ctx, map, contentOffsetY + map.height);
    }
    
    if (this.options.includeWatermark) {
      this.drawWatermark(ctx, map, contentHeight);
    }

    return canvas;
  }

  private drawBackground(ctx: CanvasRenderingContext2D, map: DreamMap): void {
    ctx.fillStyle = map.background;
    ctx.fillRect(0, 0, map.width, map.height + 200);

    const starCount = Math.floor((map.width * map.height) / 3000);
    for (let i = 0; i < starCount; i++) {
      const x = (i * 137.5) % map.width;
      const y = (i * 89.3) % map.height;
      const size = (i % 3) + 1;
      const brightness = 0.3 + ((i % 5) * 0.1);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    }
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    map: DreamMap,
    offsetY: number
  ): void {
    ctx.strokeStyle = 'rgba(42, 42, 58, 0.3)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= map.width; x += map.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + map.height);
      ctx.stroke();
    }

    for (let y = 0; y <= map.height; y += map.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, offsetY + y);
      ctx.lineTo(map.width, offsetY + y);
      ctx.stroke();
    }
  }

  private drawConnections(
    ctx: CanvasRenderingContext2D,
    map: DreamMap,
    offsetY: number
  ): void {
    map.connections.forEach((connection) => {
      if (connection.pathPoints.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(
        connection.pathPoints[0].x,
        connection.pathPoints[0].y + offsetY
      );

      for (let i = 1; i < connection.pathPoints.length; i++) {
        ctx.lineTo(
          connection.pathPoints[i].x,
          connection.pathPoints[i].y + offsetY
        );
      }

      ctx.lineWidth = 3;
      ctx.strokeStyle = connection.color;

      if (connection.style === 'dashed') {
        ctx.setLineDash([8, 4]);
      } else if (connection.style === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);

      const midPoint =
        connection.pathPoints[
          Math.floor(connection.pathPoints.length / 2)
        ];
      if (midPoint) {
        ctx.fillStyle = connection.color;
        ctx.fillRect(midPoint.x - 4, midPoint.y + offsetY - 4, 8, 8);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(midPoint.x - 4, midPoint.y + offsetY - 4, 8, 8);
      }
    });
  }

  private drawNodes(
    ctx: CanvasRenderingContext2D,
    map: DreamMap,
    offsetY: number
  ): void {
    map.nodes.forEach((node, index) => {
      this.drawNodeShadow(ctx, node, offsetY);
      this.drawNodeFrame(ctx, node, index, offsetY);
      this.drawNodeThumbnail(ctx, node, offsetY);
      this.drawNodeBorder(ctx, node, offsetY);

      if (this.options.includeNodeLabels) {
        this.drawNodeLabel(ctx, node, index, offsetY);
      }
    });
  }

  private drawNodeShadow(
    ctx: CanvasRenderingContext2D,
    node: MapNode,
    offsetY: number
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(node.x + 4, node.y + 4 + offsetY, node.width, node.height);
  }

  private drawNodeFrame(
    ctx: CanvasRenderingContext2D,
    node: MapNode,
    index: number,
    offsetY: number
  ): void {
    const frameColor = node.isCurrent
      ? '#e94560'
      : node.isVisited
        ? '#533483'
        : '#2a2a3a';

    ctx.fillStyle = frameColor;
    ctx.fillRect(node.x, node.y + offsetY, node.width, node.height);

    ctx.fillStyle = '#12121a';
    ctx.fillRect(
      node.x + 2,
      node.y + 2 + offsetY,
      node.width - 4,
      node.height - 4
    );
  }

  private drawNodeThumbnail(
    ctx: CanvasRenderingContext2D,
    node: MapNode,
    offsetY: number
  ): void {
    const { thumbnail } = node;
    if (!thumbnail) return;

    const thumbX = node.x + 4;
    const thumbY = node.y + 4 + offsetY;
    const thumbWidth = node.width - 8;
    const thumbHeight = node.height - 8;

    const pixelW = thumbWidth / thumbnail.width;
    const pixelH = thumbHeight / thumbnail.height;

    for (let y = 0; y < thumbnail.height; y++) {
      for (let x = 0; x < thumbnail.width; x++) {
        ctx.fillStyle = thumbnail.pixels[y][x];
        ctx.fillRect(
          thumbX + x * pixelW,
          thumbY + y * pixelH,
          Math.ceil(pixelW),
          Math.ceil(pixelH)
        );
      }
    }
  }

  private drawNodeBorder(
    ctx: CanvasRenderingContext2D,
    node: MapNode,
    offsetY: number
  ): void {
    const borderColor = node.isCurrent
      ? '#e94560'
      : node.isVisited
        ? '#533483'
        : '#3a3a4a';

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(node.x, node.y + offsetY, node.width, node.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      node.x + 1,
      node.y + 1 + offsetY,
      node.width - 2,
      node.height - 2
    );
  }

  private drawNodeLabel(
    ctx: CanvasRenderingContext2D,
    node: MapNode,
    index: number,
    offsetY: number
  ): void {
    const labelY = node.y + node.height + 16 + offsetY;

    ctx.fillStyle = '#12121a';
    ctx.fillRect(node.x - 2, labelY - 2, node.width + 4, 24);

    ctx.strokeStyle = node.isCurrent ? '#e94560' : '#2a2a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(node.x - 2, labelY - 2, node.width + 4, 24);

    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${node.actNumber}.`, node.x + 4, labelY + 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Noto Sans SC", sans-serif';
    const title =
      node.title.length > 8
        ? node.title.substring(0, 8) + '...'
        : node.title;
    ctx.fillText(title, node.x + 28, labelY + 14);
  }

  private drawTitle(
    ctx: CanvasRenderingContext2D,
    map: DreamMap
  ): void {
    ctx.fillStyle = '#12121a';
    ctx.fillRect(0, 0, map.width, 80);

    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, map.width, 80);
    ctx.strokeRect(2, 2, map.width - 4, 76);

    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('梦境地图', map.width / 2, 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Noto Sans SC", sans-serif';
    ctx.fillText(map.title, map.width / 2, 55);

    ctx.fillStyle = '#6b7280';
    ctx.font = '10px "Noto Sans SC", sans-serif';
    const date = new Date(map.createdAt).toLocaleString('zh-CN');
    ctx.fillText(date, map.width / 2, 72);
  }

  private drawLegend(
    ctx: CanvasRenderingContext2D,
    map: DreamMap,
    y: number
  ): void {
    const padding = 20;
    const legendHeight = 100;

    ctx.fillStyle = '#12121a';
    ctx.fillRect(0, y, map.width, legendHeight);

    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y, map.width, legendHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('图例说明', padding, y + 25);

    const items = [
      { color: '#e94560', label: '当前场景' },
      { color: '#533483', label: '已探索' },
      { color: '#2a2a3a', label: '未探索' },
    ];

    items.forEach((item, index) => {
      const x = padding + index * 150;
      const itemY = y + 45;

      ctx.fillStyle = item.color;
      ctx.fillRect(x, itemY, 16, 16);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, itemY, 16, 16);

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px "Noto Sans SC", sans-serif';
      ctx.fillText(item.label, x + 22, itemY + 13);
    });

    ctx.fillStyle = '#6b7280';
    ctx.font = '10px "Noto Sans SC", sans-serif';
    ctx.fillText(
      `共 ${map.nodes.length} 个场景节点 · ${map.connections.length} 条连接路径`,
      padding,
      y + 80
    );
  }

  private drawWatermark(
    ctx: CanvasRenderingContext2D,
    map: DreamMap,
    contentHeight: number
  ): void {
    ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('PIXEL DREAM', map.width - 10, contentHeight - 10);
  }

  private async canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType =
        this.options.format === 'png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('无法导出图片'));
          }
        },
        mimeType,
        this.options.quality
      );
    });
  }

  private generateFilename(map: DreamMap): string {
    const date = new Date().toISOString().split('T')[0];
    const safeTitle = map.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const ext = this.options.format === 'png' ? 'png' : 'jpg';
    return `梦境地图_${safeTitle}_${date}.${ext}`;
  }
}

export const createMapExporter = (
  options?: Partial<MapExportOptions>
): MapExporter => {
  return new MapExporter(options);
};
