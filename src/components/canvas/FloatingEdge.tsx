'use client';

import { EdgeProps, useStore, getBezierPath, BaseEdge, Position, InternalNode } from '@xyflow/react';

// Map a handle ID (e.g. "top-src", "right-tgt") to a Position enum.
function handleIdToPosition(handleId: string | null | undefined): Position | null {
  if (!handleId) return null;
  if (handleId.startsWith('top')) return Position.Top;
  if (handleId.startsWith('bottom')) return Position.Bottom;
  if (handleId.startsWith('left')) return Position.Left;
  if (handleId.startsWith('right')) return Position.Right;
  return null;
}

// For a given node, return the x,y coordinates of each handle position
// (the center point of each side of the node).
function getHandleCoords(node: InternalNode, position: Position) {
  const x = node.internals.positionAbsolute.x;
  const y = node.internals.positionAbsolute.y;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;

  switch (position) {
    case Position.Top:    return { x: x + w / 2, y: y };
    case Position.Bottom: return { x: x + w / 2, y: y + h };
    case Position.Left:   return { x: x,         y: y + h / 2 };
    case Position.Right:  return { x: x + w,     y: y + h / 2 };
  }
}

// Fallback: pick the handle on `node` that is closest to the center of `otherNode`.
function getClosestPosition(node: InternalNode, otherNode: InternalNode): Position {
  const otherX = otherNode.internals.positionAbsolute.x + (otherNode.measured?.width ?? 0) / 2;
  const otherY = otherNode.internals.positionAbsolute.y + (otherNode.measured?.height ?? 0) / 2;

  let bestPos = Position.Top;
  let bestDist = Infinity;

  for (const pos of [Position.Top, Position.Right, Position.Bottom, Position.Left]) {
    const coords = getHandleCoords(node, pos);
    const dist = Math.hypot(coords.x - otherX, coords.y - otherY);
    if (dist < bestDist) {
      bestDist = dist;
      bestPos = pos;
    }
  }

  return bestPos;
}

export default function FloatingEdge({ id, source, target, sourceHandleId, targetHandleId, style }: EdgeProps) {
  const { sourceNode, targetNode } = useStore((s) => ({
    sourceNode: s.nodeLookup.get(source),
    targetNode: s.nodeLookup.get(target),
  }));

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Use the stored handle IDs to determine fixed positions.
  // Fall back to closest-handle logic for edges without handle info (e.g. old DB data).
  const sourcePos = handleIdToPosition(sourceHandleId) ?? getClosestPosition(sourceNode, targetNode);
  const targetPos = handleIdToPosition(targetHandleId) ?? getClosestPosition(targetNode, sourceNode);

  const sourceCoords = getHandleCoords(sourceNode, sourcePos);
  const targetCoords = getHandleCoords(targetNode, targetPos);

  const [path] = getBezierPath({
    sourceX: sourceCoords.x,
    sourceY: sourceCoords.y,
    sourcePosition: sourcePos,
    targetX: targetCoords.x,
    targetY: targetCoords.y,
    targetPosition: targetPos,
  });

  return <BaseEdge id={id} path={path} style={style} />;
}
