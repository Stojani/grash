import Node from '../model/Node';
import Edge from '../model/Edge';
import Path from '../model/Path';

class GraphOperations {
  
  // Dijkstra
  static findShortestPath(graph, startNode, targetNode) {
    const nodes = graph.nodes;
    const edges = graph.edges;

    const distances = {};
    const previousNodes = {};
    const unvisitedNodes = new Set(nodes);

    nodes.forEach(node => {
      distances[node.id] = Infinity;
      previousNodes[node.id] = null;
    });
    
    distances[startNode.id] = 0;

    while (unvisitedNodes.size > 0) {
      let currentNode = [...unvisitedNodes].reduce((a, b) => (distances[a.id] < distances[b.id] ? a : b));

      if (currentNode.id === targetNode.id) {
        const pathNodes = [];
        const pathEdges = [];
        let tempNode = targetNode;

        while (tempNode) {
          pathNodes.unshift(tempNode);
          const previous = previousNodes[tempNode.id];
          if (previous) {
            const edge = edges.find(e => 
              (e.source.id === tempNode.id && e.target.id === previous.id) || 
              (e.source.id === previous.id && e.target.id === tempNode.id)
            );
            pathEdges.unshift(edge);
          }
          tempNode = previous;
        }

        return new Path(pathNodes, pathEdges);
      }

      unvisitedNodes.delete(currentNode);

      const neighbors = edges
        .filter(edge => edge.source.id === currentNode.id || edge.target.id === currentNode.id)
        .map(edge => edge.source.id === currentNode.id ? edge.target : edge.source);

      neighbors.forEach(neighbor => {
        if (unvisitedNodes.has(neighbor)) {
          const distance = distances[currentNode.id] + this.getEdgeDistance(edges, currentNode, neighbor);
          if (distance < distances[neighbor.id]) {
            distances[neighbor.id] = distance;
            previousNodes[neighbor.id] = currentNode;
          }
        }
      });
    }

    return null;
  }

  static getEdgeDistance(edges, node1, node2) {
    const edge = edges.find(e => 
      (e.source.id === node1.id && e.target.id === node2.id) || 
      (e.source.id === node2.id && e.target.id === node1.id)
    );
    //console.log("Distance: "+edge.distance);
    return edge ? edge.distance || 1 : Infinity;
  }

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
    const edge = edges.find(e => 
      (e.source.id === sourceId && e.target.id === targetId) || 
      (e.source.id === targetId && e.target.id === sourceId)
    );
    if (edge) {
      edge.mesh.material.color.set(color);
    }
  }
}

export default GraphOperations;
