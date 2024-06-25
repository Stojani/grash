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
  //minimumCostPath(source, target) {}
}

export default Graph;