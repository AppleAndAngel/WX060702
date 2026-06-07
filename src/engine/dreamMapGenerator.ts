import type { DreamTheater, DreamScene } from '@/types';
import type {
  DreamMap,
  MapNode,
  MapConnection,
  MapGenerateOptions,
} from '@/types/dreamMap';
import { generateId, randomChoice, randomInt } from '@/utils/pixelUtils';

const DEFAULT_OPTIONS: MapGenerateOptions = {
  nodeWidth: 80,
  nodeHeight: 60,
  horizontalSpacing: 120,
  verticalSpacing: 100,
  padding: 60,
  gridSize: 20,
};

const PATH_COLORS = [
  '#e94560',
  '#533483',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
];

export class DreamMapGenerator {
  private options: MapGenerateOptions;

  constructor(options?: Partial<MapGenerateOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  updateOptions(options: Partial<MapGenerateOptions>): void {
    this.options = { ...this.options, ...options };
  }

  generateMap(theater: DreamTheater): DreamMap {
    const scenes = theater.scenes;
    const nodes = this.layoutNodes(scenes);
    const connections = this.createConnections(nodes);

    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + n.width));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + n.height));

    const width = maxX - minX + this.options.padding * 2;
    const height = maxY - minY + this.options.padding * 2;

    const adjustedNodes = nodes.map(node => ({
      ...node,
      x: node.x - minX + this.options.padding,
      y: node.y - minY + this.options.padding,
    }));

    const adjustedConnections = connections.map(conn => ({
      ...conn,
      pathPoints: conn.pathPoints.map(p => ({
        x: p.x - minX + this.options.padding,
        y: p.y - minY + this.options.padding,
      })),
    }));

    return {
      id: generateId(),
      theaterId: theater.id,
      title: theater.title,
      originalDream: theater.originalDream,
      nodes: adjustedNodes,
      connections: adjustedConnections,
      width,
      height,
      gridSize: this.options.gridSize,
      background: '#0a0a0f',
      createdAt: Date.now(),
    };
  }

  private layoutNodes(scenes: DreamScene[]): MapNode[] {
    const nodes: MapNode[] = [];
    const count = scenes.length;

    if (count <= 3) {
      return this.layoutHorizontal(scenes);
    } else if (count <= 5) {
      return this.layoutZigzag(scenes);
    } else {
      return this.layoutSpiral(scenes);
    }
  }

  private layoutHorizontal(scenes: DreamScene[]): MapNode[] {
    const nodes: MapNode[] = [];
    const { nodeWidth, nodeHeight, horizontalSpacing } = this.options;

    scenes.forEach((scene, index) => {
      const x = index * (nodeWidth + horizontalSpacing);
      const y = 0;

      nodes.push(this.createMapNode(scene, index, x, y));
    });

    return nodes;
  }

  private layoutZigzag(scenes: DreamScene[]): MapNode[] {
    const nodes: MapNode[] = [];
    const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } = this.options;
    const cols = Math.ceil(scenes.length / 2);

    scenes.forEach((scene, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const x = col * (nodeWidth + horizontalSpacing);
      const y = row * (nodeHeight + verticalSpacing) * (row % 2 === 0 ? 1 : -1);

      nodes.push(this.createMapNode(scene, index, x, y));
    });

    return nodes;
  }

  private layoutSpiral(scenes: DreamScene[]): MapNode[] {
    const nodes: MapNode[] = [];
    const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } = this.options;

    let x = 0;
    let y = 0;
    let direction = 0;
    let stepsInDirection = 1;
    let stepsTaken = 0;
    let layer = 0;

    scenes.forEach((scene, index) => {
      nodes.push(this.createMapNode(scene, index, x, y));

      stepsTaken++;

      switch (direction) {
        case 0:
          x += nodeWidth + horizontalSpacing;
          break;
        case 1:
          y += nodeHeight + verticalSpacing;
          break;
        case 2:
          x -= nodeWidth + horizontalSpacing;
          break;
        case 3:
          y -= nodeHeight + verticalSpacing;
          break;
      }

      if (stepsTaken === stepsInDirection) {
        stepsTaken = 0;
        direction = (direction + 1) % 4;

        if (direction === 0 || direction === 2) {
          stepsInDirection++;
        }

        layer++;
      }
    });

    return nodes;
  }

  private createMapNode(
    scene: DreamScene,
    index: number,
    x: number,
    y: number
  ): MapNode {
    return {
      id: generateId(),
      sceneId: scene.id,
      actNumber: scene.actNumber,
      title: scene.title,
      description: scene.description,
      x,
      y,
      width: this.options.nodeWidth,
      height: this.options.nodeHeight,
      entities: [...scene.entities],
      thumbnail: scene.frame.pixelData,
      background: scene.frame.background,
      isVisited: index === 0,
      isCurrent: index === 0,
    };
  }

  private createConnections(nodes: MapNode[]): MapConnection[] {
    const connections: MapConnection[] = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      const fromNode = nodes[i];
      const toNode = nodes[i + 1];

      const pathPoints = this.generatePath(fromNode, toNode);
      const color = randomChoice(PATH_COLORS);
      const style = this.getConnectionStyle(i);

      connections.push({
        id: generateId(),
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        pathPoints,
        style,
        color,
      });
    }

    return connections;
  }

  private generatePath(
    fromNode: MapNode,
    toNode: MapNode
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];

    const fromCenterX = fromNode.x + fromNode.width / 2;
    const fromCenterY = fromNode.y + fromNode.height / 2;
    const toCenterX = toNode.x + toNode.width / 2;
    const toCenterY = toNode.y + toNode.height / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const steps = Math.max(2, Math.floor(distance / 30));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = fromCenterX + dx * t;
      const y = fromCenterY + dy * t;

      if (i > 0 && i < steps) {
        const noiseX = (Math.random() - 0.5) * 10;
        const noiseY = (Math.random() - 0.5) * 10;
        points.push({ x: x + noiseX, y: y + noiseY });
      } else {
        points.push({ x, y });
      }
    }

    return points;
  }

  private getConnectionStyle(index: number): 'solid' | 'dashed' | 'dotted' {
    const styles: ('solid' | 'dashed' | 'dotted')[] = ['solid', 'dashed', 'dotted'];
    return styles[index % styles.length];
  }

  updateNodeVisited(map: DreamMap, nodeId: string): DreamMap {
    return {
      ...map,
      nodes: map.nodes.map(node =>
        node.id === nodeId ? { ...node, isVisited: true } : node
      ),
    };
  }

  updateCurrentNode(map: DreamMap, nodeId: string): DreamMap {
    return {
      ...map,
      nodes: map.nodes.map(node =>
        node.id === nodeId
          ? { ...node, isCurrent: true }
          : { ...node, isCurrent: false }
      ),
    };
  }

  getNodeAtPosition(
    map: DreamMap,
    x: number,
    y: number
  ): MapNode | null {
    for (const node of map.nodes) {
      if (
        x >= node.x &&
        x <= node.x + node.width &&
        y >= node.y &&
        y <= node.y + node.height
      ) {
        return node;
      }
    }
    return null;
  }
}

export const createDreamMapGenerator = (
  options?: Partial<MapGenerateOptions>
): DreamMapGenerator => {
  return new DreamMapGenerator(options);
};
