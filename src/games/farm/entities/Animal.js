import * as THREE from 'three';

export class Animal {
    constructor(x, y, scene, model, type = 'chicken') {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = type === 'cow' ? 30 : 50; // Cows are slower
        this.health = type === 'cow' ? 200 : 100; // Cows are tankier
        this.alive = true;
        this.scene = scene;
        this.type = type;

        // Progressive Value System
        const values = {
            'chicken': 1000,
            'cow': 50,
            'pig': 150,
            'sheep': 500,
            'duck': 200,
            'horse': 800
        };
        this.dropValue = values[type] || 10;

        // Progressive Stats
        const healths = {
            'chicken': 50,
            'cow': 150,
            'pig': 300,
            'sheep': 600,
            'duck': 80,
            'horse': 500
        };
        this.health = healths[type] || 50;

        this.speed = type === 'chicken' ? 50 : 30;

        this.moveTimer = 0;
        this.moveDir = { x: 0, y: 0 };

        // Mesh Generation
        if (type === 'chicken') {
            // Sprite (Stardew Style)
            const texLoader = new THREE.TextureLoader();
            const map = texLoader.load('/farm_assets/textures/chicken_stardew.png');
            map.magFilter = THREE.NearestFilter;
            const mat = new THREE.SpriteMaterial({ map: map });
            this.mesh = new THREE.Sprite(mat);
            this.mesh.scale.set(30, 30, 1);
            this.mesh.center.set(0.5, 0); // Feet pivot

            this.mesh.position.set(x, 0, y);

            // Shadow
            const shadowGeo = new THREE.CircleGeometry(8, 16);
            const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true });
            this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
            this.shadow.rotation.x = -Math.PI / 2;
            this.shadow.position.y = 1;
            scene.add(this.shadow);

        } else if (type === 'cow') {
            // -- PROCEDURAL BLOCKY COW --
            this.mesh = new THREE.Group();

            // Body (White)
            const bodyGeo = new THREE.BoxGeometry(20, 15, 30);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 15;
            this.mesh.add(body);

            // Spots
            const spotGeo = new THREE.BoxGeometry(5, 1, 5);
            const spotMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
            const spot1 = new THREE.Mesh(spotGeo, spotMat);
            spot1.position.set(5, 23, 5);
            this.mesh.add(spot1);

            const spot2 = new THREE.Mesh(spotGeo, spotMat);
            spot2.position.set(-3, 23, -8);
            this.mesh.add(spot2);

            // Head
            const headGeo = new THREE.BoxGeometry(12, 12, 12);
            const head = new THREE.Mesh(headGeo, bodyMat);
            head.position.set(0, 25, 20); // Front
            this.mesh.add(head);

            // Legs
            const legGeo = new THREE.BoxGeometry(5, 10, 5);
            const createLeg = (lx, lz) => {
                const leg = new THREE.Mesh(legGeo, bodyMat);
                leg.position.set(lx, 5, lz);
                this.mesh.add(leg);
            };
            createLeg(-6, -10);
            createLeg(6, -10);
            createLeg(-6, 10);
            createLeg(6, 10);

            this.mesh.position.set(x, 0, y);
            this.mesh.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

        } else {
            // New Animals (Pig, Sheep, Duck, Horse) - Procedural Fallback
            this.mesh = new THREE.Group();

            // Colors & Scale Config
            let bodyColor = 0xffffff;
            let scaleMod = 1.0;
            let legColor = 0x333333; // Default dark hooves/feet

            if (type === 'pig') {
                bodyColor = 0xffb6c1; // Pink
                legColor = 0xffb6c1;
            } else if (type === 'sheep') {
                bodyColor = 0xdddddd; // Wooly Grey/White
            } else if (type === 'duck') {
                bodyColor = 0xffd700; // Gold/Yellow
                legColor = 0xffa500; // Orange feet
                scaleMod = 0.6; // Smaller
            } else if (type === 'horse') {
                bodyColor = 0x8b4513; // Saddle Brown
                scaleMod = 1.4; // Larger
            }

            // Body
            const bodyGeo = new THREE.BoxGeometry(20, 15, 30);
            const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 15;
            this.mesh.add(body);

            // Head (Adjust based on animal)
            const headGeo = new THREE.BoxGeometry(12, 12, 12);
            const head = new THREE.Mesh(headGeo, bodyMat);

            // Head Position tweaks
            let headY = 25;
            let headZ = 20;
            if (type === 'horse') {
                headY = 32; // Higher head for horse
                headZ = 22;
                // Neck for horse?
                const neckGeo = new THREE.BoxGeometry(8, 15, 8);
                const neck = new THREE.Mesh(neckGeo, bodyMat);
                neck.rotation.x = -Math.PI / 4;
                neck.position.set(0, 24, 18);
                this.mesh.add(neck);
            } else if (type === 'duck') {
                headY = 22;
                headZ = 16;
            }

            head.position.set(0, headY, headZ);
            this.mesh.add(head);

            // Beak for Duck
            if (type === 'duck') {
                const beakGeo = new THREE.BoxGeometry(8, 2, 4);
                const beakMat = new THREE.MeshStandardMaterial({ color: 0xffa500 }); // Orange
                const beak = new THREE.Mesh(beakGeo, beakMat);
                beak.position.set(0, headY - 2, headZ + 7);
                this.mesh.add(beak);
            }

            // Legs
            const legGeo = new THREE.BoxGeometry(5, 10, 5);
            const legMat = new THREE.MeshStandardMaterial({ color: legColor });

            const createLeg = (lx, lz) => {
                const leg = new THREE.Mesh(legGeo, legMat);
                leg.position.set(lx, 5, lz);
                this.mesh.add(leg);
            };

            if (type === 'duck') {
                // 2 Legs
                createLeg(-4, 0);
                createLeg(4, 0);
            } else {
                // 4 Legs
                createLeg(-6, -10);
                createLeg(6, -10);
                createLeg(-6, 10);
                createLeg(6, 10);
            }

            // Sheep Wool (Extra puff)
            if (type === 'sheep') {
                const woolGeo = new THREE.BoxGeometry(24, 10, 34);
                const wool = new THREE.Mesh(woolGeo, bodyMat);
                wool.position.y = 18;
                this.mesh.add(wool);
            }

            // Horse Mane/Tail
            if (type === 'horse') {
                const hairMat = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Black hair
                // Mane
                const maneGeo = new THREE.BoxGeometry(4, 8, 4);
                const mane = new THREE.Mesh(maneGeo, hairMat);
                mane.position.set(0, 35, 18);
                this.mesh.add(mane);
                // Tail
                const tailGeo = new THREE.BoxGeometry(4, 12, 4);
                const tail = new THREE.Mesh(tailGeo, hairMat);
                tail.position.set(0, 20, -16);
                tail.rotation.x = 0.5;
                this.mesh.add(tail);
            }

            this.mesh.scale.setScalar(scaleMod);

            this.mesh.position.set(x, 0, y);
            this.mesh.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
        }

        scene.add(this.mesh);
    }

    update(dt, bounds) {
        if (!this.alive) return;

        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            this.moveTimer = Math.random() * 2 + 1;
            const angle = Math.random() * Math.PI * 2;
            this.moveDir.x = Math.cos(angle);
            this.moveDir.y = Math.sin(angle);

            // Only rotate if 3D Mesh
            if (this.type !== 'chicken') {
                this.mesh.rotation.y = -angle + Math.PI / 2;
            } else {
                // Flip sprite if needed
                if (this.moveDir.x < 0) this.mesh.scale.x = -30;
                else this.mesh.scale.x = 30;
            }
        }

        this.x += this.moveDir.x * this.speed * dt;
        this.y += this.moveDir.y * this.speed * dt;

        if (bounds) {
            // Apply Padding/Margin to prevent clipping into fences
            // Bounds (Spike area) might be exact, fences have width ~4
            // Animal width is ~20 (but sprite visual vs body)
            const padding = 10;

            this.x = Math.max(bounds.x + padding, Math.min(bounds.x + bounds.width - this.width - padding, this.x));
            this.y = Math.max(bounds.y + padding, Math.min(bounds.y + bounds.height - this.height - padding, this.y));
        }

        this.mesh.position.x = this.x;
        this.mesh.position.z = this.y;

        // Sync Shadow
        if (this.shadow) {
            this.shadow.position.x = this.x;
            this.shadow.position.z = this.y;
        }

        // Hop animation
        if (this.type !== 'chicken') {
            this.mesh.position.y = 10 + Math.abs(Math.sin(Date.now() / 100)) * 5;
        } else {
            this.mesh.position.y = 15 + Math.abs(Math.sin(Date.now() / 100)) * 5; // Hop for sprite
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.alive = false;
            this.scene.remove(this.mesh); // Remove from scene
            if (this.shadow) this.scene.remove(this.shadow);
            return true;
        }
        // Flash red
        if (!this.isFlashing) {
            this.isFlashing = true;
            this.setMeshColor(0xff0000);
            setTimeout(() => {
                if (this.alive) {
                    this.setMeshColor(0xffffff);
                    this.isFlashing = false;
                }
            }, 100);
        }
        return false;
    }

    setMeshColor(hex) {
        if (this.mesh.isGroup) {
            this.mesh.traverse((node) => {
                if (node.isMesh) {
                    node.material.color.setHex(hex);
                }
            });
        } else if (this.mesh.material) {
            this.mesh.material.color.setHex(hex);
        }
    }
}
