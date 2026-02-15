interface SankeyNode {
  id: string;
  name: string;
  value: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyDiagramProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  title?: string;
}

export function SankeyDiagram({ nodes, links, title }: SankeyDiagramProps) {
  const totalValue = nodes.reduce((sum, node) => sum + node.value, 0);
  const maxNodeValue = Math.max(...nodes.map((n) => n.value), 1);

  // Calculate positions
  const nodePositions = nodes.map((node, index) => {
    const previousSum = nodes.slice(0, index).reduce((sum, n) => sum + n.value, 0);
    const y = (previousSum / totalValue) * 100;
    const height = (node.value / totalValue) * 100;
    return { ...node, y, height };
  });

  // Calculate link paths
  const linkPaths = links.map((link) => {
    const sourceNode = nodePositions.find((n) => n.id === link.source);
    const targetNode = nodePositions.find((n) => n.id === link.target);

    if (!sourceNode || !targetNode) return null;

    const sourceY = sourceNode.y + sourceNode.height / 2;
    const targetY = targetNode.y + targetNode.height / 2;

    return {
      ...link,
      sourceY,
      targetY,
      sourceHeight: sourceNode.height,
      targetHeight: targetNode.height,
    };
  }).filter(Boolean) as Array<typeof linkPaths[0] & { sourceY: number; targetY: number; sourceHeight: number; targetHeight: number }>;

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-medium mb-4">{title}</h4>}
      <div className="relative" style={{ height: "300px" }}>
        <svg width="100%" height="100%" className="overflow-visible">
          {/* Links */}
          {linkPaths.map((link, index) => {
            const controlPoint1X = 25;
            const controlPoint2X = 75;
            const path = `M ${0} ${link.sourceY} C ${controlPoint1X} ${link.sourceY}, ${controlPoint2X} ${link.targetY}, ${100} ${link.targetY}`;

            const linkWidth = (link.value / maxNodeValue) * 8;
            const linkOpacity = link.value / maxNodeValue;

            return (
              <path
                key={`link-${index}`}
                d={path}
                stroke="hsl(228, 66%, 47%)"
                strokeWidth={Math.max(linkWidth, 2)}
                fill="none"
                opacity={0.3 + linkOpacity * 0.7}
                className="transition-opacity hover:opacity-100"
              />
            );
          })}

          {/* Nodes */}
          {nodePositions.map((node, index) => {
            const isLeft = index < nodes.length / 2;
            const x = isLeft ? 0 : 100;
            const width = (node.value / maxNodeValue) * 15;

            return (
              <g key={node.id}>
                <rect
                  x={isLeft ? x : x - width}
                  y={`${node.y}%`}
                  width={width}
                  height={`${node.height}%`}
                  fill="hsl(228, 66%, 47%)"
                  rx={2}
                  className="transition-opacity hover:opacity-80"
                />
                <text
                  x={isLeft ? x + width + 5 : x - width - 5}
                  y={`${node.y + node.height / 2}%`}
                  dominantBaseline="middle"
                  textAnchor={isLeft ? "start" : "end"}
                  className="text-xs fill-foreground"
                >
                  {node.name} ({node.value})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
