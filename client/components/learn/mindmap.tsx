"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MindmapContent } from "@/lib/types";

type TreeNode = { id: string; label: string; children: TreeNode[] };
type Placed = {
  node: TreeNode;
  x: number;
  y: number;
  side: -1 | 0 | 1;
  depth: number;
  parent?: Placed;
};

const NODE_W = 176;
const NODE_H = 40;
const COL_GAP = 72;
const ROW_H = 52;

/** Builds a tree from the generated nodes/edges, tolerating stray edges. */
function buildTree(content: MindmapContent): TreeNode | null {
  const labels = new Map(content.nodes.map((node) => [node.id, node.label]));
  const childrenOf = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const edge of content.edges) {
    if (!labels.has(edge.source) || !labels.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    childrenOf.set(edge.source, [...(childrenOf.get(edge.source) ?? []), edge.target]);
    hasParent.add(edge.target);
  }

  const roots = content.nodes.filter((node) => !hasParent.has(node.id));
  const rootId =
    [...(roots.length ? roots : content.nodes)].sort(
      (a, b) => (childrenOf.get(b.id)?.length ?? 0) - (childrenOf.get(a.id)?.length ?? 0),
    )[0]?.id;
  if (!rootId) return null;

  const visited = new Set<string>();
  function build(id: string): TreeNode {
    visited.add(id);
    const children = (childrenOf.get(id) ?? [])
      .filter((child) => !visited.has(child))
      .map((child) => (visited.has(child) ? null : build(child)))
      .filter((child): child is TreeNode => child !== null);
    return { id, label: labels.get(id) ?? id, children };
  }
  return build(rootId);
}

function layout(root: TreeNode, collapsed: Set<string>) {
  const placed: Placed[] = [];
  const visibleChildren = (node: TreeNode) =>
    collapsed.has(node.id) ? [] : node.children;

  // Each visible leaf takes one row; parents sit centred on their children.
  function placeSubtree(
    node: TreeNode,
    depth: number,
    side: -1 | 1,
    rowStart: number,
    parent: Placed,
  ): { rows: number; item: Placed } {
    const item: Placed = {
      node,
      depth,
      side,
      parent,
      x: side * depth * (NODE_W + COL_GAP),
      y: 0,
    };
    placed.push(item);
    const kids = visibleChildren(node);
    if (kids.length === 0) {
      item.y = rowStart * ROW_H;
      return { rows: 1, item };
    }
    let rows = 0;
    const childItems: Placed[] = [];
    for (const child of kids) {
      const result = placeSubtree(child, depth + 1, side, rowStart + rows, item);
      rows += result.rows;
      childItems.push(result.item);
    }
    item.y = (childItems[0].y + childItems[childItems.length - 1].y) / 2;
    return { rows, item };
  }

  const rootItem: Placed = { node: root, depth: 0, side: 0, x: 0, y: 0 };
  placed.push(rootItem);

  const kids = visibleChildren(root);
  const half = Math.ceil(kids.length / 2);
  const sides: [TreeNode[], -1 | 1][] = [
    [kids.slice(0, half), 1],
    [kids.slice(half), -1],
  ];

  for (const [group, side] of sides) {
    let rows = 0;
    const items: Placed[] = [];
    for (const child of group) {
      const result = placeSubtree(child, 1, side, rows, rootItem);
      rows += result.rows;
      items.push(result.item);
    }
    // Centre each side vertically around the root.
    const offset = ((rows - 1) * ROW_H) / 2;
    const shift = (item: Placed) => {
      item.y -= offset;
    };
    placed
      .filter((item) => item.side === side)
      .forEach(shift);
  }

  const xs = placed.map((item) => item.x);
  const ys = placed.map((item) => item.y);
  const bounds = {
    minX: Math.min(...xs) - NODE_W / 2 - 24,
    maxX: Math.max(...xs) + NODE_W / 2 + 24,
    minY: Math.min(...ys) - NODE_H / 2 - 24,
    maxY: Math.max(...ys) + NODE_H / 2 + 24,
  };
  return { placed, bounds };
}

function collectIds(node: TreeNode, depthLimit: number, depth = 0, out = new Set<string>()) {
  if (depth >= depthLimit && node.children.length) out.add(node.id);
  node.children.forEach((child) => collectIds(child, depthLimit, depth + 1, out));
  return out;
}

