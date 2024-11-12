import Node from '../model/Node';
import Edge from '../model/Edge';

class Drawer {
  static fromJSON(jsonData) {
    const nodes = jsonData.nodes.map(nodeData => {
      const node = new Node(nodeData.id, nodeData.group, nodeData.x, nodeData.y, nodeData.z, nodeData.color, nodeData.geometry);
      if (!node.mesh) {
        console.error(`Node with ID ${nodeData.id} has no mesh.`);
      }
      return node;
    });

    const edges = jsonData.edges.map(edgeData => {
      const source = nodes.find(node => node.id === edgeData.source);
      const target = nodes.find(node => node.id === edgeData.target);
      if (!source || !source.mesh || !target || !target.mesh) {
        console.error(`Cannot create edge: one or both nodes are invalid.`);
        return null;
      }
      return new Edge(source, target, edgeData.value);
    }).filter(edge => edge !== null);

    return { nodes, edges };
  }

  static fromFile(fileContent) {
    const jsonData = JSON.parse(fileContent);
    return this.fromJSON(jsonData);
  }
}

export default Drawer;
