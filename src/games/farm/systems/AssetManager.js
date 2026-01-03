import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class AssetManager {
    constructor() {
        this.loader = new GLTFLoader();
        this.fbxLoader = new FBXLoader();
        this.textureLoader = new THREE.TextureLoader();
        this.assets = new Map();
    }

    load(key, url) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    this.assets.set(key, gltf.scene);
                    console.log(`Loaded asset: ${key}`);
                    resolve(gltf.scene);
                },
                undefined,
                (error) => {
                    console.warn(`Failed to load asset: ${key} from ${url}`, error);
                    resolve(null);
                }
            );
        });
    }

    loadFBX(key, url) {
        return new Promise((resolve) => {
            this.fbxLoader.load(
                url,
                (object) => {
                    this.assets.set(key, object);
                    console.log(`Loaded FBX: ${key}`);
                    resolve(object);
                },
                undefined,
                (error) => {
                    console.warn(`Failed to load FBX: ${key} from ${url}`, error);
                    resolve(null);
                }
            );
        });
    }

    loadTexture(key, url) {
        return new Promise((resolve) => {
            this.textureLoader.load(
                url,
                (texture) => {
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    this.assets.set(key, texture);
                    resolve(texture);
                },
                undefined,
                (err) => {
                    console.warn(`Failed to load texture: ${key}`, err);
                    resolve(null);
                }
            );
        });
    }

    get(key) {
        const asset = this.assets.get(key);
        if (asset) {
            return asset.clone();
        }
        return null;
    }
}
