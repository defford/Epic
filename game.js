import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Camera setup - orthographic for 2D top-down view
const container = document.getElementById('container');
let width = container.clientWidth;
let height = container.clientHeight;

// Function to update camera bounds based on aspect ratio
function updateCameraBounds() {
    const aspect = width / height;
    const viewSize = 10; // Total view size
    
    if (aspect >= 1) {
        // Wider than tall - adjust left/right
        camera.left = -viewSize * aspect / 2;
        camera.right = viewSize * aspect / 2;
        camera.top = viewSize / 2;
        camera.bottom = -viewSize / 2;
    } else {
        // Taller than wide - adjust top/bottom
        camera.left = -viewSize / 2;
        camera.right = viewSize / 2;
        camera.top = viewSize / (2 * aspect);
        camera.bottom = -viewSize / (2 * aspect);
    }
    camera.updateProjectionMatrix();
}

const camera = new THREE.OrthographicCamera(
    -5,  // left (will be updated)
    5,   // right (will be updated)
    5,   // top (will be updated)
    -5,  // bottom (will be updated)
    0.1, // near
    100  // far
);
updateCameraBounds();
camera.position.set(0, 10, 0);
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// Board creation
function createBoard() {
    const tileSize = 1;
    const boardSize = 8;
    const offset = (boardSize - 1) / 2;
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
            
            // Alternating colors for checkered pattern
            const isLight = (row + col) % 2 === 0;
            const color = isLight ? 0xf0d9b5 : 0xb58863;
            const material = new THREE.MeshBasicMaterial({ color: color });
            
            const tile = new THREE.Mesh(geometry, material);
            tile.rotation.x = -Math.PI / 2; // Rotate to lie flat
            tile.position.set(
                col - offset,
                0,
                row - offset
            );
            
            scene.add(tile);
        }
    }
}

createBoard();

// Piece creation functions
function createHero(x, z) {
    const heroGroup = new THREE.Group();
    
    // Triangle shape - using ConeGeometry with 3 sides, flattened
    const size = 0.3;
    const height = 0.1;
    
    // Black border - slightly larger triangle
    const borderGeometry = new THREE.ConeGeometry(size * 1.1, height * 0.1, 3);
    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.rotation.x = Math.PI;
    border.position.y = height / 2;
    heroGroup.add(border);
    
    // White triangle
    const triangleGeometry = new THREE.ConeGeometry(size, height, 3);
    const triangleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
    triangle.rotation.x = Math.PI;
    triangle.position.y = height / 2 + 0.001;
    heroGroup.add(triangle);
    
    heroGroup.position.set(x, 0, z);
    return heroGroup;
}

function createTransportUnit(x, z) {
    const transportGroup = new THREE.Group();
    
    const size = 0.4;
    const height = 0.1;
    
    // Black border - slightly larger square
    const borderGeometry = new THREE.BoxGeometry(size * 1.1, height * 0.1, size * 1.1);
    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.y = height / 2;
    transportGroup.add(border);
    
    // White square
    const squareGeometry = new THREE.BoxGeometry(size, height, size);
    const squareMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const square = new THREE.Mesh(squareGeometry, squareMaterial);
    square.position.y = height / 2 + 0.001;
    transportGroup.add(square);
    
    transportGroup.position.set(x, 0, z);
    return transportGroup;
}

function createEnergySpire(x, z) {
    const spireGroup = new THREE.Group();
    
    // Diamond shape - rotated square box
    const size = 0.3;
    const height = 0.6;
    
    // Black border - slightly larger diamond
    const borderGeometry = new THREE.BoxGeometry(size * 0.1, height * 0.1, size * 0.1);
    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.rotation.y = Math.PI; // Rotate 45 degrees around Y axis for diamond
    border.position.y = height / 2;
    spireGroup.add(border);
    
    // White diamond
    const diamondGeometry = new THREE.BoxGeometry(size, height, size * 2);
    const diamondMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial);
    diamond.rotation.y = Math.PI;
    diamond.position.y = height / 2 + 0.001;
    spireGroup.add(diamond);
    
    spireGroup.position.set(x, 0, z);
    return spireGroup;
}

// Add directional light for better shading
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Create and place the pieces on the board for visual preview
// Pieces are positioned at square centers (half-integer coordinates)
const hero = createHero(-2.5, -2.5);
scene.add(hero);

const transport = createTransportUnit(2.5, -2.5);
scene.add(transport);

const spire = createEnergySpire(0.5, 2.5);
scene.add(spire);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    
    width = newWidth;
    height = newHeight;
    
    updateCameraBounds();
    renderer.setSize(newWidth, newHeight);
});

