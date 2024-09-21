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

  extrudeNode(node, extrusionAmount = 1) {
    node.mesh.position.z += extrusionAmount;
    this.animatePulsatingColor(node);
  }

  animatePulsatingColor(node) {
    const originalColor = new THREE.Color(node.color); // Colore originale del nodo
    const highlightColor = new THREE.Color(0xffff00); // Colore per la pulsazione (giallo chiaro)
    const pulseSpeed = 0.01; // Riduci la velocità di pulsazione
    let pulseDirection = 1; // Direzione della pulsazione (1 = aumenta, -1 = diminuisce)
    let intensity = 0; // Intensità della transizione
  
    const pulse = () => {
      // Modifica l'intensità tra 0 e 1 per creare l'effetto di pulsazione
      intensity += pulseSpeed * pulseDirection;
  
      // Inverti la direzione se raggiungiamo i limiti di intensità
      if (intensity >= 1) {
        pulseDirection = -1;
        intensity = 1;
      } else if (intensity <= 0) {
        pulseDirection = 1;
        intensity = 0;
      }
  
      // Mescola tra il colore originale e il colore di evidenziazione in base all'intensità
      const pulsatingColor = originalColor.clone().lerp(highlightColor, intensity);
  
      // Imposta il nuovo colore del materiale del nodo
      node.mesh.material.color.set(pulsatingColor);
  
      // Richiama la prossima animazione
      node.pulseAnimation = requestAnimationFrame(pulse);
    };
  
    pulse(); // Avvia l'animazione
  }

  // Metodo per fermare l'estrusione e l'animazione del pulsare
  resetExtrudeNode(node) {
    node.mesh.position.z = node.initialZ; // Ripristina la posizione
    if (this.pulseAnimation) {
      cancelAnimationFrame(this.pulseAnimation);
      this.pulseAnimation = null;
    }
    node.mesh.material.color.set(node.originalColor || node.color); // Ripristina il colore
  }

  resetPulsation(node) {
    // Verifica se esiste un'animazione in corso
    if (node.pulseAnimation) {
      cancelAnimationFrame(node.pulseAnimation); // Ferma l'animazione
      node.pulseAnimation = null; // Reset dell'ID di animazione
    }
  
    // Resetta il colore del nodo al suo colore originale
    node.mesh.material.color.set(node.originalColor); // Colore originale
  
    // Resetta l'intensità e la direzione della pulsazione
    node.intensity = 0;
    node.pulseDirection = 1;
  }

  extrudeNodes(nodes) {
    nodes.forEach(node => {
      // Sposta il nodo sull'asse Z per l'estrusione
      node.mesh.position.z += 1; // Esempio di estrusione sull'asse Z
      
      // Avvia l'animazione di pulsazione per ciascun nodo
      this.animatePulsatingColor(node);
    });
  }

  resetNodesExtrusion(nodes) {
    nodes.forEach(node => {
      // Riporta il nodo alla posizione originale sull'asse Z
      node.mesh.position.z = node.initialZ;
  
      // Ferma la pulsazione del nodo
      this.resetPulsation(node);
    });
  }

  extrudeSelectedNodes() {
    const nodesToExtrude = [...this.selectedNodes];
    this.extrudeNodes(nodesToExtrude);
  }

  resetExtrusion() {
    const nodesToReset = [...this.selectedNodes];
    this.resetNodesExtrusion(nodesToReset)
  }

  
}

export default GraphInteractions;
