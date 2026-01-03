import * as THREE from 'three';

export class Road {
    constructor(path, scene) {
        this.scene = scene;
        this.meshes = [];

        const texLoader = new THREE.TextureLoader();
        // Add timestamp to force reload and bypass cache
        const texture = texLoader.load(`/farm_assets/textures/path.png?t=${Date.now()}`);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;

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
            t.repeat.set(length / 32, 1);

            const material = new THREE.MeshStandardMaterial({
                map: t,
                roughness: 1,
            });

            // Flat Box for Road (Robust rotation)
            const geo = new THREE.BoxGeometry(length + 2, 0.2, 60); // 60 Width for generous path
            const mesh = new THREE.Mesh(geo, material);

            mesh.position.x = start.x + dx / 2;
            mesh.position.y = 0.5; // Slightly above ground
            mesh.position.z = start.y + dy / 2;

            mesh.rotation.y = -angle;

            this.scene.add(mesh);
            this.meshes.push(mesh);
        }
    }
}
