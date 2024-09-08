class GraphOperations {
    static highlightPath(nodes, path) {
      path.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          node.color = 0xffff00;
        }
      });
    }
  
    static highlightNode(nodes, nodeId, color = 'Lime') {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        node.color = color;
      }
    }
  
    static highlightEdge(edges, sourceId, targetId, color = 'Yellow') {
      const edge = edges.find(e => (e.source.id === sourceId && e.target.id === targetId) || (e.source.id === targetId && e.target.id === sourceId));
      if (edge) {
        edge.mesh.material.color.set(color);
      }
    }
  }
  
  export default GraphOperations;