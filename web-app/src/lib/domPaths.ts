export function serializeRange(range: Range, root: HTMLElement = document.body) {
  const startPath = getDomPath(range.startContainer, root);
  const endPath = getDomPath(range.endContainer, root);
  return {
    startPath,
    startOffset: range.startOffset,
    endPath,
    endOffset: range.endOffset
  };
}

export function deserializeRange(serialized: any, root: HTMLElement = document.body): Range | null {
  try {
    const startNode = getNodeFromPath(serialized.startPath, root);
    const endNode = getNodeFromPath(serialized.endPath, root);
    if (!startNode || !endNode) return null;

    const range = document.createRange();
    range.setStart(startNode, serialized.startOffset);
    range.setEnd(endNode, serialized.endOffset);
    return range;
  } catch (e) {
    console.warn('Could not restore range', e);
    return null;
  }
}

function getDomPath(node: Node, root: HTMLElement): number[] {
  const path: number[] = [];
  let current: Node | null = node;
  while (current && current !== root) {
    const parentEl: Node | null = current.parentNode;
    if (!parentEl) break;
    const index = Array.prototype.indexOf.call(parentEl.childNodes, current);
    path.unshift(index);
    current = parentEl;
  }
  return path;
}

function getNodeFromPath(path: number[], root: HTMLElement): Node | null {
  let current: Node = root;
  for (const index of path) {
    if (!current.childNodes || current.childNodes.length <= index) return null;
    current = current.childNodes[index];
  }
  return current;
}
