import * as THREE from 'three';

export class Lever {
    constructor(x, y, scene) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.active = false;
        this.cooldown = 0;

        // Sprite Setup (Pixel Art) - With Procedural Transparency
        const map = new THREE.CanvasTexture(document.createElement('canvas')); // Placeholder
        map.magFilter = THREE.NearestFilter;

        const img = new Image();
        img.src = `assets/textures/lever_sheet.png?t=${Date.now()}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Remove Black Divider Line (Center)
            const mid = canvas.width / 2;
            ctx.clearRect(mid - 4, 0, 8, canvas.height); // Clear 8px strip in middle

            // Get image data
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Remove background (target pixels with R, G, B > 240)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Target White Background (> 200 - Aggressive)
                if (r > 200 && g > 200 && b > 200) {
                    data[i + 3] = 0; // Alpha 0
                }
            }
            ctx.putImageData(imgData, 0, 0);

            // Update Texture
            map.image = canvas;
            map.needsUpdate = true;
            map.magFilter = THREE.NearestFilter;
            map.minFilter = THREE.NearestFilter; // Sharpness
            map.repeat.set(0.5, 1); // SHOWING HALF WIDTH (2 Frames)
            map.offset.x = 0;
        };

        const material = new THREE.SpriteMaterial({ map: map, transparent: true, alphaTest: 0.5 });
        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(50, 50, 1); // Decreased from 70
        this.mesh.center.set(0.5, 0); // Bottom anchor
        this.mesh.position.set(x, 0, y);
        scene.add(this.mesh);
    }

    update(dt) {
        if (this.cooldown > 0) {
            this.cooldown -= dt;
            // ON State (Right Half)
            if (this.mesh.material.map) this.mesh.material.map.offset.x = 0.5;
        } else {
            // OFF State (Left Half)
            if (this.mesh.material.map) this.mesh.material.map.offset.x = 0;
        }
    }

    interact() {
        if (this.cooldown <= 0) {
            this.active = !this.active;
            this.cooldown = 0.5;
            return true;
        }
        return false;
    }
}
