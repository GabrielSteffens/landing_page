import * as THREE from 'three';

export class Spike {
    constructor(x, y, width, height, scene, gateSide = 'bottom') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = false;
        this.gateSide = gateSide;
        // ... (lines 10-53 same, skipping for brevity in thought, but must replace full block or use precise replacement)
        // Actually, let's just replace the constructor signature and the rail logic.

        // ... (standard setup) ...
        this.group = new THREE.Group();
        this.group.position.set(x + width / 2, 0, y + height / 2);
        scene.add(this.group);

        // Base
        const baseGeo = new THREE.PlaneGeometry(width, height);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x556b2f });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.rotation.x = -Math.PI / 2;
        base.position.y = 1;
        this.group.add(base);

        // FENCES
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const postGeo = new THREE.BoxGeometry(4, 30, 4);

        // Helper
        const addPost = (px, pz) => {
            const post = new THREE.Mesh(postGeo, fenceMat);
            post.position.set(px, 15, pz);
            post.castShadow = true;
            this.group.add(post);
        };

        // Posts
        const postInterval = 40;
        for (let i = -width / 2; i <= width / 2; i += postInterval) {
            addPost(i, -height / 2);
            addPost(i, height / 2);
        }
        for (let i = -height / 2; i <= height / 2; i += postInterval) {
            addPost(-width / 2, i);
            addPost(width / 2, i);
        }

        // RAILS logic with Gaps
        const sideRailGeo = new THREE.BoxGeometry(2, 4, height);

        // Top Rail
        if (gateSide === 'top') {
            // Split Top
            const gapSize = 50;
            const segW = (width - gapSize) / 2;
            const trL = new THREE.Mesh(new THREE.BoxGeometry(segW, 4, 2), fenceMat);
            trL.position.set(-width / 2 + segW / 2, 25, -height / 2);
            this.group.add(trL);
            const trR = new THREE.Mesh(new THREE.BoxGeometry(segW, 4, 2), fenceMat);
            trR.position.set(width / 2 - segW / 2, 25, -height / 2);
            this.group.add(trR);

            this.addGateVisual(0, -height / 2);
        } else {
            // Solid Top
            const topRail = new THREE.Mesh(new THREE.BoxGeometry(width, 4, 2), fenceMat);
            topRail.position.set(0, 25, -height / 2);
            this.group.add(topRail);
        }

        // Bottom Rail
        if (gateSide === 'bottom') {
            // Split Bottom
            const gapSize = 50;
            const segW = (width - gapSize) / 2;
            const brL = new THREE.Mesh(new THREE.BoxGeometry(segW, 4, 2), fenceMat);
            brL.position.set(-width / 2 + segW / 2, 25, height / 2);
            this.group.add(brL);
            const brR = new THREE.Mesh(new THREE.BoxGeometry(segW, 4, 2), fenceMat);
            brR.position.set(width / 2 - segW / 2, 25, height / 2);
            this.group.add(brR);

            // Add Gate Visual
            this.addGateVisual(0, height / 2);
        } else {
            // Solid Bottom
            const botRail = new THREE.Mesh(new THREE.BoxGeometry(width, 4, 2), fenceMat);
            botRail.position.set(0, 25, height / 2);
            this.group.add(botRail);
        }

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

    addGateVisual(bx, by) {
        // Simple Gate Sprite
        const tex = new THREE.TextureLoader().load('/farm_assets/textures/gate.png');
        const mat = new THREE.SpriteMaterial({ map: tex });
        const mesh = new THREE.Sprite(mat);
        mesh.scale.set(60, 60, 1);
        mesh.center.set(0.5, 0.0);
        mesh.position.set(bx, 5, by); // Positioned at gap
        this.group.add(mesh);

        // Async Transparency
        new THREE.ImageLoader().load(`/farm_assets/textures/gate.png?t=${Date.now()}`, (image) => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) data[i + 3] = 0;
            }
            ctx.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);
            const cTex = new THREE.CanvasTexture(canvas);
            cTex.magFilter = THREE.NearestFilter;
            cTex.minFilter = THREE.NearestFilter;
            mat.map = cTex;
            mat.needsUpdate = true;
        });
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
