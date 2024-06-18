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
  
    static highlightEdge(edges, node1Id, node2Id, color = 'Yellow') {
      const edge = edges.find(e => (e.node1.id === node1Id && e.node2.id === node2Id) || (e.node1.id === node2Id && e.node2.id === node1Id));
      if (edge) {
        edge.mesh.material.color.set(color);
      }
    }
  }
  
  export default GraphOperations;