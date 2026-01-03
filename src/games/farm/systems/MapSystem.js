import * as THREE from 'three';

export class MapSystem {
    constructor(scene) {
        this.scene = scene;
        this.chunkSize = 1000;
        this.chunks = {}; // "cx,cy" -> { mesh, trees: [] }

        // Ground Texture
        const texLoader = new THREE.TextureLoader();
        this.groundTex = texLoader.load('assets/textures/grass_stardew.png');
        this.groundTex.wrapS = THREE.RepeatWrapping;
        this.groundTex.wrapT = THREE.RepeatWrapping;
        this.groundTex.repeat.set(10, 10); // Match scale (previously 20 for 2000 size)
        this.groundTex.magFilter = THREE.NearestFilter;
        this.groundTex.minFilter = THREE.NearestFilter;

        this.groundMat = new THREE.MeshStandardMaterial({ map: this.groundTex });
        this.groundGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);

        // Updated for Sprites
        // Texture
        const loader = new THREE.TextureLoader();
        this.treeMap = loader.load('assets/textures/tree.png');
        this.treeMap.magFilter = THREE.NearestFilter;
        this.treeMat = new THREE.SpriteMaterial({ map: this.treeMap });

        // Collision List (Static objects to avoid)
        this.obstacles = []; // Externally updated
    }

    update(px, py, obstacles = []) {
        this.obstacles = obstacles; // Update list

        // Calculate current chunk
        // px, py correspond to world x, z
        const cx = Math.floor((px + this.chunkSize / 2) / this.chunkSize);
        const cy = Math.floor((py + this.chunkSize / 2) / this.chunkSize);

        // Load 3x3 grid around player
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                this.loadChunk(cx + dx, cy + dy);
            }
        }
    }

    loadChunk(cx, cy) {
        const key = `${cx},${cy}`;
        if (this.chunks[key]) return;

        const chunk = { mesh: null, trees: [] };

        // Ground Mesh
        const mesh = new THREE.Mesh(this.groundGeo, this.groundMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        // Position: Center of chunk
        mesh.position.set(cx * this.chunkSize, 0, cy * this.chunkSize);
        this.scene.add(mesh);
        chunk.mesh = mesh;

        // Decorations (Trees) - Sprites
        const count = 5 + Math.floor(Math.random() * 8); // More trees
        for (let i = 0; i < count; i++) {
            // World pos candidate
            const wx = cx * this.chunkSize + (Math.random() - 0.5) * this.chunkSize;
            const wz = cy * this.chunkSize + (Math.random() - 0.5) * this.chunkSize;

            // Safe Zone Check (Start Area)
            const distCenter = Math.hypot(wx, wz);
            if (distCenter < 400) continue;

            // Obstacle Check
            if (!this.isSafe(wx, wz)) continue;

            this.createTree(wx, wz, chunk.trees);
        }

        this.chunks[key] = chunk;
    }

    isSafe(wx, wz) {
        for (let obs of this.obstacles) {
            // Check for AABB (Spike/Zone) - Checks if wx,wz is inside the Box
            // Spike constructor: x,y is Top-Left. width, height is size.
            // Margin m to keep trees further away
            if (obs.width && obs.height && obs.x !== undefined && obs.y !== undefined) {
                const m = 50;
                if (wx > obs.x - m && wx < obs.x + obs.width + m &&
                    wz > obs.y - m && wz < obs.y + obs.height + m) {
                    return false;
                }
            } else {
                // Point-based Objects (Workbench, etc)
                let obX = obs.x;
                let obZ = obs.y;

                if (obX === undefined && obs.group) {
                    obX = obs.group.position.x;
                    obZ = obs.group.position.z;
                }
                if (obX === undefined && obs.mesh) {
                    obX = obs.mesh.position.x;
                    obZ = obs.mesh.position.z;
                }

                if (obX !== undefined) {
                    if (Math.hypot(wx - obX, wz - obZ) < 150) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    update(px, py, obstacles = []) {
        this.obstacles = obstacles;

        // Cleanup existing trees if they are now invalid (e.g. new zone unlocked)
        for (let key in this.chunks) {
            const chunk = this.chunks[key];
            for (let i = chunk.trees.length - 1; i >= 0; i--) {
                const tree = chunk.trees[i];
                if (!this.isSafe(tree.position.x, tree.position.z)) {
                    this.scene.remove(tree);
                    chunk.trees.splice(i, 1);
                }
            }
        }

        // Calculate current chunk
        const cx = Math.floor((px + this.chunkSize / 2) / this.chunkSize);
        const cy = Math.floor((py + this.chunkSize / 2) / this.chunkSize);

        // Load 3x3 grid around player
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                this.loadChunk(cx + dx, cy + dy);
            }
        }
    }

    createTree(x, z, list) {
        const sprite = new THREE.Sprite(this.treeMat);
        sprite.position.set(x, 40, z); // Adjust Y for base (height ~80, so center 40)

        // Random scale variation
        const S = 80 + Math.random() * 40;
        sprite.scale.set(S, S, 1);

        this.scene.add(sprite);
        list.push(sprite);
    }
}
