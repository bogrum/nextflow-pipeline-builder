import React, { useRef, useEffect, useState } from 'react';
import { Pipeline, NextflowProcess } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import html2canvas from 'html2canvas';

interface VisNode {
  id: string; // process name
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisEdge {
  id: string;
  source: string; // process name
  target: string; // process name
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlX: number;
  controlY: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const X_SPACING = 80;
const Y_SPACING = 100; // Increased Y_SPACING for better curve visibility

// Define a default canvas size for layout calculations
const canvasSizeForLayout = { width: 800, height: 600 };

const parseWorkflow = (workflowContent: string, processes: NextflowProcess[]): { nodes: VisNode[], edges: VisEdge[] } => {
  const definedProcessNames = processes.map(p => p.name);
  const nodes: VisNode[] = [];
  const edges: VisEdge[] = [];
  const nodeMap = new Map<string, VisNode>();

  const processCallRegex = /(\w+)\s*\(([^)]*)\)/g;
  let match;
  const calledProcessInstances: { name: string, callId: string, inputs: string }[] = [];
  let callIndex = 0;

  if (typeof workflowContent !== 'string') {
    console.warn("Workflow content is not a string, visualizer will not parse.", workflowContent);
    return { nodes: [], edges: [] };
  }

  while ((match = processCallRegex.exec(workflowContent)) !== null) {
    const processName = match[1];
    if (definedProcessNames.includes(processName)) {
      calledProcessInstances.push({ name: processName, callId: `${processName}_${callIndex++}`, inputs: match[2] });
    }
  }
  
  const layers: string[][] = [];
  const nodeLayerMap = new Map<string, number>();
  const G: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  calledProcessInstances.forEach(inst => {
    if (!nodeMap.has(inst.name)) {
        const node: VisNode = { 
            id: inst.name, 
            name: inst.name, 
            x: 0, y: 0, 
            width: NODE_WIDTH, 
            height: NODE_HEIGHT 
        };
        nodes.push(node);
        nodeMap.set(inst.name, node);
        G[inst.name] = [];
        inDegree[inst.name] = 0;
    }
  });

  calledProcessInstances.forEach(targetInst => {
    const targetProcessName = targetInst.name;
    const inputArgs = targetInst.inputs;
    if (typeof inputArgs !== 'string') return;

    const sourceProcessRegex = /(\w+)\.out(?:\.\w+)?/g;
    let inputMatch;
    while((inputMatch = sourceProcessRegex.exec(inputArgs)) !== null) {
        const sourceProcessName = inputMatch[1];
        if (definedProcessNames.includes(sourceProcessName) && sourceProcessName !== targetProcessName) {
            const edgeId = `${sourceProcessName}->${targetProcessName}`;
            if (!edges.find(e => e.id === edgeId)) { 
                // Placeholder coords, will be set after node layout
                edges.push({ 
                    id: edgeId, 
                    source: sourceProcessName, 
                    target: targetProcessName,
                    startX: 0, startY: 0, endX: 0, endY: 0, controlX: 0, controlY: 0
                });
                if (G[sourceProcessName] && !G[sourceProcessName].includes(targetProcessName)) {
                    G[sourceProcessName].push(targetProcessName);
                }
                inDegree[targetProcessName] = (inDegree[targetProcessName] || 0) + 1;
            }
        }
    }
  });

  const queue: string[] = [];
  nodes.forEach(node => {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  });
  
  let currentLayer = 0;
  while(queue.length > 0) {
    const layerSize = queue.length;
    if (layerSize === 0) break; 
    layers[currentLayer] = [];
    for(let i=0; i < layerSize; i++) {
        const u = queue.shift()!;
        if (!u) continue; 
        layers[currentLayer].push(u);
        nodeLayerMap.set(u, currentLayer);

        (G[u] || []).forEach(v => {
            inDegree[v]--;
            if(inDegree[v] === 0) {
                queue.push(v);
            }
        });
    }
    currentLayer++;
  }

  layers.forEach((layer, layerIndex) => {
    const layerWidth = layer.length * NODE_WIDTH + (layer.length - 1) * X_SPACING;
    let currentX = (canvasSizeForLayout.width - layerWidth) / 2; 
    if (currentX < X_SPACING) currentX = X_SPACING;

    layer.forEach(nodeId => {
        const node = nodeMap.get(nodeId);
        if (node) {
            node.x = currentX;
            node.y = layerIndex * (NODE_HEIGHT + Y_SPACING) + Y_SPACING;
            currentX += NODE_WIDTH + X_SPACING;
        }
    });
  });
  
  edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (sourceNode && targetNode) {
      edge.startX = sourceNode.x + sourceNode.width / 2;
      edge.startY = sourceNode.y + sourceNode.height;
      edge.endX = targetNode.x + targetNode.width / 2;
      edge.endY = targetNode.y;

      // Calculate control point for quadratic Bezier curve
      // A simple approach: midpoint offset a bit
      const midX = (edge.startX + edge.endX) / 2;
      const midY = (edge.startY + edge.endY) / 2;
      
      // Offset perpendicular to the line between start and end points
      // For primarily vertical lines, offset horizontally. For horizontal, offset vertically.
      const dx = edge.endX - edge.startX;
      const dy = edge.endY - edge.startY;
      const length = Math.sqrt(dx*dx + dy*dy);
      const curvature = Math.min(length * 0.25, 50); // Adjust curvature amount

      if (Math.abs(dx) > Math.abs(dy)) { // More horizontal
        edge.controlX = midX;
        edge.controlY = midY - curvature * Math.sign(dx); // Bend "up" or "down"
      } else { // More vertical
        edge.controlX = midX + curvature; // Bend "outwards"
        edge.controlY = midY;
      }
       // Ensure control point creates a gentle arc downwards if source is above target
      if (edge.startY < edge.endY) { // typical top-to-bottom flow
        edge.controlX = (edge.startX + edge.endX) / 2 + ( (edge.startX === edge.endX) ? 30 : 0 ); // slight horizontal offset if straight vertical
        edge.controlY = edge.startY + (edge.endY - edge.startY) * 0.6; // control point further down sourceY
        if (edge.startX > edge.endX) {
             edge.controlX = edge.startX - (edge.startX - edge.endX) * 0.5 - 30;
        } else if (edge.startX < edge.endX) {
            edge.controlX = edge.startX + (edge.endX - edge.startX) * 0.5 + 30;
        }

      } else { // less common or more complex flows
        edge.controlX = midX + curvature; 
        edge.controlY = midY;
      }


    }
  });

  return { nodes, edges };
};


