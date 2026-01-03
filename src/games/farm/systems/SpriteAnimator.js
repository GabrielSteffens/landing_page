import * as THREE from 'three';

export class SpriteAnimator {
    constructor(texture, tilesH, tilesV) {
        this.texture = texture;
        this.tilesH = tilesH;
        this.tilesV = tilesV;

        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;
        this.texture.repeat.set(1 / tilesH, 1 / tilesV);

        this.currentTile = 0;
        this.timer = 0;
        this.frameDuration = 0.1;
    }

    setFrame(col, row) {
        // Invert row because texture coords start bottom-left usually, 
        // but let's assume standard top-left mapping logic for now and adjust offset.
        // Three.js offset (0,0) is bottom-left.
        // So row 0 (top) is actually offset.y = (tilesV - 1) / tilesV

        const offsetX = col / this.tilesH;
        const offsetY = (this.tilesV - 1 - row) / this.tilesV;

        this.texture.offset.x = offsetX;
        this.texture.offset.y = offsetY;
    }
}