export function Mindmap({
  content,
  onSelect,
}: {
  content: MindmapContent;
  onSelect?: (label: string) => void;
}) {
  const root = useMemo(() => buildTree(content), [content]);
  // Start with only the first ring of branches open.
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    root ? collectIds(root, 1) : new Set(),
  );
  const [zoom, setZoom] = useState(1);

  const result = useMemo(
    () => (root ? layout(root, collapsed) : null),
    [root, collapsed],
  );

  if (!root || !result) {
    return <p className="text-sm text-muted-foreground">This mind map is empty.</p>;
  }

  const { placed, bounds } = result;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const allCollapsible = collectIds(root, 0);
  allCollapsible.delete(root.id);

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Use the arrows to expand or collapse branches.
          {onSelect ? " Select a node to explore it in chat." : ""}
        </p>
        <div className="flex gap-1">
          <Button variant="outline" size="xs" onClick={() => setCollapsed(new Set())}>
            <Maximize2 />
            Expand all
          </Button>
          <Button variant="outline" size="xs" onClick={() => setCollapsed(allCollapsible)}>
            <Minimize2 />
            Collapse
          </Button>
        </div>
      </div>

      <div className="relative h-[65vh] overflow-auto rounded-3xl border bg-[radial-gradient(circle,var(--color-border)_1px,transparent_1px)] [background-size:20px_20px]">
        <div
          className="relative mx-auto origin-top-left"
          style={{
            width: width * zoom,
            height: height * zoom,
            minWidth: "100%",
          }}
        >
          <div
            className="absolute top-0 left-1/2"
            style={{
              width,
              height,
              transform: `translateX(-50%) scale(${zoom})`,
              transformOrigin: "top center",
            }}
          >
            <svg width={width} height={height} className="absolute inset-0">
              {placed
                .filter((item) => item.parent)
                .map((item) => {
                  const parent = item.parent!;
                  const sx = parent.x - bounds.minX + (item.side * NODE_W) / 2;
                  const sy = parent.y - bounds.minY;
                  const tx = item.x - bounds.minX - (item.side * NODE_W) / 2;
                  const ty = item.y - bounds.minY;
                  const mx = (sx + tx) / 2;
                  return (
                    <path
                      key={`${parent.node.id}-${item.node.id}`}
                      d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`}
                      fill="none"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      className="stroke-primary/70"
                    />
                  );
                })}
            </svg>

            {placed.map((item) => {
              const hasKids = item.node.children.length > 0;
              const isCollapsed = collapsed.has(item.node.id);
              const isRoot = item.depth === 0;
              return (
                <div
                  key={item.node.id}
                  className={cn(
                    "absolute flex items-center gap-1",
                    item.side === -1 && "flex-row-reverse",
                  )}
                  style={{
                    left: item.x - bounds.minX - NODE_W / 2,
                    top: item.y - bounds.minY - NODE_H / 2,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect?.(item.node.label)}
                    title={item.node.label}
                    className={cn(
                      "h-full min-w-0 flex-1 truncate rounded-2xl border px-3 text-xs font-medium transition-colors",
                      isRoot
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:border-primary/60",
                    )}
                  >
                    {item.node.label}
                  </button>
                  {hasKids && !isRoot && (
                    <button
                      type="button"
                      onClick={() => toggle(item.node.id)}
                      aria-label={isCollapsed ? "Expand branch" : "Collapse branch"}
                      className="grid size-5 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground hover:text-foreground"
                    >
                      {(item.side === 1) === isCollapsed ? (
                        <ChevronRight className="size-3" />
                      ) : (
                        <ChevronLeft className="size-3" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-3 left-3 flex w-fit flex-col gap-1 rounded-2xl border bg-card p-1 shadow-sm">
          <Button variant="ghost" size="icon-xs" onClick={() => setZoom((z) => Math.min(2, z + 0.15))}>
            <Plus />
            <span className="sr-only">Zoom in</span>
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}>
            <Minus />
            <span className="sr-only">Zoom out</span>
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => setZoom(1)}>
            <RotateCcw />
            <span className="sr-only">Reset zoom</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
