import Node from '../model/Node';
import Edge from '../model/Edge';

class Drawer {
  
  static fromJSON(jsonData) {
    const nodes = jsonData.nodes.map(nodeData => {
      const node = new Node(nodeData.id, nodeData.x, nodeData.y, nodeData.z, nodeData.color, nodeData.geometry);
      if (!node.mesh) {
        console.error(`Node with ID ${nodeData.id} has no mesh.`);
      }
      return node;
    });
  
    const edges = jsonData.edges.map(edgeData => {
      const node1 = nodes.find(node => node.id === edgeData.node1);
      const node2 = nodes.find(node => node.id === edgeData.node2);
      if (!node1 || !node1.mesh || !node2 || !node2.mesh) {
        console.error(`Cannot create edge: one or both nodes are invalid.`);
        return null;
      }
      return new Edge(node1, node2);
    }).filter(edge => edge !== null);
  
    return { nodes, edges };
  }
  /*
  static fromJSON(json) {
    const nodes = json.nodes.map(nodeData => new Node(nodeData));
    const edges = json.edges.map(edgeData => {
      const fromNode = nodes.find(node => node.id === edgeData.from);
      const toNode = nodes.find(node => node.id === edgeData.to);
      if (!fromNode || !toNode) {
        throw new Error(`Invalid edge: ${edgeData.from} -> ${edgeData.to}`);
      }
      return new Edge(fromNode, toNode);
    });
    return { nodes, edges };
  }*/

  static fromFile(fileContent) {
    const jsonData = JSON.parse(fileContent);
    return this.fromJSON(jsonData);
  }
}

export default Drawer;