export const WorkflowVisualizer: React.FC<{ pipeline: Pipeline }> = ({ pipeline }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [visData, setVisData] = useState<{ nodes: VisNode[], edges: VisEdge[] }>({ nodes: [], edges: [] });
  const [canvasSize, setCanvasSize] = useState({width: 800, height: 600});
  const [errorVisualizing, setErrorVisualizing] = useState<string | null>(null);

  useEffect(() => {
    setErrorVisualizing(null);
    try {
      const { nodes, edges } = parseWorkflow(pipeline.workflowContent, pipeline.processes);
      setVisData({ nodes, edges });

      let maxX = 0;
      let maxY = 0;
      nodes.forEach(n => {
          if (n.x + n.width > maxX) maxX = n.x + n.width;
          if (n.y + n.height > maxY) maxY = n.y + n.height;
      });
      
      canvasSizeForLayout.width = Math.max(800, maxX + X_SPACING * 2); // Add more padding
      canvasSizeForLayout.height = Math.max(600, maxY + Y_SPACING * 2); // Add more padding
      setCanvasSize({width: canvasSizeForLayout.width, height: canvasSizeForLayout.height});

    } catch (err) {
        console.error("Error parsing workflow for visualization:", err);
        setErrorVisualizing(`Could not visualize workflow: ${err instanceof Error ? err.message : String(err)}`);
        setVisData({ nodes: [], edges: [] });
    }
  }, [pipeline.workflowContent, pipeline.processes]);

  const handleDownloadPNG = async () => {
    if (svgRef.current) {
      try {
        const canvas = await html2canvas(svgRef.current, { 
            backgroundColor: '#1f2937', // bg-gray-800 (card background)
            scale: 2 
        });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${pipeline.name || 'workflow'}_visualization.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Error generating PNG:', error);
        alert('Could not generate PNG. See console for details.');
      }
    }
  };
  
  const { nodes, edges } = visData;

  if (errorVisualizing) {
    return (
        <Card title="Workflow Visualizer" className="bg-gray-800">
            <p className="text-red-400">
                {errorVisualizing}
            </p>
             <p className="text-xs text-gray-500 mt-2">Please check the workflow content and process definitions for inconsistencies.</p>
        </Card>
    );
  }

  if (pipeline.processes.length === 0 && (!pipeline.workflowContent || !pipeline.workflowContent.trim())) {
    return (
        <Card title="Workflow Visualizer" className="bg-gray-800">
            <p className="text-gray-400">
                Define some processes and add calls to them in the Workflow tab to see a visualization.
            </p>
        </Card>
    );
  }
  
  if (nodes.length === 0 && pipeline.workflowContent && pipeline.workflowContent.trim()) {
     return (
        <Card title="Workflow Visualizer" className="bg-gray-800">
            <p className="text-gray-400 mb-4">
                Could not parse any known process calls from your workflow content, or no processes are defined that match calls in the workflow.
            </p>
            <p className="text-xs text-gray-500">Ensure process names in the 'Processes' tab match those called in the 'Workflow' tab (e.g., <code>MY_PROCESS_NAME(...)</code>).</p>
        </Card>
    );
  }

  return (
    <Card title="Workflow Visualizer" className="bg-gray-800" actions={
      <Button onClick={handleDownloadPNG} variant="primary" size="sm" disabled={nodes.length === 0}>
        Download as PNG
      </Button>
    }>
      <p className="text-sm text-gray-400 mb-4">
        This is a basic visualization of your workflow. More complex workflow structures might not be fully represented.
      </p>
      <div className="overflow-auto p-2 bg-gray-900 rounded-md border border-gray-700">
        <svg ref={svgRef} width={canvasSize.width} height={canvasSize.height} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9" // Adjusted for better placement on curve end
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#a0aec0" /> {/* gray-400 */}
            </marker>
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="2" dy="2" result="offsetblur"/>
              <feFlood floodColor="rgba(0,0,0,0.3)"/>
              <feComposite in2="offsetblur" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {edges.map(edge => (
            <path
              key={edge.id}
              d={`M ${edge.startX} ${edge.startY} Q ${edge.controlX} ${edge.controlY} ${edge.endX} ${edge.endY}`}
              stroke="#a0aec0" /* gray-400 */
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          ))}
          {nodes.map(node => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`} style={{ filter: 'url(#dropShadow)' }}>
              <rect
                width={node.width}
                height={node.height}
                rx="8"
                ry="8"
                fill="#374151" /* gray-700 */
                stroke="#0ea5e9" /* sky-500 */
                strokeWidth="1.5" 
              />
              <text
                x={node.width / 2}
                y={node.height / 2}
                dy=".3em"
                textAnchor="middle"
                fill="#e5e7eb" /* gray-200 */
                fontSize="14px"
                fontWeight="medium"
                fontFamily="Inter, sans-serif"
              >
                {node.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
       {nodes.length === 0 && pipeline.workflowContent && pipeline.workflowContent.trim() && !errorVisualizing && (
            <p className="mt-4 text-center text-gray-500">
                No process calls found in workflow content matching defined process names.
            </p>
        )}
    </Card>
  );
};