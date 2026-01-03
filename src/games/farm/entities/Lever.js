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
        // Sprite Setup (Pixel Art) - Using Generated Gate Asset
        // Sprite Setup (Pixel Art) - The Switch
        const texLoader = new THREE.TextureLoader();
        const leverTex = texLoader.load('/farm_assets/textures/lever_sheet.png');

        // Setup Sprite with Placeholder
        const material = new THREE.SpriteMaterial({ map: leverTex, transparent: true });
        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(50, 50, 1);
        this.mesh.center.set(0.5, 0.0); // Bottom anchor
        this.mesh.position.set(x, 10, y);
        scene.add(this.mesh);

        // Async Transparency Fix for Lever
        const imgLoader = new THREE.ImageLoader();
        imgLoader.load(`/farm_assets/textures/lever_sheet.png?t=${Date.now()}`, (image) => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            // Remove center line
            const mid = canvas.width / 2;
            ctx.clearRect(mid - 4, 0, 8, canvas.height);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (r > 200 && g > 200 && b > 200) { // Remove White
                    data[i + 3] = 0;
                }
            }
            ctx.putImageData(imgData, 0, 0);

            const cleanTex = new THREE.CanvasTexture(canvas);
            cleanTex.magFilter = THREE.NearestFilter;
            cleanTex.minFilter = THREE.NearestFilter;
            cleanTex.repeat.set(0.5, 1); // 2 frames

            material.map = cleanTex;
            material.needsUpdate = true;
        });
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
