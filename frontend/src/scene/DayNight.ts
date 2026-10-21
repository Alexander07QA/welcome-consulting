import * as THREE from 'three';
import type { TimeOfDay } from '../store/sceneStore';

// Dimensiones del consultorio (m). Gabi se sienta mirando hacia +z.
export const ROOM = { minX: -3.2, maxX: 5.8, minZ: -4, maxZ: 4, height: 3.2 } as const;
export const WINDOW = { z0: -3.0, z1: -1.2, y0: 0.85, y1: 2.55 } as const;

/** Dirección desde la que llega el sol (hacia fuera por la ventana lateral). */
export const SUN_DIR = new THREE.Vector3(-1, 0.78, -0.28).normalize();

export interface LightingPreset {
  sun: number;
  sunColor: string;
  hemi: number;
  hemiSky: string;
  hemiGround: string;
  lamp: number;
  deskLamp: number;
  beam: number;
  exposure: number;
  fog: string;
}

export const LIGHTING: Record<TimeOfDay, LightingPreset> = {
  tarde: {
    sun: 4.2,
    sunColor: '#ffd3a1',
    hemi: 0.85,
    hemiSky: '#fff1df',
    hemiGround: '#a07a5c',
    lamp: 0,
    deskLamp: 0,
    beam: 1,
    exposure: 1.0,
    fog: '#e9d6bd',
  },
  noche: {
    sun: 0.35,
    sunColor: '#9fb3e6',
    hemi: 0.16,
    hemiSky: '#6f7fb0',
    hemiGround: '#2a2018',
    lamp: 7,
    deskLamp: 2.2,
    beam: 0.18,
    exposure: 1.05,
    fog: '#1b1a24',
  },
};
