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
    this.nodeInfoPopUp = null;
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
          this.showPopup(selectedNode); // Mostra il popup con i dettagli del nodo
      } else {
          selectedNode.resetColor();
          this.selectedNodes.splice(index, 1);
          this.hidePopup(); // Nascondi il popup se deselezionato
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
    const nodeToRemove = this.nodes.find(node => node.mesh === nodeMesh);
    if (nodeToRemove) {
      // Trova e rimuovi tutti gli archi collegati a questo nodo
      const edgesToRemove = this.edges.filter(edge => edge.source === nodeToRemove || edge.target === nodeToRemove);
  
      edgesToRemove.forEach(edge => {
        // Rimuovi l'arco dalla scena e libera le risorse
        if (edge.mesh && edge.mesh.parent) {
          edge.mesh.parent.remove(edge.mesh);
          edge.mesh.geometry.dispose(); // Rilascia la geometria dell'arco
          edge.mesh.material.dispose(); // Rilascia il materiale dell'arco
        }
      });
  
      // Aggiorna l'array degli archi rimuovendo quelli collegati al nodo eliminato
      this.edges = this.edges.filter(edge => !edgesToRemove.includes(edge));
  
      // Rimuovi il nodo dalla scena
      if (nodeToRemove.mesh && nodeToRemove.mesh.parent) {
        nodeToRemove.mesh.parent.remove(nodeToRemove.mesh);
        nodeToRemove.mesh.geometry.dispose(); // Rilascia la geometria del nodo
        nodeToRemove.mesh.material.dispose(); // Rilascia il materiale del nodo
      }
  
      // Aggiorna l'array dei nodi
      this.nodes = this.nodes.filter(node => node !== nodeToRemove);
  
      // Resetta lo stato di selezione ed evidenziazione se necessario
      this.selectedNodes = this.selectedNodes.filter(node => node !== nodeToRemove);
      if (this.hoveredNode === nodeToRemove) {
        this.hoveredNode = null;
      }
    }
  }

  removeSelectedNodes() {
    const nodesToRemove = [...this.selectedNodes];
    nodesToRemove.forEach(node => {
      this.removeNode(node.mesh);
    });
    this.selectedNodes = [];
  }

  createPopup(node) {
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: this.createTextTexture(`ID: ${node.id}\nX: ${node.x}\nY: ${node.y}\nZ: ${node.z}`),
        transparent: true
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    
    // Posizionamento del popup leggermente sopra e a destra del nodo
    sprite.position.copy(node.mesh.position);

    sprite.position.y += 2; // Sposta leggermente sopra

    sprite.scale.set(3, 3, 1); // Regola la dimensione della nuvoletta

    this.nodeInfoPopUp = sprite;
    this.scene.add(this.nodeInfoPopUp);
    
  }

createTextTexture(text) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const lines = text.split('\n'); // Dividi il testo in righe

  const fontSize = 14; // Dimensione ridotta del testo
  const lineHeight = fontSize * 1.2;
  const padding = 8; // Riduciamo il padding

  // Calcoliamo la larghezza massima e l'altezza totale del testo
  const maxWidth = Math.max(...lines.map(line => context.measureText(line).width)) + padding * 2;
  const totalHeight = lineHeight * lines.length + padding * 2;

  // Miglioriamo la risoluzione del canvas
  const scaleFactor = 3; // Fattore di scala maggiore per alta risoluzione
  canvas.width = maxWidth * scaleFactor;
  canvas.height = totalHeight * scaleFactor;
  context.scale(scaleFactor, scaleFactor);

  // Disegniamo la "nuvoletta" senza la punta
  context.beginPath();
  context.moveTo(padding, padding);
  context.lineTo(maxWidth - padding, padding);
  context.quadraticCurveTo(maxWidth, padding, maxWidth, padding * 2);
  context.lineTo(maxWidth, totalHeight - padding);
  context.quadraticCurveTo(maxWidth, totalHeight, maxWidth - padding, totalHeight);
  context.lineTo(padding, totalHeight);
  context.quadraticCurveTo(0, totalHeight, 0, totalHeight - padding);
  context.lineTo(0, padding * 2);
  context.quadraticCurveTo(0, padding, padding, padding);
  context.closePath();

  context.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Sfondo semi-trasparente
  context.fill();

  // Disegniamo il testo
  context.font = `${fontSize}px Arial`;
  context.fillStyle = 'rgba(0, 0, 0, 1)'; // Colore del testo nero
  lines.forEach((line, index) => {
      context.fillText(line, padding, lineHeight * (index + 1) + padding);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true; 
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

  showPopup(node) {
    if (this.nodeInfoPopUp) {
        this.scene.remove(this.nodeInfoPopUp); // Rimuovi il popup precedente, se esiste
    }
    this.createPopup(node); // Crea e aggiungi il nuovo popup
  }

  hidePopup() {
    if (this.nodeInfoPopUp) {
        this.scene.remove(this.nodeInfoPopUp);
        this.nodeInfoPopUp = null;
    }
  }
}

export default GraphInteractions;
