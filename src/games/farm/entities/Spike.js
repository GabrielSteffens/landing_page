import * as THREE from 'three';

export class Spike {
    constructor(x, y, width, height, scene) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = false;
        this.timer = 0;
        this.duration = 0.5;
        this.damage = 100;

        // Group for spikes
        this.group = new THREE.Group();
        this.group.position.set(x + width / 2, 0, y + height / 2); // Center
        scene.add(this.group);

        // Base plate (Muddy Grass for Animal Pen)
        const baseGeo = new THREE.PlaneGeometry(width, height);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x556b2f });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.rotation.x = -Math.PI / 2;
        base.position.y = 1;
        this.group.add(base);

        // --- FENCES ---
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brown Wood
        const postGeo = new THREE.BoxGeometry(4, 30, 4);
        const railGeo = new THREE.BoxGeometry(width + 4, 4, 2); // Horizontal rail

        // Helper to add post
        const addPost = (px, pz) => {
            const post = new THREE.Mesh(postGeo, fenceMat);
            post.position.set(px, 15, pz);
            post.castShadow = true;
            this.group.add(post);
        };

        // 1. Posts at corners and intervals
        const postInterval = 40;

        // Top and Bottom rows
        for (let i = -width / 2; i <= width / 2; i += postInterval) {
            addPost(i, -height / 2); // Top edge
            addPost(i, height / 2);  // Bottom edge
        }
        // Left and Right columns
        for (let i = -height / 2; i <= height / 2; i += postInterval) {
            addPost(-width / 2, i); // Left edge
            addPost(width / 2, i);  // Right edge
        }

        // 2. Simple Rails (One big box for each side for simplicity)
        const sideRailGeo = new THREE.BoxGeometry(2, 4, height);

        // Top Rail
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(width, 4, 2), fenceMat);
        topRail.position.set(0, 25, -height / 2);
        this.group.add(topRail);

        // Bottom Rail
        const botRail = new THREE.Mesh(new THREE.BoxGeometry(width, 4, 2), fenceMat);
        botRail.position.set(0, 25, height / 2);
        this.group.add(botRail);

        // Left Rail
        const leftRail = new THREE.Mesh(sideRailGeo, fenceMat);
        leftRail.position.set(-width / 2, 25, 0);
        this.group.add(leftRail);

        // Right Rail
        const rightRail = new THREE.Mesh(sideRailGeo, fenceMat);
        rightRail.position.set(width / 2, 25, 0);
        this.group.add(rightRail);


        // --- SPIKES ---
        this.spikes = [];
        const rows = Math.floor(height / 20);
        const cols = Math.floor(width / 20);

        const spikeGeo = new THREE.ConeGeometry(5, 20, 4);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Ensure spikes are strictly inside the fences (margin of 10)
                const sx = (c * 20) - width / 2 + 10;
                const sz = (r * 20) - height / 2 + 10;

                if (Math.abs(sx) < width / 2 - 5 && Math.abs(sz) < height / 2 - 5) {
                    const spike = new THREE.Mesh(spikeGeo, spikeMat);
                    spike.position.set(sx, -10, sz);
                    this.spikes.push(spike);
                    this.group.add(spike);
                }
            }
        }
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.group.position.set(x + this.width / 2, 0, y + this.height / 2);
    }

    activate() {
        if (!this.active) {
            this.active = true;
            this.timer = this.duration;
        }
    }

    update(dt) {
        if (this.active) {
            this.timer -= dt;
            // Animate spikes up
            this.spikes.forEach(s => {
                if (s.position.y < 10) s.position.y += 100 * dt;
            });

            if (this.timer <= 0) {
                this.active = false;
            }
        } else {
            // Animate spikes down
            this.spikes.forEach(s => {
                if (s.position.y > -10) s.position.y -= 50 * dt;
            });
        }
    }
}
