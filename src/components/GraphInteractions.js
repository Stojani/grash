import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { Subject } from 'rxjs';

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
    this.selectionChange$ = new Subject();
    this.hoveredNode = null;
    this.hoveredEdge = null;
    this.raycaster = new THREE.Raycaster();
    this.nodeInfoPopUp = null;
    this.flagShowNodePopUp = true;
    this.lensEnabled = false;
    this.lensRadius = 5;
    this.highlightedNodesInLens = [];
    this.initOrbitControls();
    this.addEventListeners();
  }

  initOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    //this.controls.enableDamping = true;
    //this.controls.dampingFactor = 0.25;
    //this.controls.rotateSpeed = 0.3;
    //this.controls.zoomSpeed = 0.9;
    //this.controls.panSpeed = 0.8;
    //this.controls.minPolarAngle = Math.PI / 4;
    //this.controls.maxPolarAngle = Math.PI - Math.PI / 4;
    //this.controls.minDistance = 1;
    //this.controls.maxDistance = 1000;
    //this.controls.enablePan = true;
    //this.controls.screenSpacePanning = true;
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
    } else {
        this.unhighlightNode();
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

  selectNode(nodeMesh) {
    const selectedNode = this.nodes.find(node => node.mesh === nodeMesh);
    if (selectedNode) {
      const index = this.selectedNodes.indexOf(selectedNode);
      if (index === -1) {
          selectedNode.highlight();
          this.selectedNodes.push(selectedNode);
          if (this.flagShowNodePopUp) {
            this.showTestPopup(selectedNode);
          }
      } else {
          selectedNode.resetColor();
          this.selectedNodes.splice(index, 1);
          this.hideTestPopup();
      }
      this.notifySelectionChange();
    }
  }

  notifySelectionChange() {
    console.log("qua ci entra");
    this.selectionChange$.next(this.selectedNodes);
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

  // ------------------- POPUP INFO --------------------- VERSION 2.0
  createPopupElement() {
    if (!document.getElementById('node-popup')) {
      const popup = document.createElement('div');
      popup.id = 'node-popup';
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
  
  removePopupElement() {
    const popup = document.getElementById('node-popup');
    if (popup) {
      document.body.removeChild(popup);
    }
  }

  showPopup(node) {
    let popup = document.getElementById('node-popup');
    if (!popup) {
      this.createPopupElement();
      popup = document.getElementById('node-popup');
      if (!popup) return;
    }
  
    popup.innerHTML = ''; // Svuota il contenuto precedente
    popup.style.display = 'block';
  
    // Titolo del pop-up
    const title = document.createElement('h5');
    title.textContent = `Node: ${node.id}`;
    title.style.marginBottom = '8px';
    popup.appendChild(title);
  
    // Campi del nodo da visualizzare
    const fields = [
      { key: 'id', label: 'ID', editable: false },
      { key: 'name', label: 'Name', editable: true },
      { key: 'group', label: 'Group', editable: true },
      { key: 'x', label: 'X', editable: false },
      { key: 'y', label: 'Y', editable: false },
      { key: 'z', label: 'Z', editable: false },
      { key: 'color', label: 'Color', editable: true }
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
  
    // Posiziona il popup accanto al punto sopra il nodo
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nodePosition = new THREE.Vector3();
    node.mesh.getWorldPosition(nodePosition);
  
    // Calcola la posizione del punto sopra il nodo
    const popupHeight = 30; // Altezza sopra il nodo sull'asse Z
    const popupPosition = nodePosition.clone();
    popupPosition.z += popupHeight;
  
    // Proietta il punto sopra il nodo nello spazio dello schermo
    popupPosition.project(this.camera);
    const popupX = ((popupPosition.x + 1) / 2) * rect.width + rect.left;
    const popupY = ((-popupPosition.y + 1) / 2) * rect.height + rect.top;
  
    popup.style.left = `${popupX}px`;
    popup.style.top = `${popupY}px`;
  
    // Aggiungi una linea di connessione tra il nodo e il popup
    this.addConnectionLine(nodePosition, popupHeight);
  }
  
  addConnectionLine(nodePosition, popupHeight) {
    // Rimuove eventuali linee di connessione esistenti
    if (this.popupConnectionLine) {
      this.scene.remove(this.popupConnectionLine);
      this.popupConnectionLine.geometry.dispose();
      this.popupConnectionLine.material.dispose();
    }
  
    // Crea una linea di connessione
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(nodePosition.x, nodePosition.y, nodePosition.z),
      new THREE.Vector3(nodePosition.x, nodePosition.y, nodePosition.z + popupHeight)
    ]);
  
    this.popupConnectionLine = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(this.popupConnectionLine);
  }
  
  hidePopup() {
    const popup = document.getElementById('node-popup');
    if (popup) {
      popup.style.display = 'none';
    }
  
    // Rimuovi la linea di connessione se esiste
    if (this.popupConnectionLine) {
      this.scene.remove(this.popupConnectionLine);
      this.popupConnectionLine.geometry.dispose();
      this.popupConnectionLine.material.dispose();
      this.popupConnectionLine = null;
    }
  }

  // 3.0
  createInfoPopup(node) {
    // Rimuovi eventuali popup o linee di connessione precedenti
    if (this.nodeInfoPopUp) {
      this.scene.remove(this.nodeInfoPopUp);
    }
    if (this.nodeToPopupLine) {
      this.scene.remove(this.nodeToPopupLine);
    }
  
    // Dimensioni del canvas e fattore di scala per migliorare la qualità
    const canvasWidth = 300; // Larghezza visibile del popup
    const canvasHeight = 80; // Altezza visibile del popup
    const scaleFactor = 5; // Fattore di scala per migliorare la risoluzione
  
    // Crea un canvas ad alta risoluzione
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth * scaleFactor;
    canvas.height = canvasHeight * scaleFactor;
  
    const context = canvas.getContext('2d');
    context.scale(scaleFactor, scaleFactor);
  
    // Disegna il contorno nero e lo sfondo bianco
    context.fillStyle = 'black'; // Contorno nero
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Sfondo bianco semitrasparente
    context.fillRect(3, 3, canvasWidth - 6, canvasHeight - 6); // Margini interni
  
    // Disegna i titoli e i valori
    context.fillStyle = 'black';
    context.font = 'bold 16px Arial';
    const fields = [
      { label: 'ID', value: node.id },
      { label: 'Name', value: node.name || 'N/A' },
      { label: 'Group', value: node.group || 'N/A' }
    ];
  
    let yPosition = 20; // Posizione verticale iniziale
    fields.forEach(field => {
      context.fillText(`${field.label}:`, 10, yPosition);
      context.fillText(`${field.value}`, 100, yPosition);
      yPosition += 20; // Incrementa la posizione per il campo successivo
    });
  
    // Crea la texture dal canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; // Per evitare aliasing
    texture.needsUpdate = true;
  
    // Crea il materiale dello sprite
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
  
    // Posiziona il popup sopra il nodo
    sprite.position.copy(node.mesh.position);
    sprite.position.z += 20; // Altezza della linea di connessione
  
    // Aggiungi il popup alla scena
    this.nodeInfoPopUp = sprite;
    this.scene.add(sprite);
  
    // Crea la linea di connessione tra il nodo e il popup
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const points = [
      new THREE.Vector3(node.mesh.position.x, node.mesh.position.y, node.mesh.position.z),
      new THREE.Vector3(sprite.position.x, sprite.position.y, sprite.position.z)
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeometry, lineMaterial);
  
    // Aggiungi la linea alla scena
    this.nodeToPopupLine = line;
    this.scene.add(line);
  }

  showTestPopup(node) {
    if (this.nodeInfoPopUp) {
      this.scene.remove(this.nodeInfoPopUp);
    }
    this.createInfoPopup(node);
  }

  hideTestPopup() {
    if (this.nodeInfoPopUp) {
        this.scene.remove(this.nodeInfoPopUp);
        this.nodeInfoPopUp = null;
    }
    if (this.nodeToPopupLine) {
      this.scene.remove(this.nodeToPopupLine);
      this.nodeToPopupLine = null;
    }
  }

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

  disableLensMode() {
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

  updateLensPosition(event) {
    if (this.lensEnabled) {
      const lens = document.getElementById('lens');
      if (lens) {
        const offset = 80;
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
      } else {
          node.unhighlight('white');
      }
    });
  }

  updateEdgesInsideLens() {
    const highlightedNodeIds = this.highlightedNodesInLens.map(node => node.id);

    this.edges.forEach(edge => {
      const isSourceHighlighted = highlightedNodeIds.includes(edge.source.id);
      const isTargetHighlighted = highlightedNodeIds.includes(edge.target.id);

      if (isSourceHighlighted && isTargetHighlighted) { // case 2: use OR condition
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
    // Ad esempio, aggiorna un pannello con le informazioni
    console.log("Nodes in Lens:", nodes.map(node => node.id));
    // Puoi creare un popup o aggiornare un'area dell'interfaccia
  }

  
}

export default GraphInteractions;
