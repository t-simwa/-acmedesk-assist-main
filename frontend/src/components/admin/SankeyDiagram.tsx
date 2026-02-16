import { useMemo, useRef } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { getChartTheme, chartA11y } from "@/lib/chartTheme";

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
  onNodeClick?: (node: SankeyNode) => void;
}

export function SankeyDiagram({ nodes, links, title, onNodeClick }: SankeyDiagramProps) {
  const { highContrast, reduceMotion } = useAccessibility();
  const theme = getChartTheme(highContrast);
  const chartId = useRef(`sankey-${Math.random().toString(36).substr(2, 9)}`);

  const totalValue = useMemo(() => {
    return nodes.reduce((sum, node) => sum + node.value, 0);
  }, [nodes]);

  const maxNodeValue = useMemo(() => {
    return Math.max(...nodes.map((n) => n.value), 1);
  }, [nodes]);

  // Calculate positions
  const nodePositions = useMemo(() => {
    return nodes.map((node, index) => {
      const previousSum = nodes.slice(0, index).reduce((sum, n) => sum + n.value, 0);
      const y = (previousSum / totalValue) * 100;
      const height = (node.value / totalValue) * 100;
      return { ...node, y, height };
    });
  }, [nodes, totalValue]);

  // Calculate link paths
  const linkPaths = useMemo(() => {
    return links
      .map((link) => {
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
      })
      .filter(Boolean) as Array<
      typeof linkPaths[0] & { sourceY: number; targetY: number; sourceHeight: number; targetHeight: number }
    >;
  }, [links, nodePositions]);

  // Generate data summary for screen readers
  const dataSummary = useMemo(() => {
    if (nodes.length === 0) return "No data available";
    const nodeDescriptions = nodes.map((node) => `${node.name}: ${node.value}`).join(", ");
    return `Flow diagram showing: ${nodeDescriptions}.`;
  }, [nodes]);

  const chartLabel = title
    ? chartA11y.getChartLabel(title, "sankey", nodes.length)
    : `Sankey diagram with ${nodes.length} nodes`;

  return (
    <div className="w-full" role="region" aria-labelledby={`${chartId.current}-title`}>
      {title && (
        <h4 id={`${chartId.current}-title`} className="text-sm font-medium mb-4">
          {title}
        </h4>
      )}
      <div
        className="relative w-full"
        style={{ height: "300px", minHeight: "200px" }}
        role="img"
        aria-label={chartLabel}
        aria-describedby={`${chartId.current}-description`}
      >
        <div id={`${chartId.current}-description`} className="sr-only">
          {dataSummary}
        </div>
        <svg
          width="100%"
          height="100%"
          className="overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <title>{title || "Sankey Diagram"}</title>
          <desc>{dataSummary}</desc>
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
                stroke={theme.colors.primary}
                strokeWidth={Math.max(linkWidth, 2)}
                fill="none"
                opacity={0.3 + linkOpacity * 0.7}
                className={`transition-opacity ${reduceMotion ? "" : "hover:opacity-100"}`}
                aria-label={`Flow from ${link.source} to ${link.target}: ${link.value}`}
              />
            );
          })}

          {/* Nodes */}
          {nodePositions.map((node, index) => {
            const isLeft = index < nodes.length / 2;
            const x = isLeft ? 0 : 100;
            const width = (node.value / maxNodeValue) * 15;
            const nodeId = `${chartId.current}-node-${node.id}`;

            return (
              <g key={node.id}>
                <rect
                  x={isLeft ? x : x - width}
                  y={`${node.y}%`}
                  width={width}
                  height={`${node.height}%`}
                  fill={theme.colors.primary}
                  rx={2}
                  className={`transition-opacity ${reduceMotion ? "" : "hover:opacity-80"}`}
                  style={{
                    filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                    cursor: onNodeClick ? "pointer" : "default",
                  }}
                  onClick={() => onNodeClick?.(node)}
                  role="button"
                  tabIndex={onNodeClick ? 0 : -1}
                  aria-label={`${node.name}: ${node.value} (${Math.round((node.value / totalValue) * 100)}%)`}
                  onKeyDown={
                    onNodeClick
                      ? (e: React.KeyboardEvent<SVGRectElement>) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onNodeClick(node);
                          }
                        }
                      : undefined
                  }
                  id={nodeId}
                />
                <text
                  x={isLeft ? x + width + 5 : x - width - 5}
                  y={`${node.y + node.height / 2}%`}
                  dominantBaseline="middle"
                  textAnchor={isLeft ? "start" : "end"}
                  className="text-xs fill-foreground pointer-events-none"
                  style={{ fontFamily: theme.typography.axis.fontFamily }}
                >
                  {node.name} ({node.value})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {/* Data table for screen readers */}
      <div className="sr-only">
        <table>
          <caption>{title || "Sankey Diagram Data"}</caption>
          <thead>
            <tr>
              <th scope="col">Node</th>
              <th scope="col">Value</th>
              <th scope="col">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.id}>
                <td>{node.name}</td>
                <td>{node.value}</td>
                <td>{Math.round((node.value / totalValue) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
