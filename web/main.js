import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('container');
const infoPanel = document.getElementById('infoPanel');
const yearSlider = document.getElementById('yearSlider');
const yearLabel = document.getElementById('yearLabel');
const playButton = document.getElementById('playButton');
const outlierButton = document.getElementById("outlierButton");
const resetColorButton = document.getElementById("resetColorsButton");
const resetCameraButton = document.getElementById("resetCameraButton");
const list = document.getElementById("publicationList");
const infoResetButton = document.getElementById('infoResetButton');

// Save initial info
const initialInfo = infoPanel.innerHTML;

let scene, camera, renderer, controls;
let raycaster, mouse;
let instancedMesh;
let topics = [];
let clusters = [];
let clusterColors = {};
let minYear;
let maxYear;
let currentYear;
let playing = false;
let outliersVisible = true;
let pointerDown = false;
let startX = 0;
let startY = 0;

// To store per-instance metadata for click handling
const instanceIdToTopic = new Map();

init();
loadData().then(start);

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02010a, 0.008);

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
  camera.position.set(120, 120, 60);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.outputColorSpace;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;
  controls.minDistance = 5;
  controls.maxDistance = 200;

  controls.target.set(105, 110, -11);
  controls.update();

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  scene.add(hemi);

  const mainLight = new THREE.PointLight(0xffffff, 2, 0, 2);
  mainLight.position.set(20, 30, 20);
  scene.add(mainLight);

  // Starfield background
  addStarfield();

  // Remove comment below to test if lighting is fine
  // addDebugCube();

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  window.addEventListener('resize', onWindowResize);

  // Movement threshold for listener
  const CLICK_THRESHOLD = 5;

  renderer.domElement.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    startX = event.clientX;
    startY = event.clientY;
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    if (!pointerDown) return;
    pointerDown = false;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    const distance = Math.sqrt(dx*dx + dy*dy);

    // If mouse moved too much, treat as drag, not click
    if (distance > CLICK_THRESHOLD) return;

    // Otherwise it's a click, call click
    onPointerClick(event);
  });

  yearSlider.addEventListener('input', onYearSliderChange);
  playButton.addEventListener('click', togglePlay);
  resetCameraButton.addEventListener('click', toggleResetCamera);
  resetColorButton.addEventListener('click', toggleResetColorButton);
  outlierButton.addEventListener("click", toggleOutlierButton);
  infoResetButton.addEventListener('click', toggleInfoResetButton);
}

async function loadData() {
  console.log('Loading data…'); // Check if data loads
  const resp = await fetch('./data/topics_3d.json');
  console.log('Fetch status:', resp.status);
  const json = await resp.json();
  console.log('Got topics:', json.length);
  console.log('First topic:', json[0]);

  topics = json;

  // Determine year bounds
  const years = topics
    .map(d => Number(d.publication_year))
    .filter(y => !Number.isNaN(y));

  console.log('Year sample:', years.slice(0, 10));

  minYear = 1980;
  maxYear = Math.max(...years);
  currentYear = maxYear;

  yearSlider.min = String(minYear);
  yearSlider.max = String(maxYear);
  yearSlider.value = String(currentYear);
  yearLabel.textContent = currentYear;

  // Collect cluster ids
  clusters = Array.from(new Set(topics.map(d => d.cluster))).sort((a, b) => a - b);

  // Assign colors to clusters
  const palette = [
    0xff6b6b, // red
    0xffc15e, // orange
    0x6bffb0, // mint
    0x6bb8ff, // blue
    0xd06bff, // purple
    0xff8bd5, // pink
    0xa0ff6b, // green
    0xffe66b  // yellow
  ];

  clusters.forEach((clusterId, index) => {
    const color = palette[index % palette.length];
    clusterColors[clusterId] = new THREE.Color(color);
  });

  // Grey color for the -1 cluster
  clusterColors[-1] = new THREE.Color(0x888888)
}

