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
    this.selectedEdges = [];
    this.selectedEdge = null;
    this.hoveredNode = null;
    this.hoveredEdge = null;
    this.raycaster = new THREE.Raycaster();
    this.nodeInfoPopUp = null;
    this.flagShowNodePopUp = true;
    this.flagNeighboursHighlight = false;
    this.flagGroupNodesHighlight = false;
    this.lensEnabled = false;
    this.lensRadius = 5;
    this.highlightedNodesInLens = [];
    this.activePopups = new Map();
    this.popupPositions = [];
    this.exploreModeEnabled = true;
    this.editModeEnabled = false;
    this.analyticsModeEnabled = false;
    this.initOrbitControls();
    this.addEventListeners();
  }

  initOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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

    this.raycaster.setFromCamera(mouse, this.camera);

    if (this.lensEnabled) {
      //this.highlightNodesInLens(mouse);
      return;
    }

    const nodeIntersects = this.raycaster.intersectObjects(this.nodes.map(node => node.mesh));
    if (nodeIntersects.length > 0) {
      const hoveredObject = nodeIntersects[0].object;
      this.highlightNode(hoveredObject);
      this.showNodeTooltip(hoveredObject, event);
      if (this.flagNeighboursHighlight) {
        this.highlightNodeNeighbours(hoveredObject);
      } else if (this.flagGroupNodesHighlight) {
        this.highlightGroupNodes(hoveredObject);
      }
    } else {
      if (this.flagNeighboursHighlight) {
        this.unhighlightNodeNeighbours();
      } else if (this.flagGroupNodesHighlight) {
        this.unhighlightGroupNodes();
      }
      this.unhighlightNode();
      this.hideNodeTooltip();
        
    }

    const edgeIntersects = this.raycaster.intersectObjects(this.edges.map(edge => edge.mesh), true);

    if (edgeIntersects.length > 0) {

      const hoveredEdgeObject = edgeIntersects[0].object;
      const hoveredEdge = this.edges.find(edge => edge.mesh === hoveredEdgeObject);

      if (hoveredEdge && hoveredEdge !== this.hoveredEdge) {
        this.unhighlightEdge(this.hoveredEdge);
        this.highlightEdge(hoveredEdge);
        this.hoveredEdge = hoveredEdge;
      }
    } else if (this.hoveredEdge) {
      this.unhighlightEdge(this.hoveredEdge);
      this.hoveredEdge = null;
    }

    this.controls.update();
  }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.camera);

    const nodeIntersects = this.raycaster.intersectObjects(this.nodes.map(node => node.mesh));
    if (nodeIntersects.length > 0) {
        const selectedNode = nodeIntersects[0].object;
        this.selectNode(selectedNode);
    } else {
        const edgeIntersects = this.raycaster.intersectObjects(this.edges.map(edge => edge.mesh));
        if (edgeIntersects.length > 0) {
            const selectedEdge = edgeIntersects[0].object;
            this.selectEdge(selectedEdge);
        }
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

  getNodeNeighbours(node) {
    const neighbours = this.edges
      .filter(edge => edge.source === node || edge.target === node)
      .map(edge => (edge.source === node ? edge.target : edge.source));
    return neighbours;
  }

  highlightNodeNeighbours(nodeMesh) {
    if (this.hoveredNode) {
      const neighbours = this.getNodeNeighbours(this.hoveredNode);
      neighbours.forEach(neighbour => neighbour.hoverHighlight(0xff8000));//orange color
    }
  }

  unhighlightNodeNeighbours() {
    if (this.hoveredNode) {
      const neighbours = this.getNodeNeighbours(this.hoveredNode);
      neighbours.forEach(neighbour => neighbour.resetHoverHighlight());
    }
  }

  highlightGroupNodes(nodeMesh) { 
    if (this.hoveredNode) {
      const groupNodes = this.nodes.filter(node => node.group === this.hoveredNode.group);
      groupNodes.forEach(node => node.hoverHighlight(0xff8000));//orange color
    }
  }

  unhighlightGroupNodes() {
    if (this.hoveredNode) {
      const groupNodes = this.nodes.filter(node => node.group === this.hoveredNode.group);
      groupNodes.forEach(node => node.resetHoverHighlight());
    }
  }

  selectNode(nodeMesh) {
    const selectedNode = this.nodes.find(node => node.mesh === nodeMesh);
    if (selectedNode) {
      const index = this.selectedNodes.indexOf(selectedNode);
      if (index === -1) {
          selectedNode.highlight();
          this.selectedNodes.push(selectedNode);
          if (this.flagShowNodePopUp) {
            //this.showTestPopup(selectedNode);
            this.showFixedPopup(selectedNode);
          }
      } else {
          selectedNode.resetColor();
          this.selectedNodes.splice(index, 1);
          this.hideFixedPopup(selectedNode);
      }
    }
  }

  //ARCHI
  calculateDistanceToEdge(mousePosition, edge) {
    const start = edge.source.mesh.position;
    const end = edge.target.mesh.position;

    const lineVec = new THREE.Vector3().subVectors(end, start);
    const startToMouse = new THREE.Vector3().subVectors(mousePosition, start);

    const projectionLength = startToMouse.dot(lineVec) / lineVec.lengthSq();
    const closestPoint = start.clone().add(lineVec.multiplyScalar(projectionLength));

    return mousePosition.distanceTo(closestPoint);
  }

  highlightEdgeOnProximity(mousePosition) {
    let closestEdge = null;
    let minDistance = Infinity;

    this.edges.forEach(edge => {
        const distance = this.calculateDistanceToEdge(mousePosition, edge);

        if (distance < 0.2 && distance < minDistance) {
            closestEdge = edge;
            minDistance = distance;
        }
    });

    if (closestEdge) {
        this.highlightEdge(closestEdge);
    } else {
        this.unhighlightAllEdges();
    }
  }

  highlightEdge(edge) {
    if (edge && edge.mesh && edge.mesh.material) {
      if (!this.selectedEdges.includes(edge)) {
        edge.highlight('#FFD700');
      }
    }
  }

  unhighlightEdge(edge) {
    if (edge && edge.mesh && edge.mesh.material && edge.originalColor !== undefined) {
      if (!this.selectedEdges.includes(edge)) {
        edge.unhighlight(edge.defaultColor);
      }
    }
  }

  unhighlightAllEdges() {
    this.edges.forEach(edge => {
      if (edge && edge.mesh && edge.mesh.material) {
        edge.unhighlight(edge.defaultColor);
      }
    });
  }

  selectEdge(edge) {
    const selectedEdge = this.edges.find(e => e.mesh === edge);

    if (selectedEdge) {
        const index = this.selectedEdges.indexOf(selectedEdge);

        if (index === -1) {
            selectedEdge.color = '#FF0000';
            this.selectedEdges.push(selectedEdge);
        } else {
            selectedEdge.resetColor();
            this.selectedEdges.splice(index, 1);
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

  enableRotationAroundTest() {
    this.controls.enableRotate = true;

    // Permette la rotazione completa sull'asse azimutale attorno a Z
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;

    // Blocca l'angolo polare per mantenere la vista sul piano YZ
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Disabilita la panoramica per evitare spostamenti laterali della camera
    this.controls.enablePan = false;
  }

  enableRotationAroundY() {
    this.controls.enableRotate = true;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.minPolarAngle = 0; // Blocca movimenti sull'asse Z (zenitale)
    this.controls.maxPolarAngle = Math.PI; // Mantiene la rotazione libera su Y
  }

  disableRotationAroundY() {
    this.controls.enableRotate = false;
    this.controls.minPolarAngle = 0; // Permette di tornare alle rotazioni libere su X, Y e Z
    this.controls.maxPolarAngle = Math.PI;
  }

  enableRotationAroundZ() {
    this.controls.enableRotate = true;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.minPolarAngle = Math.PI / 2; // Blocca rotazione su X e Y
    this.controls.maxPolarAngle = Math.PI / 2;
  }

  disableRotationAroundZ() {
    this.controls.enableRotate = false;
    this.controls.minPolarAngle = 0; // Permette rotazioni libere su X e Y
    this.controls.maxPolarAngle = Math.PI;
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
      const edgesToRemove = this.edges.filter(edge => edge.source === nodeToRemove || edge.target === nodeToRemove);
  
      edgesToRemove.forEach(edge => {
        if (edge.mesh && edge.mesh.parent) {
          edge.mesh.parent.remove(edge.mesh);
          edge.mesh.geometry.dispose();
          edge.mesh.material.dispose();
        }
      });
  
      this.edges = this.edges.filter(edge => !edgesToRemove.includes(edge));
  
      if (nodeToRemove.mesh && nodeToRemove.mesh.parent) {
        nodeToRemove.mesh.parent.remove(nodeToRemove.mesh);
        nodeToRemove.mesh.geometry.dispose();
        nodeToRemove.mesh.material.dispose();
      }
  
      this.nodes = this.nodes.filter(node => node !== nodeToRemove);
  
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

  removeExistingPopUpInfo() {
    this.selectedNodes.forEach(node => {
      this.hideFixedPopup(node);
    });
  }


  // ------------------- POPUP INFO --------------------- VERSION 1.0
  createOldPopup(node) {
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: this.createTextTexture(`id: ${node.id}\nGroup: ${node.group}\nx: ${node.x}\ny: ${node.y}\nz: ${node.z}`),
      transparent: true
    });

    const sprite = new THREE.Sprite(spriteMaterial);   
    sprite.position.copy(node.mesh.position);
    sprite.position.y += 2;
    sprite.scale.set(3, 3, 1);

    this.nodeInfoPopUp = sprite;
    this.scene.add(this.nodeInfoPopUp);
    
  }

  createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const lines = text.split('\n');

    const fontSize = 14;
    const lineHeight = fontSize * 1.2;
    const padding = 8;

    const maxWidth = Math.max(...lines.map(line => context.measureText(line).width)) + padding * 2;
    const totalHeight = lineHeight * lines.length + padding * 2;

    const scaleFactor = 3;
    canvas.width = maxWidth * scaleFactor;
    canvas.height = totalHeight * scaleFactor;
    context.scale(scaleFactor, scaleFactor);

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

    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fill();

    context.font = `${fontSize}px Arial`;
    context.fillStyle = 'rgba(0, 0, 0, 1)';
    lines.forEach((line, index) => {
        context.fillText(line, padding, lineHeight * (index + 1) + padding);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true; 
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  showOldPopup(node) {
    if (this.nodeInfoPopUp) {
      this.scene.remove(this.nodeInfoPopUp);
    }
    this.createPopup(node);
  }

  hideOldPopup() {
    if (this.nodeInfoPopUp) {
        this.scene.remove(this.nodeInfoPopUp);
        this.nodeInfoPopUp = null;
    }
  }

  //LAST VERSION - modifiable popUp info
  createPopupElement(nodeId) { 
    if (!document.getElementById(`node-popup-${nodeId}`)) {
      const popup = document.createElement('div');
      popup.id = `node-popup-${nodeId}`;
      popup.style.position = 'absolute';
      popup.style.padding = '10px';
      popup.style.background = 'rgba(255, 255, 255, 0.9)';
      popup.style.border = '1px solid #ccc';
      popup.style.borderRadius = '8px';
      popup.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      popup.style.display = 'none';
      popup.style.zIndex = '1000';
      document.body.appendChild(popup);
    }
  }

  showFixedPopup(node) {
    // Crea o recupera il popup
    let popup = document.getElementById(`node-popup-${node.id}`);
    if (!popup) {
        this.createPopupElement(node.id);
        popup = document.getElementById(`node-popup-${node.id}`);
        popup.classList.add('node-popup');
    }
    //popup.innerHTML = ''; // Svuota il contenuto precedente
    popup.style.display = 'block';

    // Titolo del popup
    const title = document.createElement('h5');
    title.textContent = `Node: ${node.id}`;
    title.style.marginBottom = '8px';
    popup.appendChild(title);
    // Campi del nodo da visualizzare
    const fields = [
      { key: 'name', label: 'Name', editable: this.editModeEnabled },
      { key: 'group', label: 'Group', editable: this.editModeEnabled },
      { key: 'x', label: 'X', editable: false },
      { key: 'y', label: 'Y', editable: false },
      { key: 'z', label: 'Z', editable: false },
      { key: 'color', label: 'Color', editable: this.editModeEnabled }
    ];
  
    fields.forEach(field => {
      const fieldContainer = document.createElement('div');
      fieldContainer.style.marginBottom = '6px';
  
      const label = document.createElement('label');
      label.textContent = field.label;
      label.style.marginRight = '8px';
  
      const input = document.createElement('input');
      input.type = field.key === 'color' ? 'color' : 'text';
      input.value = node[field.key];
      input.style.width = field.key === 'color' ? '50px' : '100px';
  
      if (!field.editable) {
        input.disabled = true;
      } else {
        input.oninput = () => {
          node[field.key] =
            field.key === 'group' || field.key === 'name'
              ? input.value
              : parseFloat(input.value) || input.value;
          if (field.key === 'color') {
            node.color = input.value;
          }
        };
      }
  
      fieldContainer.appendChild(label);
      fieldContainer.appendChild(input);
      popup.appendChild(fieldContainer);
    });

    const baseTop = window.innerHeight * 0.3; // Punto di partenza in alto
    popup.style.right = '10px';
    popup.style.top = `${baseTop}px`;

    const finalTop = baseTop;
    popup.style.top = `${finalTop}px`;

    // Crea la linea DOM se non esiste
    let line = document.getElementById(`line-to-popup-${node.id}`);
    if (!line) {
        line = document.createElement('div');
        line.id = `line-to-popup-${node.id}`;
        line.style.position = 'absolute';
        line.style.border = '1px solid black';
        line.style.transformOrigin = 'top left'; // Ruota intorno all'inizio
        line.style.zIndex = '999';
        document.body.appendChild(line);
    }

    // Calcola e assegna una posizione senza sovrapposizione
    this.positionPopup(popup);

    // Salva il riferimento per aggiornare la posizione
    this.activePopups.set(node.id, { popup, line, node });

    // Aggiorna la posizione iniziale della linea
    this.updatePopupAndLine(node.id);
  }

  positionPopup(popup) {
  
    // Ottieni la dimensione e posizione del popup
    const rect = popup.getBoundingClientRect();
    const popupWidth = rect.width;
    const popupHeight = rect.height;
  
    // Trova una posizione libera
    let positionFound = false;
    let offset = window.innerHeight * 0.3; // Offset per spostare il popup in caso di sovrapposizione
    while (!positionFound) {
      const potentialTop = `${offset}px`;
      const potentialRight = '10px'; // Posizioniamo sempre a destra
  
      // Verifica se la posizione è occupata
      const isOccupied = this.popupPositions.some(
        ([top, right]) => top === potentialTop && right === potentialRight
      );
  
      if (!isOccupied) {
        // Posiziona il popup nella posizione trovata
        popup.style.right = potentialRight;
        popup.style.top = potentialTop;
        popup.style.transform = 'translateY(-50%)';
  
        // Aggiungi la posizione all'elenco delle posizioni occupate
        this.popupPositions.push([potentialTop, potentialRight]);
        positionFound = true;
      } else {
        offset += popupHeight + 10; // Sposta il popup in basso
      }
    }
  }

  updatePopupAndLine(nodeId) {
    const entry = this.activePopups.get(nodeId);
    if (!entry) return;
  
    const { popup, line, node } = entry;
  
    // Ottieni il bounding rect del canvas di Three.js
    const rect = this.renderer.domElement.getBoundingClientRect();
  
    // Ottieni la posizione 3D del nodo e proietta nello spazio dello schermo
    const nodePosition = new THREE.Vector3();
    node.mesh.getWorldPosition(nodePosition);
  
    // Calcola la posizione proiettata in 2D del nodo
    const projectedNode = nodePosition.clone();
    projectedNode.project(this.camera);
  
    const nodeScreenX = ((projectedNode.x + 1) / 2) * rect.width + rect.left;
    const nodeScreenY = ((-projectedNode.y + 1) / 2) * rect.height + rect.top;
  
    // Ottieni la posizione del popup
    const popupRect = popup.getBoundingClientRect();
    const popupX = popupRect.left;
    const popupY = popupRect.top + popupRect.height / 2;
  
    // Calcola la distanza e l'angolo tra i due punti
    const deltaX = popupX - nodeScreenX;
    const deltaY = popupY - nodeScreenY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  
    // Posiziona la linea nel DOM
    line.style.left = `${nodeScreenX}px`;
    line.style.top = `${nodeScreenY}px`;
    line.style.width = `${distance}px`;
    line.style.transform = `rotate(${angle}deg)`;
  }

  hideFixedPopup(node) {
    const entry = this.activePopups.get(node.id);
    if (!entry) return;
  
    const { popup, line } = entry;
  
    // Ottieni la posizione attuale del popup
    const popupTop = popup.style.top;
    const popupRight = popup.style.right;
  
    // Rimuovi la posizione corrispondente da `popupPositions`
    this.popupPositions = this.popupPositions.filter(
      ([top, right]) => top !== popupTop || right !== popupRight
    );
  
    // Rimuovi popup e linea dal DOM
    if (popup) document.body.removeChild(popup);
    if (line) document.body.removeChild(line);
  
    // Rimuovi dalla mappa dei popup attivi
    this.activePopups.delete(node.id);
  }
  
  oldHideFixedPopup(node) {
    const popup = document.getElementById(`node-popup-${node.id}`);
    const line = document.getElementById(`line-to-popup-${node.id}`);

    if (popup) document.body.removeChild(popup);
    if (line) document.body.removeChild(line);

    this.currentPopup = null;
  }

  removeFixedPopupElement(nodeId) {
    const popup = document.getElementById(`node-popup-${nodeId}`);
    if (popup) {
      document.body.removeChild(popup);
    }
  }
  //END 4.0

  extrudeNode(node, extrusionAmount = 1) {
    node.mesh.position.z += extrusionAmount;
    this.animatePulsatingColor(node);
  }

  animatePulsatingColor(node) {
    const originalColor = new THREE.Color(node.color);
    const highlightColor = new THREE.Color(0xffff00);
    const pulseSpeed = 0.01;
    let pulseDirection = 1;
    let intensity = 0;
  
    const pulse = () => {
      intensity += pulseSpeed * pulseDirection;
  
      if (intensity >= 1) {
        pulseDirection = -1;
        intensity = 1;
      } else if (intensity <= 0) {
        pulseDirection = 1;
        intensity = 0;
      } 
      const pulsatingColor = originalColor.clone().lerp(highlightColor, intensity);
      node.mesh.material.color.set(pulsatingColor);
      node.pulseAnimation = requestAnimationFrame(pulse);
    };
    pulse();
  }

  resetPulsation(node) {
    if (node.pulseAnimation) {
      cancelAnimationFrame(node.pulseAnimation);
      node.pulseAnimation = null;
    }
  
    node.mesh.material.color.set(node.originalColor);
    node.intensity = 0;
    node.pulseDirection = 1;
  }

  resetExtrudeNode(node) {
    node.mesh.position.z = node.initialZ;
    if (this.pulseAnimation) {
      cancelAnimationFrame(this.pulseAnimation);
      this.pulseAnimation = null;
    }
    node.mesh.material.color.set(node.originalColor || node.color);
  }

  //NODES EXTRUSION
  extrudeNodeAsMushroomWithStem(node, extrusionHeight = 0.5, duration = 2000) {
    const initialZ = node.mesh.position.z;
    const startTime = performance.now();
  
    const baseRadius = 0.3;
    const topRadius = 0.15;
  
    const height = Math.abs(extrusionHeight - initialZ);
    const stemGeometry = new THREE.CylinderGeometry(topRadius, baseRadius,  height, 32);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#999999', transparent: true, opacity: 0.8 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.rotation.x = Math.PI / 2;
    stem.position.set(node.mesh.position.x, node.mesh.position.y, initialZ);
    stem.scale.y = 0;
    this.scene.add(stem);
    node.extrusionStem = stem;
  
    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
  
      const z = initialZ + progress * (extrusionHeight - initialZ);
      node.mesh.position.z = z;
  
      stem.scale.y = progress;
      stem.position.z = initialZ + (progress * height) / 2;
  
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
  
    requestAnimationFrame(animate);
  }

  resetNodeExtrusion(node, extrusionHeight = 0.5, duration = 2000) {
    const stem = node.extrusionStem;
    const finalZ = node.mesh.position.z;
    const initialZ = finalZ - extrusionHeight;
    const startTime = performance.now();
    const height = Math.abs(finalZ - initialZ);

    const animateReset = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      node.mesh.position.z = finalZ - progress * (finalZ - initialZ);

      stem.scale.y = 1 - progress;
      stem.position.z = (height * (1 - progress)) / 2;

      if (progress >= 1) {
        this.scene.remove(stem);
        stem.geometry.dispose();
        stem.material.dispose();
        node.extrusionStem = null;
      }

      if (progress < 1) {
        requestAnimationFrame(animateReset);
      }
    };
  
    requestAnimationFrame(animateReset);
  }

  resetGenericNodeExtrusion(node, duration = 2000) {
    const stem = node.extrusionStem;
    const finalZ = node.mesh.position.z;
    const initialZ = 0;
    const startTime = performance.now();
    const height = Math.abs(finalZ - initialZ);

    const animateReset = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      node.mesh.position.z = finalZ - progress * (finalZ - initialZ);

      stem.scale.y = 1 - progress;
      stem.position.z = (height * (1 - progress)) / 2;

      if (progress >= 1) {
        this.scene.remove(stem);
        stem.geometry.dispose();
        stem.material.dispose();
        node.extrusionStem = null;
      }

      if (progress < 1) {
        requestAnimationFrame(animateReset);
      }
    };
  
    requestAnimationFrame(animateReset);
  }

  liftEdge(edge, height = 0.5, duration = 2000) {

    const initialZ = edge.mesh.position.z;
    const finalZ = height;

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      const newZ = initialZ + progress * (finalZ - initialZ);
      edge.mesh.position.z = newZ;

      if (progress < 1) {
          requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  liftEdgeByGroup(edge, duration = 2000) {

    const sourceGroup = edge.source.group;
    const targetGroup = edge.target.group;

    if (sourceGroup === targetGroup) {
        const groupHeight = sourceGroup;
        const initialZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
        const finalZ = groupHeight;

        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            const newZ = initialZ + progress * (finalZ - initialZ);

            edge.mesh.position.z = newZ;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }
  }

  resetEdgeLiftByGroup(edge, duration = 2000) {

    const sourceGroup = edge.source.group;
    const targetGroup = edge.target.group;

    if (sourceGroup === targetGroup) {
      const initialZ = edge.mesh.position.z;
      const finalZ = 0;

      const startTime = performance.now();

      const animateReset = (currentTime) => {
          const elapsedTime = currentTime - startTime;
          const progress = Math.min(elapsedTime / duration, 1);

          const newZ = initialZ + progress * (finalZ - initialZ);
          edge.mesh.position.z = newZ;

          if (progress < 1) {
              requestAnimationFrame(animateReset);
          }
      };

      requestAnimationFrame(animateReset);
    }
    
  }

  resetGenericEdgeLift(edge, duration = 2000) {
    const initialZ = edge.mesh.position.z;
    const finalZ = 0;

    const startTime = performance.now();

    const animateReset = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const newZ = initialZ + progress * (finalZ - initialZ);
        edge.mesh.position.z = newZ;

        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    };

    requestAnimationFrame(animateReset);
  }

  extrudeNodes(nodes) {
    nodes.forEach(node => {
      this.extrudeNodeAsMushroomWithStem(node);
    });
  }

  resetNodesExtrusion(nodes) {
    nodes.forEach(node => {
      this.resetNodeExtrusion(node);
    });
  }

  extrudeAllNodesByGroups(nodes) {
    nodes.forEach(node => {
      this.extrudeNodeAsMushroomWithStem(node, node.group);
    });
  }

  extrudeNodesByGroup(nodes, group, height = 1) {
    nodes
      .filter(node => node.group === group)
      .forEach(node => {
        this.extrudeNodeAsMushroomWithStem(node, height);
      });
  }

  liftAllEdgesByGroups(edges) {
    edges.forEach(edge => {
      this.liftEdgeByGroup(edge);
    });
  }

  liftEdgesByGroup(edges, group, height = 1) {
    edges
      .filter(edge => edge.source.group === group && edge.target.group === group)
      .forEach(edge => {
        this.liftEdge(edge, height);
      });
  }

  resetAllEdgesLiftByGroups(edges) {
    edges.forEach(edge => {
      this.resetEdgeLiftByGroup(edge);
    });
  }

  resetEdgesLiftByGroup(edges, group) {
    edges
      .filter(edge => edge.source.group === group && edge.target.group === group)
      .forEach(edge => {
        this.resetGenericEdgeLift(edge);
      });
  }

  resetAllNodesExtrusionByGroups(nodes) {
    nodes.forEach(node => {
      this.resetNodeExtrusion(node, node.group);
    });
  }

  resetNodesExtrusionByGroup(nodes, group) {
    nodes
      .filter(node => node.group === group)
      .forEach(node => {
        this.resetGenericNodeExtrusion(node);
      });
  }

  extrudeSelectedNodes() {
    const nodesToExtrude = [...this.selectedNodes];
    this.extrudeNodes(nodesToExtrude);
  }

  //EDGES EXTRUSION
  extrudeEdgeAsBox(edge, finalZ = 0.5) {
    const duration = 2000;
    const startZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = startZ;
    const startTime = performance.now();

    const start = edge.source.mesh.position;
    const end = edge.target.mesh.position;
    const distance = start.distanceTo(end);

    const depth = 0.05;

    const boxGeometry = new THREE.BoxGeometry(finalZ, depth, distance);
    //colors: grey: #999999 ---- gold-yellow: #f2de05
    const boxMaterial = new THREE.MeshStandardMaterial({ color: '#f2de05', transparent: true, opacity: 0.8 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);

    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    box.position.copy(midPoint);

    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Vector3(0, 1, 0));
    box.quaternion.setFromRotationMatrix(orientation);
    box.scale.x = 0;

    this.scene.add(box);
    edge.extrusionBox = box;

    const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const z = initialZ + progress * (finalZ - initialZ);
        edge.mesh.position.z = z;
    
        box.scale.x = progress;
        box.position.z = initialZ + (progress * finalZ) / 2;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
  }

  resetEdgeExtrusion(edge, duration = 2000) {
    const box = edge.extrusionBox;
    const finalZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = finalZ - 0.5;
    const startTime = performance.now();

    const animateReset = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        edge.mesh.position.z = finalZ - progress * (finalZ - initialZ);;

        box.position.z = (finalZ * (1 - progress)) / 2;
        box.scale.x = 1 - progress;

        if (progress >= 1) {
            this.scene.remove(box);
            box.geometry.dispose();
            box.material.dispose();
            edge.extrusionBox = null;
        }

        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    };

    requestAnimationFrame(animateReset);
  }

  //EDGES EXTRUSION AS TRAPEZIO
  extrudeEdgeAsTrapezoid(edge, finalZ = 0.5) {
    const duration = 2000;
    const startZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = startZ;
    const startTime = performance.now();

    const start = edge.source.mesh.position;
    const end = edge.target.mesh.position;
    const distance = start.distanceTo(end);

    const baseRadius = 0.10;
    const topRadius = 0.05;

    let trapezoidGeometry = new THREE.CylinderGeometry(
        topRadius,
        baseRadius,
        0.5,
        4,
        1,
        false,
        Math.PI / 4
    );

    trapezoidGeometry.rotateX(Math.PI / 2);

    const trapezoidMaterial = new THREE.MeshStandardMaterial({ color: '#f2de05', transparent: true, opacity: 0.8 });
    const trapezoid = new THREE.Mesh(trapezoidGeometry, trapezoidMaterial);

    //const axesHelper = new THREE.AxesHelper(2);
    //trapezoid.add(axesHelper.clone())

    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    trapezoid.position.copy(midPoint);
    trapezoid.position.z = initialZ;

    const angleY = Math.atan2(end.y - start.y, end.x - start.x);
    trapezoid.rotation.z = angleY;

    trapezoid.scale.z = 0;
    trapezoid.scale.x = distance*7;
    trapezoid.scale.y = 1.7;

    this.scene.add(trapezoid);
    edge.extrusionTrapezoid = trapezoid;

    const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const z = initialZ + progress * (finalZ - initialZ);
        edge.mesh.position.z = z;

        trapezoid.scale.z = progress;
        trapezoid.position.z = initialZ + (progress * finalZ) / 2;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
  }

  resetEdgeExtrusionTrapezoid(edge, duration = 2000) {
    const trapezoid = edge.extrusionTrapezoid;
    const finalZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = finalZ - 0.5;
    const startTime = performance.now();

    const animateReset = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        edge.mesh.position.z = finalZ - progress * (finalZ - initialZ);
      
        trapezoid.position.z = (finalZ * (1 - progress)) / 2;
        trapezoid.scale.z = 1 - progress;

        if (progress >= 1) {
            this.scene.remove(trapezoid);
            trapezoid.geometry.dispose();
            trapezoid.material.dispose();
            edge.extrusionTrapezoid = null;
        }

        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    };

    requestAnimationFrame(animateReset);
  }

  //EDGES EXTRUSION AS CUSTOM TRAPEZOID
  extrudeEdgeAsCustomTrapezoid(edge, finalZ = 0.5) {
    const duration = 2000;
    const initialZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const startTime = performance.now();

    const start = edge.source.mesh.position;
    const end = edge.target.mesh.position;
    const distance = start.distanceTo(end);

    const baseWidth = 0.30;
    const topWidth = 0.05;
    const height = 0.5;

    const shape = new THREE.Shape();
    shape.moveTo(-baseWidth / 2, 0);
    shape.lineTo(baseWidth / 2, 0);
    shape.lineTo(topWidth / 2, height);
    shape.lineTo(-topWidth / 2, height);
    shape.closePath();

    const trapezoidGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: distance,
        bevelEnabled: false
    });

    const trapezoidMaterial = new THREE.MeshStandardMaterial({ color: '#f2de05', transparent: true, opacity: 0.8 });
    const trapezoid = new THREE.Mesh(trapezoidGeometry, trapezoidMaterial);

    trapezoid.position.copy(end);

    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Vector3(0, 0, 1));
    trapezoid.quaternion.setFromRotationMatrix(orientation);

    trapezoid.scale.y = 0;
    this.scene.add(trapezoid);
    edge.extrusionTrapezoid = trapezoid;

    const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const z = initialZ + progress * (finalZ - initialZ);
        edge.mesh.position.z = z;

        trapezoid.scale.y = progress;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
  }

  resetEdgeExtrusionAsCustomTrapezoid(edge, duration = 2000) {
    const trapezoid = edge.extrusionTrapezoid;
    const finalZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = finalZ - 0.5;
    const startTime = performance.now();

    const animateReset = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        edge.mesh.position.z = finalZ - progress * (finalZ - initialZ);
      
        trapezoid.scale.y = 1 - progress;

        if (progress >= 1) {
            this.scene.remove(trapezoid);
            trapezoid.geometry.dispose();
            trapezoid.material.dispose();
            edge.extrusionTrapezoid = null;
        }

        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    };

    requestAnimationFrame(animateReset);
  }

  extrudeEdges(edges) {
    edges.forEach(edge => {
        //this.extrudeEdgeAsBox(edge);
        //this.extrudeEdgeAsTrapezoid(edge);
        this.extrudeEdgeAsCustomTrapezoid(edge);
    });
  }

  resetEdgesExtrusion(edges) {
    edges.forEach(edge => {
        //this.resetEdgeExtrusion(edge);
        //this.resetEdgeExtrusionTrapezoid(edge);
        this.resetEdgeExtrusionAsCustomTrapezoid(edge); 
    });
  }

  extrudeSelectedEdges() {
    const edgesToExtrude = [...this.selectedEdges];
    this.extrudeEdges(edgesToExtrude);
  }

  resetExtrusion() {
    const nodesToReset = [...this.selectedNodes];
    this.resetNodesExtrusion(nodesToReset);
    const edgesToReset = [...this.selectedEdges];
    this.resetEdgesExtrusion(edgesToReset);
  }

  extrudePath(nodesToExtrude, edgesToExtrude) {
    this.extrudeNodes(nodesToExtrude);
    this.extrudeEdges(edgesToExtrude);
  }

  resetPathExtrusion(nodesToReset, edgesToReset) {
    this.resetNodesExtrusion(nodesToReset);
    this.resetEdgesExtrusion(edgesToReset);
  }

  extrudeAllNodesbyDegree(nodes) {
    nodes.forEach(node => {
      this.extrudeNodeAsMushroomWithStem(node, this.getNodeDegree(node));
    });
  }

  resetAllNodesExtrusionbyDegree(nodes) {
    nodes.forEach(node => {
      this.resetNodeExtrusion(node, this.getNodeDegree(node));
    });
  }

  getNodeDegree(node) {
    const neighbours = this.getNodeNeighbours(node);
    return neighbours.length;
  }

  enableShowNodePopUp() {
    this.flagShowNodePopUp = true;
  }

  disableShowNodePopUp() {
    this.flagShowNodePopUp = false;
  }

  setAllNodesColor(color) {
    if (!this.nodes) return;
    this.nodes.forEach(node => {
      node.color = color;
    });
  }

  resetAllNodesColor(color=null) {
    if (!this.nodes) return;
    this.nodes.forEach(node => {
      node.resetColor(color);
    });
  }

  setAllEdgesColor(color) {
    if (!this.edges) return;
    this.edges.forEach(edge => {
      edge.color = color;
    });
  }

  resetAllEdgesColor(color=null) {
    if (!this.edges) return;
    this.edges.forEach(edge => {
      edge.resetColor(color);
    });
  }

  createLensElement(radius=10) {
    if (!document.getElementById('lens')) {
      const lens = document.createElement('div');
      lens.id = 'lens';
      lens.style.position = 'absolute';
      lens.style.width = `${radius * 2}px`;
      lens.style.height = `${radius * 2}px`;
      lens.style.border = '2px solid #fff';
      lens.style.borderRadius = '50%';
      lens.style.pointerEvents = 'none';
      lens.style.display = 'none';
      lens.style.zIndex = '1000';
      lens.style.transform = `translate(-${radius}px, -${radius}px)`;

      document.body.appendChild(lens);
    }
  }

  removeLensElement() {
    const lens = document.getElementById('lens');
    if (lens) {
        document.body.removeChild(lens);
    }
  }

  enableLensMode(radius = 10) {
    if (!this.lensEnabled) {
      this.lensEnabled = true;
      this.lensRadius = radius;
      this.setAllNodesColor('white');
      this.setAllEdgesColor('white');
      this.createLensElement(radius);
      const lens = document.getElementById('lens');
      lens.style.display = 'block';
      this.highlightedNodesInLens = [];
      document.addEventListener('mousemove', this.updateLensPosition.bind(this));
    }
  }

  disableLensMode() {
    if(this.lensEnabled) {
      this.lensEnabled = false;
      this.resetAllNodesColor();
      this.resetAllEdgesColor();
      const lens = document.getElementById('lens');
      if (lens) {
        lens.style.display = 'none';
      }
      this.highlightedNodesInLens = [];
      document.removeEventListener('mousemove', this.updateLensPosition.bind(this));
      //this.clearLensHighlights();
    }
  }

  updateLensPosition(event) {
    if (this.lensEnabled) {
      const lens = document.getElementById('lens');
      if (lens) {
        const offset = 0;
        const lensRadius = parseFloat(lens.style.width) / 2;
        //console.log("lens.style.width: "+ lens.style.width);
        //console.log("lensRadius: "+ lensRadius);
        lens.style.left = `${event.clientX}px`;
        lens.style.top = `${event.clientY + offset}px`;
        //console.log("lens.style.left: "+ lens.style.left);
        //console.log("lens.style.top: "+  lens.style.top);
        //console.log("mouseX: "+ event.clientX);
        //console.log("mouseY: "+  event.clientY);

        // Aggiorna nodi e archi nella lente
        this.updateNodesInsideLens(event.clientX, event.clientY, lensRadius);
        this.updateEdgesInsideLens();
      }
    }
  }

  updateNodesInsideLens(mouseX, mouseY, lensRadius) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.highlightedNodesInLens = [];
    this.nodes.forEach(node => {
      const nodeScreenPosition = new THREE.Vector3();
      node.mesh.getWorldPosition(nodeScreenPosition);
      nodeScreenPosition.project(this.camera);

      const nodeScreenX = ((nodeScreenPosition.x + 1) / 2) * rect.width + rect.left;
      const nodeScreenY = ((-nodeScreenPosition.y + 1) / 2) * rect.height + rect.top;

      const distance = Math.sqrt(
          Math.pow(mouseX - nodeScreenX, 2) +
          Math.pow(mouseY - nodeScreenY, 2)
      );

      if (distance <= lensRadius) {
          node.highlight();
          this.highlightedNodesInLens.push(node);
          this.showLensPopup(node, mouseX, mouseY, lensRadius);
      } else {
          node.unhighlight('white');
          this.hideLensPopup(node);
      }
    });
  }

  updateEdgesInsideLens() {
    const highlightedNodeIds = this.highlightedNodesInLens.map(node => node.id);

    this.edges.forEach(edge => {
      const isSourceHighlighted = highlightedNodeIds.includes(edge.source.id);
      const isTargetHighlighted = highlightedNodeIds.includes(edge.target.id);

      if (isSourceHighlighted && isTargetHighlighted) { // case 1: only edges inside lens, use AND condition; case 2: use OR condition
        edge.highlight('red');
      } else {
        edge.unhighlight('white');
      }
    });
  }

  highlightNodesInLens(mousePosition) {
    if (!this.lensEnabled) return;

    const mouse3D = new THREE.Vector3();
    mouse3D.set(mousePosition.x, mousePosition.y, 0.5).unproject(this.camera);

    const nodesInLens = this.nodes.filter(node => {
        const distance = node.mesh.position.distanceTo(mouse3D);
        return distance <= this.lensRadius;
    });

    this.clearLensHighlights();

    nodesInLens.forEach(node => node.hoverHighlight());
    this.highlightedNodesInLens = nodesInLens;

    this.showLensInfo(nodesInLens);
  }

  clearLensHighlights() {
    this.highlightedNodesInLens.forEach(node => node.resetHoverHighlight());
    this.highlightedNodesInLens = [];
  }

  drawLensConnections(nodes) {
    const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const connections = [];

    nodes.forEach((node, index) => {
        for (let i = index + 1; i < nodes.length; i++) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                node.mesh.position,
                nodes[i].mesh.position,
            ]);
            const line = new THREE.Line(geometry, material);
            this.scene.add(line);
            connections.push(line);
        }
    });

    this.lensConnections = connections;
  }

  clearLensConnections() {
    if (this.lensConnections) {
        this.lensConnections.forEach(conn => {
            this.scene.remove(conn);
            conn.geometry.dispose();
            conn.material.dispose();
        });
        this.lensConnections = [];
    }
  }

  showLensInfo(nodes) {
    //console.log("Nodes in Lens:", nodes.map(node => node.id));
  }

  showLensPopup(node, lensX, lensY, lensRadius) {
    // Crea o recupera il popup
    let popup = document.getElementById(`lens-popup-${node.id}`);
    if (!popup) {
      popup = document.createElement('div');
      popup.id = `lens-popup-${node.id}`;
      popup.classList.add('node-popup');
      document.body.appendChild(popup);
    }
  
    // Aggiungi le informazioni al popup
    popup.innerHTML = `
      <div><strong>ID:</strong> ${node.id}</div>
      <div><strong>Name:</strong> ${node.name || 'N/A'}</div>
      <div><strong>Group:</strong> ${node.group || 'N/A'}</div>
    `;
  
    // Ottieni la posizione dello schermo per il nodo
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nodePosition = new THREE.Vector3();
    node.mesh.getWorldPosition(nodePosition);
    nodePosition.project(this.camera);
  
    const nodeScreenX = ((nodePosition.x + 1) / 2) * rect.width + rect.left;
    const nodeScreenY = ((-nodePosition.y + 1) / 2) * rect.height + rect.top;
  
    // Calcola la posizione sul bordo della lente più vicina al nodo
    const angle = Math.atan2(nodeScreenY - lensY, nodeScreenX - lensX);
    const distanceFactor = 3; // Incrementa la distanza dal bordo della lente
    const popupX = lensX + lensRadius * distanceFactor * Math.cos(angle);
    const popupY = lensY + lensRadius * distanceFactor * Math.sin(angle);
  
    // Posiziona il popup
    popup.style.left = `${popupX}px`;
    popup.style.top = `${popupY}px`;
    popup.style.display = 'block';
  
    // Crea o aggiorna la linea di connessione
    this.updateLensConnectionLine(node, nodeScreenX, nodeScreenY, popupX, popupY);
  }

  hideLensPopup(node) {
    const popup = document.getElementById(`lens-popup-${node.id}`);
    const line = document.getElementById(`line-to-lens-popup-${node.id}`);
    if (popup) popup.remove();
    if (line) line.remove();
  }

  updateLensConnectionLine(node, nodeScreenX, nodeScreenY, popupX, popupY) {
    let line = document.getElementById(`line-to-lens-popup-${node.id}`);
    if (!line) {
      line = document.createElement('div');
      line.id = `line-to-lens-popup-${node.id}`;
      line.style.position = 'absolute';
      line.style.border = '1px solid black';
      line.style.transformOrigin = 'top left';
      line.style.zIndex = '999';
      document.body.appendChild(line);
    }
  
    // Calcola la distanza e l'angolo tra il nodo e il popup
    const deltaX = popupX - nodeScreenX;
    const deltaY = popupY - nodeScreenY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  
    // Posiziona e ruota la linea
    line.style.left = `${nodeScreenX}px`;
    line.style.top = `${nodeScreenY}px`;
    line.style.width = `${distance}px`;
    line.style.transform = `rotate(${angle}deg)`;
  }

  project3DToScreen(point3D, camera, renderer) {
    const rect = renderer.domElement.getBoundingClientRect();
    const screenPosition = point3D.clone().project(camera);

    const x = ((screenPosition.x + 1) / 2) * rect.width + rect.left;
    const y = ((-screenPosition.y + 1) / 2) * rect.height + rect.top;

    return { x, y };
  }

  enableExploreMode() {
    this.exploreModeEnabled = true;
    this.disableEditMode();
    this.disableAnalyticsMode();
  }

  disableExploreMode() {
    this.exploreModeEnabled = false;
  }

  enableEditMode() {
    this.editModeEnabled = true;
    this.disableExploreMode();
    this.disableAnalyticsMode();
  }

  disableEditMode() {
    this.editModeEnabled = false;
  }

  enableAnalyticsMode() {
    this.analyticsModeEnabled = true;
    this.disableExploreMode();
    this.disableEditMode();
  }

  disableAnalyticsMode() {
    this.analyticsModeEnabled = false;
  }

  showNodeTooltip(node, event) {
    if (!this.nodeTooltip) {
        this.nodeTooltip = document.createElement('div');
        this.nodeTooltip.style.position = 'absolute';
        this.nodeTooltip.style.padding = '5px 10px';
        this.nodeTooltip.style.background = 'rgba(0, 0, 0, 0.75)';
        this.nodeTooltip.style.color = 'white';
        this.nodeTooltip.style.borderRadius = '4px';
        this.nodeTooltip.style.pointerEvents = 'none';
        this.nodeTooltip.style.fontSize = '12px';
        this.nodeTooltip.style.zIndex = '1000';
        document.body.appendChild(this.nodeTooltip);
    }

    this.nodeTooltip.textContent = `ID: ${this.hoveredNode.id}`;
    this.nodeTooltip.style.left = `${event.clientX + 10}px`;
    this.nodeTooltip.style.top = `${event.clientY + 10}px`;
    this.nodeTooltip.style.display = 'block';
  }

  hideNodeTooltip() {
      if (this.nodeTooltip) {
          this.nodeTooltip.style.display = 'none';
      }
  }

  resetSelectedNodes() {
    this.selectedNodes.forEach(selectedNode => {
        selectedNode.resetColor();
        this.hideFixedPopup(selectedNode);
    });
    this.selectedNodes = [];
  }

  resetSelectedEdges() {
    this.selectedEdges.forEach(selectedEdge => {
        selectedEdge.resetColor();
    });
    this.selectedEdges = [];
  }

  searchAndSelectNodeById(nodeId) {
    const targetNode = this.nodes.find(node => node._id === nodeId);
    if (targetNode) {
        const isAlreadySelected = this.selectedNodes.includes(targetNode);
        if (!isAlreadySelected) {
            this.selectNode(targetNode.mesh);
            //return 1;
        } else {
        }
    } else {
        //return 0;
    }
  }

  enableNeighboursHighlight() {
    this.flagNeighboursHighlight = true;
  }

  disableNeighboursHighlight() {
    this.flagNeighboursHighlight = false;
  }

  enableGroupNodesHighlight() {
    this.flagGroupNodesHighlight = true;
  }

  disableGroupNodesHighlight() {
    this.flagGroupNodesHighlight = false;
  }

}

export default GraphInteractions;
