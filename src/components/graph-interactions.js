import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

class GraphInteractions {
  constructor(camera, renderer, scene, nodes, edges) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.nodes = nodes;
    this.edges = edges;
    this.controls = null;
    this.selectedNodes = [];
    this.selectedNode = null;
    this.hoveredNode = null;
    this.raycaster = new THREE.Raycaster();
    this.initOrbitControls();
    this.addEventListeners();
  }

  initOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.rotateSpeed = 0.3;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.8;
    this.controls.minPolarAngle = Math.PI / 4;
    this.controls.maxPolarAngle = Math.PI - Math.PI / 4;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
  }

  addEventListeners() {
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    //console.log('Mouse coordinates:', mouse);

    this.raycaster.setFromCamera(mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.nodes.map(node => node.mesh));
    if (intersects.length > 0) {
      const hoveredObject = intersects[0].object;
      this.highlightNode(hoveredObject);
    } else {
      this.unhighlightNode();
    }
    this.controls.update();
  }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.nodes.map(node => node.mesh));
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      this.selectNode(selectedObject);
    }
  }

  highlightNode(nodeMesh) {
    if (this.hoveredNode) {
      this.hoveredNode.resetHoverHighlight();
    }
    const hoveredNode = this.nodes.find(node => node.mesh === nodeMesh);
    if (hoveredNode) {
      hoveredNode.hoverHighlight();
      this.hoveredNode = hoveredNode;
    }
  }

  unhighlightNode() {
    if (this.hoveredNode) {
      this.hoveredNode.resetHoverHighlight();
      this.hoveredNode = null;
    }
  }

  selectNode(nodeMesh) {
    const selectedNode = this.nodes.find(node => node.mesh === nodeMesh);
    if (selectedNode) {
      const index = this.selectedNodes.indexOf(selectedNode);
      if (index === -1) {
        selectedNode.highlight();
        this.selectedNodes.push(selectedNode);
      } else {
        selectedNode.resetColor();
        this.selectedNodes.splice(index, 1);
      }
    }
  }

  update() {
    this.controls.update();
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  removeMouseMovements() {
    this.disableMouseRotation();
    this.disableMousePanning();
  }

  restoreMouseMovements() {
    this.enableMouseRotation();
    this.enableMousePanning();
  }

  enableMouseRotation() {
    this.controls.enableRotate = true;
  }

  disableMouseRotation() {
    this.controls.enableRotate = false;
  }

  enableMousePanning() {
    this.controls.enablePan = true;
  }

  disableMousePanning() {
    this.controls.enablePan = false;
  }

  removeNode(nodeMesh) {
    //console.log('entra 2');
    const nodeToRemove = this.nodes.find(node => node.mesh === nodeMesh);
    if (nodeToRemove) {
      // Remove edges associated with the node
      const edgesToRemove = this.edges.filter(edge => edge.source === nodeToRemove || edge.target === nodeToRemove);
      edgesToRemove.forEach(edge => {
        edge.removeFromScene(this.scene);
        this.edges = this.edges.filter(e => e !== edge);
      });

      // Remove node from the scene
      nodeToRemove.removeFromScene(this.scene);
      this.nodes = this.nodes.filter(node => node !== nodeToRemove);

      // If the removed node was selected or hovered, reset the selection and hover states
      if (this.selectedNode === nodeToRemove) {
        this.selectedNode = null;
      }
      if (this.hoveredNode === nodeToRemove) {
        this.hoveredNode = null;
      }
    }
  }

  removeSelectedNodes() {
    // Copia l'array dei nodi selezionati per evitare problemi durante l'iterazione
    const nodesToRemove = [...this.selectedNodes];
    nodesToRemove.forEach(node => {
      this.removeNode(node.mesh);
    });
  }
}

export default GraphInteractions;
