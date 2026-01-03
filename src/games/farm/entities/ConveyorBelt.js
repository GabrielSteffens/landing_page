import * as THREE from 'three';

export class ConveyorBelt {
    constructor(path, scene, debugIndex = -1) {
        this.scene = scene;
        this.meshes = [];

        // KILL SWITCH: Prevent Zone 0 Belt (Ghost or not)
        // Zone 0 coords: x=250, y=490 (approx 240+250)
        // User requested this specific belt be removed as they consider it "unused/bugged".
        if (Math.abs(path[0].x - 250) < 5 && Math.abs(path[0].y - 490) < 5) {
            console.warn("BLOCKED BELT CREATION AT ZONE 0 (250, 490) - KILL SWITCH ACTIVE");
            return;
        }

        // Initial Texture (Placeholder or direct load)
        const texLoader = new THREE.TextureLoader();
        const texture = texLoader.load(`/farm_assets/textures/conveyor.png?t=${Date.now()}`);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 1,
            bumpScale: 0.5,
            transparent: true,
            alphaTest: 0.1
        });

        // Loop through segments
        for (let i = 0; i < path.length - 1; i++) {
            const start = path[i];
            const end = path[i + 1];

            // Calculate length and angle
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);

            // Clone texture for independent tiling
            const t = texture.clone();
            t.needsUpdate = true;
            t.repeat.set(length / 32, 1); // 32px per tile

            // Create individual material for this segment (so we can update it later)
            const segMat = material.clone();
            segMat.map = t;

            const boxGeo = new THREE.BoxGeometry(length + 2, 0.2, 30); // Very flat box
            const flatMesh = new THREE.Mesh(boxGeo, segMat);

            flatMesh.position.x = start.x + dx / 2;
            flatMesh.position.y = 0.2; // Slightly above ground (0)
            flatMesh.position.z = start.y + dy / 2;

            flatMesh.rotation.y = -angle;

            flatMesh.name = 'conveyor'; // Tag for cleanup

            this.scene.add(flatMesh);
            this.meshes.push(flatMesh);
        }
    }
}
