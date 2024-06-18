class Graph {
  constructor(nodes = [], edges = []) {
    this.nodes = nodes;
    this.edges = edges;
  }

  addNode(node) {
    this.nodes.push(node);
  }

  addEdge(edge) {
    this.edges.push(edge);
  }

  //highlightNode(node)
  //highlightEdge(edge)
  //highlight(nodes, edges)
  //minimumCostPath(node1, node2) {}
}

export default Graph;