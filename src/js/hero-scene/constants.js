// Hero scene constants, tunable DEFAULT_PARAMS and subject-fitting maths.
import { Vector3 } from 'three';
import { ASSET_BASE_URL } from '../config.js';

export const ASSETS = ASSET_BASE_URL + '/hero/scene';
export const HEAD_HEIGHT = 5.4;
const DEG = Math.PI / 180;
export const swing = (v, ampDeg, curve) => {
  const amp = ampDeg * DEG;
  if (curve < 1e-3) return amp * v;
  return (amp * Math.tanh(curve * v)) / Math.tanh(curve);
};
export const HELMET_WORN_OFFSET = new Vector3(0, -0.56, 0.35);
export const HEAD_EXTEND = 0.14;
export const STATIC_POSE = { x: 0.3, y: 0.1 };
export const CAMERA_FOV = 35;
export const CAMERA_Y = 0.1;
const visibleWorldHeight = (cameraZ) => 2 * cameraZ * Math.tan((CAMERA_FOV * Math.PI) / 360);
export const fitSubjectToBox = (params, box, canvasHeight) => {
  if (canvasHeight <= 0 || box.height <= 0) {
    return { subjectScale: params.subjectScale, subjectY: params.subjectY };
  }
  const ratio = box.height / canvasHeight;
  const world = visibleWorldHeight(params.cameraZ);
  const centreShift = canvasHeight / 2 - (box.top + box.height / 2);
  return {
    subjectScale: params.subjectScale * ratio,
    subjectY: CAMERA_Y + (params.subjectY - CAMERA_Y) * ratio + (centreShift * world) / canvasHeight,
  };
};
export const OUTLINE_MAX_WAVES = 8;
export const BACKDROP_Z = -3;
export const REFERENCE_ASPECT = 1.778;
export const PORT_WIDTH = 1440;
export const MIN_FIT = 0.9;
export const NARROW_STEP = 0.25;
export const STEP_UNDER = 1280;
export const AUTO_SWEEP_PATH = [
  { x: -0.85, y: -0.62 },
  { x: 0.78, y: -0.2 },
  { x: -0.7, y: 0.2 },
  { x: 0.82, y: 0.6 },
];
export const DEFAULT_PARAMS = {
  cameraZ: 6.5,
  subjectScale: 1.15,
  subjectX: 0,
  subjectY: 0.42,
  subjectParallax: 0.02,
  riseDistance: 200,
  riseDuration: 2,
  headScale: 0.8,
  headY: 0.58,
  headParallax: 5e-3,
  headRelight: 0.32,
  helmetScale: 0.69,
  helmetX: -0.08,
  helmetY: 0.45,
  helmetZ: 0,
  helmetFollow: 0.01,
  helmetAmpX: 2.5,
  helmetCurveX: 0,
  helmetAmpY: 2.1,
  helmetCurveY: 0,
  helmetBrightness: 1,
  trailRadius: 0.46,
  trailIdleScale: 0.28,
  trailTaper: 1.9,
  trailTaperIdle: 1.6,
  trailTaperFast: 1.25,
  trailLength: 0.64,
  revealThreshold: 0.08,
  revealEdge: 5e-3,
  revealWarp: 1.29,
  revealWarpScale: 2.9,
  revealSpeed: 1.25,
  pointerLerp: 0.17,
  pacePeak: 0.029,
  paceAttack: 0.09,
  paceRelease: 0.205,
  paceThreshold: 0.06,
  paceRamp: 0.15,
  outlinePeriod: 3.1,
  sweepWarp: 0.86,
  sweepLength: 0.67,
  sweepRadius: 0.33,
  outlineStagger: 1.2,
  outlineOpacity: 0.09,
  outlineWidth: 0.15,
  outlineBase: 0,
  outlineLightness: 0.64,
  bgLineScale: 3.8,
  bgLineCount: 2.5,
  bgLineThickness: 1.4,
  bgLineOpacity: 0.85,
  bgWaveAmount: 0.37,
  bgWaveSpeed: 1.66,
  bgRevealLightness: 0.62,
  bgRevealLightnessAlt: 0.44,
  bgRevealOpacity: 1,
  introDuration: 4,
  burnStart: 0.14,
  burnSoftness: 0.02,
  burnGlow: 4,
  autoSweepAmount: 0,
  autoSweepPeriod: 5,
  autoSweepStroke: 0.45,
  autoSweepHold: 0,
};