function start() {
  createGalaxy();
  animate();
}

function createGalaxy() {
  const count = topics.length;

  // Geometry + material for instances
  const geometry = new THREE.SphereGeometry(0.35, 16, 16);
  const material = new THREE.MeshPhongMaterial({
    emissive: 0x000000,
    shininess: 50,
  });

  instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();

  topics.forEach((topic, index) => {
    // Normalize coordinates a bit so the galaxy is compact
    const scaleFactor = 10; // adjust this if your space is too spread out
    const x = Number(topic.x) * scaleFactor;
    const y = Number(topic.y) * scaleFactor;
    const z = Number(topic.z) * scaleFactor;

    dummy.position.set(x, y, z);

    // scale small by default; we’ll fade in by year in update
    dummy.scale.setScalar(0.35);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(index, dummy.matrix);

    // Set color attribute per instance via color buffer
    const clusterColor = clusterColors[topic.cluster] || new THREE.Color(0xffffff);
    instancedMesh.setColorAt(index, clusterColor);

    instanceIdToTopic.set(index, topic);
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }
  scene.add(instancedMesh);
}

function addStarfield() {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount * 3; i += 3) {
    const radius = 200 * Math.random() + 50;
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = radius * Math.cos(phi);
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const starMaterial = new THREE.PointsMaterial({
    size: 0.8,
    sizeAttenuation: true,
    color: 0xffffff,
    transparent: true,
    opacity: 0.7
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function onPointerClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(instancedMesh);

  if (intersects.length > 0) {
    const instanceId = intersects[0].instanceId;
    if (instanceId !== undefined && instanceIdToTopic.has(instanceId)) {
      const topic = instanceIdToTopic.get(instanceId);

      // Replace highliting instance on highlighting cluster, later can figure out how to use it
      // highlightInstance(instanceId);
      updatePublicationList(instanceId)
      highlightCluster(instanceId);
      showInfo(topic);
    }
  }
}

let highlightedInstance = null;

function highlightInstance(instanceId) {
  const dummy = new THREE.Object3D();

  if (highlightedInstance !== null && highlightedInstance !== instanceId) {
    // reset previous highlight scale
    const oldTopic = instanceIdToTopic.get(highlightedInstance);
    setInstanceScaleByYear(highlightedInstance, oldTopic);
  }

  highlightedInstance = instanceId;

  instancedMesh.getMatrixAt(instanceId, dummy.matrix);
  dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

  // bump the scale up and emissive glow
  dummy.scale.multiplyScalar(1.8);
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(instanceId, dummy.matrix);
  instancedMesh.instanceMatrix.needsUpdate = true;

  // update material emissive via vertex colors (approximate "glow")
  // we could also temporarily tint its color brighter, but for simplicity just leave color as is.
}

function resetClusterHighlight() {
  console.log("Color reset")
  for (let i = 0; i < topics.length; i++) {
    instancedMesh.setColorAt(i, clusterColors[topics[i].cluster]);
  }
  instancedMesh.instanceColor.needsUpdate = true;
}

function highlightCluster(instanceId) {
  //Color for unfocused clusters
  const dimColor = new THREE.Color(0xffffff);
  const clusterId = topics[instanceId].cluster;

  for (let i = 0; i < topics.length; i++) {
    if (topics[i].cluster === clusterId) {
      // Restore original
      instancedMesh.setColorAt(i, clusterColors[topics[i].cluster]);
    } else {
      // Dim others
      instancedMesh.setColorAt(i, dimColor);
    }
  }
  instancedMesh.instanceColor.needsUpdate = true;
}

function showInfo(topic) {
  infoPanel.classList.remove('empty');
  const authors = (topic.authorships || []).split("|").join(", ");
  const keywords = (topic.concepts || topic.topics || []).split("|").join(", ");

  infoPanel.innerHTML = `
    <h2>${topic.title || 'Untitled'}</h2>
    <p><span class="label">Year:</span> ${parseInt(topic.publication_year) ?? 'Unknown'}</p>
    <p><span class="label">Host Organization:</span> ${topic.host_organization || 'Unknown'}</p>
    <p><span class="label">Cluster:</span> ${topic.cluster}</p>
    <p><span class="label">Authors:</span> ${authors || 'Unknown'}</p>
    <p><span class="label">Keywords:</span> ${keywords || '—'}</p>
    <p><span class="label">Citations:</span> ${topic.cited_by_count ?? '—'}</p>
  `;

  // If you later have URLs (e.g., topic.openalex_id or doi), you can add links here.
}

function onYearSliderChange(e) {
  currentYear = Number(e.target.value);
  yearLabel.textContent = currentYear;
  updateInstanceScales();
}

function togglePlay() {
  playing = !playing;
  playButton.classList.toggle('paused', !playing);
  playButton.textContent = playing ? '⏸' : '▶';
}

function toggleResetCamera() {
  camera.position.set(120, 120, 60);
}

function toggleResetColorButton() {
  resetClusterHighlight()
}

function toggleOutlierButton() {
  outliersVisible = !outliersVisible;
  const dummy = new THREE.Object3D();

  topics.forEach((topic, index) => {
    if (topic.cluster === -1) {
      instancedMesh.getMatrixAt(index, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      dummy.scale.setScalar(outliersVisible ? 0.35 : 0.00001);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(index, dummy.matrix);
    }
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
  outlierButton.classList.toggle("active", !outliersVisible);
};

function updateInstanceScales() {
  if (!instancedMesh) return;
  const dummy = new THREE.Object3D();

  topics.forEach((topic, index) => {
    const year = Number(topic.publication_year);
    instancedMesh.getMatrixAt(index, dummy.matrix);
    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

    setInstanceScaleByYear(index, topic, dummy);

    dummy.updateMatrix();
    instancedMesh.setMatrixAt(index, dummy.matrix);
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
}

function setInstanceScaleByYear(index, topic, dummyObj) {
  const year = Number(topic.publication_year);
  const visible = !Number.isNaN(year) && year <= currentYear;

  const baseScale = 0.35;
  const minScale = 0.02;

  const t = visible ? 1.0 : 0.0;
  const s = minScale + t * (baseScale - minScale);

  if (dummyObj) {
    dummyObj.scale.setScalar(s);
  } else {
    const dummy = new THREE.Object3D();
    instancedMesh.getMatrixAt(index, dummy.matrix);
    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(index, dummy.matrix);
  }
}

function updatePublicationList(instanceId) {
  const clusterId = topics[instanceId].cluster;
  const pubs = topics.filter(t => t.cluster === clusterId);

  list.innerHTML = `
    <div><strong>Cluster: </strong><span style="opacity: 0.7;">${clusterId}</span></div>
    <div><strong> Number of publications: </strong><span style="opacity: 0.7;">${pubs.length}</span></div>
  `;

  pubs.forEach(pub => {
    const item = document.createElement("p");
    item.innerHTML = `<strong>${pub.title}</strong><br>
    <span style="opacity: 0.7;">${parseInt(pub.publication_year) || 'Unknown'}</span>`;

    item.style.cursor = "pointer";
      item.addEventListener("click", () => {
      showInfo(pub);
    });

    list.appendChild(item);
  });
}

function toggleInfoResetButton() {
  infoPanel.classList.add('empty');
  infoPanel.innerHTML = initialInfo;
}

function animate(time) {
  requestAnimationFrame(animate);

  if (playing) {
    const speed = 0.04; // years per frame-ish
    currentYear += speed;
    if (currentYear > maxYear) {
      currentYear = minYear;
    }
    yearSlider.value = String(Math.round(currentYear));
    yearLabel.textContent = Math.round(currentYear);
    updateInstanceScales();
  }

  controls.update();
  renderer.render(scene, camera);
}
