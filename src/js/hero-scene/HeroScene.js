// The Three.js hero: depth-parallax portrait, 3D helmet that follows the pointer and burns in, cursor-trail reveal, animated backdrop.
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  FrontSide,
  Group,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  ASSETS,
  AUTO_SWEEP_PATH,
  BACKDROP_Z,
  CAMERA_FOV,
  CAMERA_Y,
  DEFAULT_PARAMS,
  HEAD_EXTEND,
  HEAD_HEIGHT,
  HELMET_WORN_OFFSET,
  MIN_FIT,
  NARROW_STEP,
  PORT_WIDTH,
  REFERENCE_ASPECT,
  STATIC_POSE,
  STEP_UNDER,
  swing,
} from './constants.js';
import {
  backdropVertex,
  buildBackdropFragment,
  buildRevealDeclarations,
  headFragment,
  headVertex,
  outlineFragment,
  outlineVertex,
} from './shaders.js';
import { getSceneTier } from './tier.js';
import { readToken } from '../utils/read-token.js';

export class HeroScene {
  renderer;
  scene = new Scene();
  camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
  headMaterial = null;
  headMesh = null;
  shellMaterial = null;
  helmetTextures = [];
  revealUniforms = null;
  outlineMaterial = null;
  outlineMesh = null;
  samples;
  trail;
  helmetGroup = new Group();
  helmetPivot = new Group();
  subjectGroup = new Group();
  backdropMesh = null;
  backdropMaterial = null;
  params = { ...DEFAULT_PARAMS };
  pointer = { x: 0, y: 0 };
  smoothed = { x: 0, y: 0 };
  lastSmoothed = { x: 0, y: 0 };
  pointerSeen = false;
  tilt = 0;
  yaw = 0;
  pace = 0;
  readyAt = null;
  intro = 0;
  viewportHeight = 1;
  viewportWidth = 1;
  riseStarted = false;
  riseAt = null;
  sweepPointer = {
    x: AUTO_SWEEP_PATH[0].x,
    y: AUTO_SWEEP_PATH[0].y,
  };
  sweepSmoothed = { ...this.sweepPointer };
  sweepLast = { ...this.sweepPointer };
  sweepPace = 0;
  sweepCycle = 0;
  sweepTrail;
  aspect = 1;
  reveal = 0;
  settled = false;
  disposed = false;
  startTime = null;
  _tier;
  get tier() {
    return this._tier;
  }
  ready = false;
  onReady = null;
  onError = null;
  constructor(canvas) {
    this._tier = getSceneTier();
    this.samples = this._tier.trailSamples;
    this.trail = Array.from({ length: this.samples }, () => new Vector2(STATIC_POSE.x, -STATIC_POSE.y));
    this.sweepTrail = Array.from(
      { length: this.samples },
      () => new Vector2(AUTO_SWEEP_PATH[0].x, -AUTO_SWEEP_PATH[0].y),
    );
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: false,
      antialias: this._tier.antialias,
      stencil: false,
      powerPreference: this._tier.mobile ? 'default' : 'high-performance',
    });
    this.renderer.setClearColor(new Color(getComputedStyle(document.body).backgroundColor));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this._tier.maxDpr));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    if (!this._tier.pointerEnabled) this.parkPointer();
    this.camera.position.set(0, CAMERA_Y, 6.5);
    this.helmetGroup.add(this.helmetPivot);
    this.subjectGroup.add(this.helmetGroup);
    this.scene.add(this.subjectGroup);
    this.load().catch((error) => this.onError?.(error));
  }
  retune() {
    const fresh = getSceneTier();
    const previous = this._tier;
    const tier = {
      ...fresh,
      antialias: previous.antialias,
      trailSamples: previous.trailSamples,
    };
    this._tier = tier;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.maxDpr));
    if (this.outlineMesh) this.outlineMesh.visible = tier.outline;
    if (!tier.pointerEnabled) this.parkPointer();
    else if (!previous.pointerEnabled) this.pointerSeen = false;
    if (!tier.freeze) this.settled = false;
    return tier;
  }
  parkPointer() {
    this.pointer = { ...STATIC_POSE };
    this.smoothed = { ...STATIC_POSE };
    this.lastSmoothed = { ...STATIC_POSE };
    this.tilt = this.pitchFor(STATIC_POSE.y);
    this.yaw = this.yawFor(STATIC_POSE.x);
    this.pointerSeen = false;
  }
  beginRise() {
    this.riseStarted = true;
  }
  setPointer(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    if (!this.pointerSeen) {
      this.pointerSeen = true;
      this.smoothed.x = x;
      this.smoothed.y = y;
      this.lastSmoothed.x = x;
      this.lastSmoothed.y = y;
      this.tilt = this.pitchFor(y);
      this.yaw = this.yawFor(x);
    }
  }
  pitchFor(y) {
    return swing(y, this.params.helmetAmpX, this.params.helmetCurveX);
  }
  yawFor(x) {
    return swing(x, this.params.helmetAmpY, this.params.helmetCurveY);
  }
  setParams(partial) {
    Object.assign(this.params, partial);
    this.settled = false;
  }
  resize(width, height) {
    this.renderer.setSize(width, height, false);
    this.viewportHeight = Math.max(height, 1);
    this.viewportWidth = Math.max(width, 1);
    this.aspect = width / height;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    if (this.revealUniforms) this.revealUniforms.uAspect.value = this.aspect;
  }
  update(time) {
    if (this.disposed || this.settled) return;
    if (this.startTime === null) this.startTime = time;
    const t = (time - this.startTime) / 1e3;
    const p = this.params;
    if (this._tier.freeze && this.reveal > 0.995 && this.intro >= 1) {
      this.settled = true;
    }
    const autoEnabled = p.autoSweepAmount > 0 && !this._tier.freeze && this.intro >= 1;
    if (autoEnabled) {
      const cycle = t % Math.max(p.autoSweepPeriod, 1e-3);
      if (cycle < this.sweepCycle) this.resetSweep();
      this.sweepCycle = cycle;
      const legs = AUTO_SWEEP_PATH.length - 1;
      const stroke = Math.max(p.autoSweepStroke, 0.05);
      const slot = stroke + Math.max(p.autoSweepHold, 0);
      const leg = Math.floor(cycle / slot);
      if (leg < legs) {
        const local = Math.min(1, (cycle - leg * slot) / stroke);
        const eased = 1 - (1 - local) * (1 - local);
        const from = AUTO_SWEEP_PATH[leg];
        const to = AUTO_SWEEP_PATH[leg + 1];
        this.sweepPointer.x = (from.x + (to.x - from.x) * eased) * p.autoSweepAmount;
        this.sweepPointer.y = (from.y + (to.y - from.y) * eased) * p.autoSweepAmount;
      }
    }
    this.sweepSmoothed.x += (this.sweepPointer.x - this.sweepSmoothed.x) * p.pointerLerp;
    this.sweepSmoothed.y += (this.sweepPointer.y - this.sweepSmoothed.y) * p.pointerLerp;
    const sweepStep = Math.hypot(
      this.sweepSmoothed.x - this.sweepLast.x,
      this.sweepSmoothed.y - this.sweepLast.y,
    );
    const sweepTarget = autoEnabled ? Math.min(1, sweepStep / Math.max(p.pacePeak, 1e-5)) : 0;
    this.sweepPace +=
      (sweepTarget - this.sweepPace) * (sweepTarget > this.sweepPace ? p.paceAttack : p.paceRelease);
    this.sweepLast.x = this.sweepSmoothed.x;
    this.sweepLast.y = this.sweepSmoothed.y;
    const oldestSweep = this.sweepTrail.pop();
    if (oldestSweep) {
      oldestSweep.set(this.sweepSmoothed.x, -this.sweepSmoothed.y);
      this.sweepTrail.unshift(oldestSweep);
    }
    this.smoothed.x += (this.pointer.x - this.smoothed.x) * p.pointerLerp;
    this.smoothed.y += (this.pointer.y - this.smoothed.y) * p.pointerLerp;
    if (this.ready) {
      if (this.readyAt === null) this.readyAt = t;
      this.intro = Math.min(1, (t - this.readyAt) / Math.max(p.introDuration, 1e-3));
      if (this._tier.freeze) this.intro = 1;
    }
    this.camera.position.z = p.cameraZ;
    this.subjectGroup.scale.setScalar(p.subjectScale * this.narrowFit());
    this.subjectGroup.position.x =
      p.subjectX +
      (this.viewportWidth < STEP_UNDER && this.aspect >= 1.2 ? NARROW_STEP : 0) +
      this.smoothed.x * p.subjectParallax;
    this.subjectGroup.position.y = p.subjectY - this.smoothed.y * p.subjectParallax - this.riseOffset(t, p);
    if (this.headMaterial) {
      this.headMaterial.uniforms.uParallax.value.set(this.smoothed.x, -this.smoothed.y);
      this.headMaterial.uniforms.uReveal.value = this.reveal;
      this.headMaterial.uniforms.uDepthScale.value = p.headParallax;
      this.headMaterial.uniforms.uRelight.value = p.headRelight;
    }
    if (this.headMesh) {
      this.headMesh.scale.setScalar(p.headScale);
      this.headMesh.position.y = -0.55 + p.headY - (HEAD_HEIGHT * HEAD_EXTEND * p.headScale) / 2;
    }
    this.tilt += (this.pitchFor(this.smoothed.y) - this.tilt) * p.pointerLerp;
    this.yaw += (this.yawFor(this.smoothed.x) - this.yaw) * p.pointerLerp;
    this.helmetPivot.rotation.x = this.tilt;
    this.helmetPivot.rotation.y = this.yaw;
    this.helmetGroup.position.x = p.helmetX + this.smoothed.x * p.helmetFollow;
    this.helmetGroup.position.y = p.helmetY - this.smoothed.y * p.helmetFollow * 0.8;
    this.helmetGroup.position.z = p.helmetZ;
    this.helmetGroup.scale.setScalar(p.helmetScale);
    const step = Math.hypot(this.smoothed.x - this.lastSmoothed.x, this.smoothed.y - this.lastSmoothed.y);
    if (this._tier.pointerEnabled) {
      const target = Math.min(1, step / Math.max(p.pacePeak, 1e-5));
      this.pace += (target - this.pace) * (target > this.pace ? p.paceAttack : p.paceRelease);
    } else if (!autoEnabled && this.intro >= 1 && this._tier.reveal) {
      this.pace = 1;
    }
    this.lastSmoothed.x = this.smoothed.x;
    this.lastSmoothed.y = this.smoothed.y;
    const oldest = this.trail.pop();
    if (oldest) {
      oldest.set(this.smoothed.x, -this.smoothed.y);
      this.trail.unshift(oldest);
    }
    if (this.revealUniforms) {
      this.revealUniforms.uAspect.value = this.aspect;
      this.revealUniforms.uRadius.value = p.trailRadius;
      this.revealUniforms.uIdleScale.value = p.trailIdleScale;
      this.revealUniforms.uTaper.value = p.trailTaper;
      this.revealUniforms.uTaperIdle.value = p.trailTaperIdle;
      this.revealUniforms.uTaperFast.value = p.trailTaperFast;
      this.revealUniforms.uLength.value = p.trailLength;
      this.revealUniforms.uPace.value = this.pace;
      this.revealUniforms.uGateStart.value = p.paceThreshold;
      this.revealUniforms.uGateWidth.value = p.paceRamp;
      this.revealUniforms.uWarpScale.value = p.revealWarpScale;
      this.revealUniforms.uTime.value = t * p.revealSpeed;
      this.revealUniforms.uRevealMix.value = this.reveal;
      this.revealUniforms.uThreshold.value = p.revealThreshold;
      this.revealUniforms.uEdge.value = p.revealEdge;
      this.revealUniforms.uWarp.value = p.revealWarp;
      this.revealUniforms.uIntro.value = this.intro;
      this.revealUniforms.uBurnStart.value = p.burnStart;
      this.revealUniforms.uBurnSoft.value = p.burnSoftness;
      this.revealUniforms.uBurnGlow.value = p.burnGlow;
      this.revealUniforms.uSweepPace.value = this.sweepPace;
      this.revealUniforms.uSweepWarp.value = p.sweepWarp;
      this.revealUniforms.uSweepLength.value = p.sweepLength;
      this.revealUniforms.uSweepRadius.value = p.sweepRadius;
      this.writeTrailBounds(
        this.trail,
        p.trailLength,
        p.revealWarp,
        p.trailRadius,
        this.revealUniforms.uTrailMin.value,
        this.revealUniforms.uTrailMax.value,
      );
      this.writeTrailBounds(
        this.sweepTrail,
        p.sweepLength,
        p.sweepWarp,
        p.sweepRadius,
        this.revealUniforms.uSweepMin.value,
        this.revealUniforms.uSweepMax.value,
      );
    }
    if (this.backdropMesh && this.backdropMaterial) {
      const distance = this.camera.position.z - BACKDROP_Z;
      const height = 2 * distance * Math.tan((this.camera.fov * Math.PI) / 360) * 1.06;
      this.backdropMesh.scale.set(height * this.aspect, height, 1);
      const bg = this.backdropMaterial.uniforms;
      bg.uLineScale.value = p.bgLineScale;
      bg.uLineCount.value = p.bgLineCount;
      bg.uLineThickness.value = p.bgLineThickness;
      bg.uLineOpacity.value = p.bgLineOpacity;
      bg.uWaveAmount.value = p.bgWaveAmount;
      bg.uWaveSpeed.value = p.bgWaveSpeed;
      bg.uRevealOpacity.value = p.bgRevealOpacity;
      bg.uRevealColor.value.setScalar(p.bgRevealLightness);
      bg.uRevealColorAlt.value.setScalar(p.bgRevealLightnessAlt);
    }
    if (this.outlineMaterial) {
      const outline = this.outlineMaterial.uniforms;
      outline.uTime.value = t;
      outline.uPeriod.value = p.outlinePeriod;
      outline.uStagger.value = p.outlineStagger;
      outline.uOpacity.value = p.outlineOpacity;
      outline.uWidth.value = p.outlineWidth;
      outline.uLightness.value = p.outlineLightness;
      outline.uBase.value = p.outlineBase;
      outline.uRevealMix.value = this.reveal * this.burnProgress(p);
    }
    this.shellMaterial?.color.setScalar(p.helmetBrightness);
    this.renderer.render(this.scene, this.camera);
  }
  riseOffset(t, p) {
    if (this._tier.freeze || p.riseDistance === 0) return 0;
    let remaining = 1;
    if (this.riseStarted) {
      if (this.riseAt === null) this.riseAt = t;
      const u = Math.min(1, (t - this.riseAt) / Math.max(p.riseDuration, 1e-3));
      remaining = 1 - (1 - (1 - u) * (1 - u));
    }
    if (remaining <= 0) return 0;
    const visible = 2 * p.cameraZ * Math.tan((this.camera.fov * Math.PI) / 360);
    return remaining * p.riseDistance * (visible / this.viewportHeight);
  }
  burnProgress(p) {
    const span = Math.max(1 - p.burnStart, 1e-4);
    const x = Math.min(1, Math.max(0, (this.intro - p.burnStart) / span));
    return x * x * (3 - 2 * x);
  }
  resetSweep() {
    const start = AUTO_SWEEP_PATH[0];
    const amount = this.params.autoSweepAmount;
    const x = start.x * amount;
    const y = start.y * amount;
    this.sweepPointer.x = x;
    this.sweepPointer.y = y;
    this.sweepSmoothed.x = x;
    this.sweepSmoothed.y = y;
    this.sweepLast.x = x;
    this.sweepLast.y = y;
    this.sweepPace = 0;
    for (const sample of this.sweepTrail) sample.set(x, -y);
  }
  narrowFit() {
    if (this.viewportWidth >= PORT_WIDTH) return 1;
    if (this.aspect < 1.2) return 1;
    return Math.max(MIN_FIT, Math.min(1, this.aspect / REFERENCE_ASPECT));
  }
  writeTrailBounds(trail, length, warp, radius, min, max) {
    const active = Math.min(trail.length, Math.ceil(length * (this.samples - 1)) + 1);
    const margin = radius + warp * 0.22 + 0.05;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < active; i++) {
      const sample = trail[i];
      const x = sample.x * this.aspect;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (sample.y < minY) minY = sample.y;
      if (sample.y > maxY) maxY = sample.y;
    }
    min.set(minX - margin, minY - margin);
    max.set(maxX + margin, maxY + margin);
  }
  dispose() {
    this.disposed = true;
    this.scene.traverse((object) => {
      const mesh = object;
      if (mesh.geometry) mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) {
          if (value instanceof Texture) value.dispose();
        }
        material.dispose();
      }
    });
    this.renderer.dispose();
  }
  async load() {
    const textureLoader = new TextureLoader();
    const loadTexture = (file, srgb = false, forGltf = false) =>
      new Promise((resolve, reject) => {
        textureLoader.load(
          `${ASSETS}/${file}`,
          (texture) => {
            if (srgb) texture.colorSpace = SRGBColorSpace;
            if (forGltf) texture.flipY = false;
            texture.minFilter = LinearMipmapLinearFilter;
            texture.generateMipmaps = true;
            resolve(texture);
          },
          void 0,
          () => reject(new Error(`${ASSETS}/${file}`)),
        );
      });
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    const tag = (promise, url) =>
      promise.catch(() => {
        throw new Error(url);
      });
    const [env, headMaps, helmetGltf, noise] = await Promise.all([
      tag(new RGBELoader().loadAsync(`${ASSETS}/studio-light.hdr`), `${ASSETS}/studio-light.hdr`),
      Promise.all([
        loadTexture('person-diffuse.webp', true),
        loadTexture('person-depth.webp'),
        loadTexture('person-alpha.webp'),
        loadTexture('person-normal.webp'),
      ]),
      tag(gltfLoader.loadAsync(`${ASSETS}/helmet3.glb`), `${ASSETS}/helmet3.glb`),
      loadTexture('noise.webp'),
    ]);
    if (this.disposed) return;
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromEquirectangular(env).texture;
    env.dispose();
    pmrem.dispose();
    this.buildHead(headMaps[0], headMaps[1], headMaps[2], headMaps[3]);
    this.buildHelmet(helmetGltf.scene, noise);
    this.buildBackdrop(noise);
    this.reveal = 1;
    for (const texture of [...headMaps, noise, ...this.helmetTextures]) {
      this.renderer.initTexture(texture);
    }
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
    this.ready = true;
    this.onReady?.();
  }
  buildHead(diffuse, depth, alpha, normal) {
    this.headMaterial = new ShaderMaterial({
      vertexShader: headVertex,
      fragmentShader: headFragment,
      uniforms: {
        uDiffuse: { value: diffuse },
        uDepth: { value: depth },
        uAlpha: { value: alpha },
        uNormal: { value: normal },
        uParallax: { value: new Vector2() },
        uReveal: { value: 0 },
        uDepthScale: { value: DEFAULT_PARAMS.headParallax },
        uRelight: { value: DEFAULT_PARAMS.headRelight },
        uExtend: { value: HEAD_EXTEND },
      },
      transparent: true,
    });
    const geometry = new PlaneGeometry(HEAD_HEIGHT, HEAD_HEIGHT * (1 + HEAD_EXTEND));
    const head = new Mesh(geometry, this.headMaterial);
    head.position.set(0, -0.55, 0);
    this.headMesh = head;
    this.subjectGroup.add(head);
  }
  buildHelmet(root, noise) {
    noise.wrapS = RepeatWrapping;
    noise.wrapT = RepeatWrapping;
    this.revealUniforms = {
      uTrail: { value: this.trail },
      uTrailMin: { value: new Vector2(-1e3, -1e3) },
      uTrailMax: { value: new Vector2(1e3, 1e3) },
      uSweep: { value: this.sweepTrail },
      uSweepMin: { value: new Vector2(-1e3, -1e3) },
      uSweepMax: { value: new Vector2(1e3, 1e3) },
      uSweepPace: { value: 0 },
      uSweepWarp: { value: DEFAULT_PARAMS.sweepWarp },
      uSweepLength: { value: DEFAULT_PARAMS.sweepLength },
      uSweepRadius: { value: DEFAULT_PARAMS.sweepRadius },
      uAspect: { value: this.aspect },
      uRadius: { value: DEFAULT_PARAMS.trailRadius },
      uIdleScale: { value: DEFAULT_PARAMS.trailIdleScale },
      uTaper: { value: DEFAULT_PARAMS.trailTaper },
      uTaperIdle: { value: DEFAULT_PARAMS.trailTaperIdle },
      uTaperFast: { value: DEFAULT_PARAMS.trailTaperFast },
      uLength: { value: DEFAULT_PARAMS.trailLength },
      uPace: { value: 0 },
      uGateStart: { value: DEFAULT_PARAMS.paceThreshold },
      uGateWidth: { value: DEFAULT_PARAMS.paceRamp },
      uWarpScale: { value: DEFAULT_PARAMS.revealWarpScale },
      uTime: { value: 0 },
      uThreshold: { value: DEFAULT_PARAMS.revealThreshold },
      uEdge: { value: DEFAULT_PARAMS.revealEdge },
      uWarp: { value: DEFAULT_PARAMS.revealWarp },
      uRevealMix: { value: 0 },
      uNoiseTex: { value: noise },
      uIntro: { value: 0 },
      uBurnStart: { value: DEFAULT_PARAMS.burnStart },
      uBurnSoft: { value: DEFAULT_PARAMS.burnSoftness },
      uBurnGlow: { value: DEFAULT_PARAMS.burnGlow },
      uBurnColor: { value: new Color(readToken('--accent')) },
    };
    root.traverse((object) => {
      if (!object.isMesh) return;
      const mesh = object;
      const shell = mesh.material;
      shell.side = FrontSide;
      shell.transparent = true;
      shell.depthWrite = false;
      shell.envMapIntensity = 1.3;
      this.injectRevealMask(shell);
      mesh.renderOrder = 1;
      this.shellMaterial = shell;
      for (const map of [shell.map, shell.normalMap, shell.roughnessMap, shell.metalnessMap]) {
        if (map && !this.helmetTextures.includes(map)) {
          this.helmetTextures.push(map);
        }
      }
    });
    const bounds = new Box3().setFromObject(root);
    const size = bounds.getSize(new Vector3());
    const scale = (HEAD_HEIGHT * 0.56) / size.y;
    root.scale.setScalar(scale);
    bounds.setFromObject(root);
    const center = bounds.getCenter(new Vector3());
    root.position.sub(center);
    this.helmetPivot.position.copy(HELMET_WORN_OFFSET);
    this.helmetPivot.add(root);
    this.helmetGroup.updateMatrixWorld(true);
    this.buildOutline(root);
  }
  buildOutline(root) {
    const toGroupLocal = this.helmetPivot.matrixWorld.clone().invert();
    const geometries = [];
    root.traverse((object) => {
      const mesh = object;
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(new Matrix4().multiplyMatrices(toGroupLocal, mesh.matrixWorld));
      for (const name of Object.keys(geometry.attributes)) {
        if (name !== 'position') geometry.deleteAttribute(name);
      }
      geometries.push(geometry);
    });
    if (!geometries.length) return;
    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!merged) return;
    merged.computeBoundingBox();
    const bounds = merged.boundingBox;
    const minY = bounds?.min.y ?? 0;
    const rangeY = bounds ? bounds.max.y - bounds.min.y : 1;
    this.outlineMaterial = new ShaderMaterial({
      vertexShader: outlineVertex,
      fragmentShader: outlineFragment,
      wireframe: true,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPeriod: { value: DEFAULT_PARAMS.outlinePeriod },
        uStagger: { value: DEFAULT_PARAMS.outlineStagger },
        uOpacity: { value: DEFAULT_PARAMS.outlineOpacity },
        uWidth: { value: DEFAULT_PARAMS.outlineWidth },
        uLightness: { value: DEFAULT_PARAMS.outlineLightness },
        uBase: { value: DEFAULT_PARAMS.outlineBase },
        uRevealMix: { value: 0 },
        uColor: { value: new Color(readToken('--foreground')) },
        uMinY: { value: minY },
        uRangeY: { value: rangeY },
      },
    });
    const outline = new Mesh(merged, this.outlineMaterial);
    outline.renderOrder = 3;
    outline.visible = this._tier.outline;
    this.outlineMesh = outline;
    this.helmetPivot.add(outline);
  }
  injectRevealMask(material) {
    const uniforms = this.revealUniforms;
    if (!uniforms) return;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec4 vRevealClip;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvRevealClip = gl_Position;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec4 vRevealClip;
           uniform float uIntro;
           uniform float uBurnStart;
           uniform float uBurnSoft;
           uniform float uBurnGlow;
           uniform vec3 uBurnColor;
           ${buildRevealDeclarations(this.samples)}`,
        )
        .replace(
          '#include <alphamap_fragment>',
          `#include <alphamap_fragment>
           vec2 revealNdc = vRevealClip.xy / vRevealClip.w;
           float burnFront = smoothstep(uBurnStart, 1.0, uIntro);
           float burnNoise = texture2D(uNoiseTex, revealNdc * 0.5 + 0.5).r;
           float burnHeight = 1.0 - (revealNdc.y * 0.5 + 0.5);
           float burnAt = mix(burnHeight, burnNoise, 0.45);
           float intact = smoothstep(
             burnFront - uBurnSoft,
             burnFront + uBurnSoft,
             burnAt
           );
           float mask = max(revealTrail(revealNdc), intact);
           diffuseColor.a *= mask * uRevealMix;
           float burnEdge = 4.0 * intact * (1.0 - intact);
           diffuseColor.rgb += uBurnColor * burnEdge * uBurnGlow * uRevealMix;`,
        );
    };
  }
  buildBackdrop(noise) {
    const uniforms = this.revealUniforms;
    if (!uniforms) return;
    this.backdropMaterial = new ShaderMaterial({
      vertexShader: backdropVertex,
      fragmentShader: buildBackdropFragment(this.samples),
      depthWrite: false,
      uniforms: {
        ...uniforms,
        uNoiseTex: { value: noise },
        uBackground: { value: new Color(readToken('--background')) },
        uLineColor: { value: new Color(readToken('--surface-soft')) },
        uRevealColor: {
          value: new Color().setScalar(DEFAULT_PARAMS.bgRevealLightness),
        },
        uRevealColorAlt: {
          value: new Color().setScalar(DEFAULT_PARAMS.bgRevealLightnessAlt),
        },
        uLineScale: { value: DEFAULT_PARAMS.bgLineScale },
        uLineCount: { value: DEFAULT_PARAMS.bgLineCount },
        uLineThickness: { value: DEFAULT_PARAMS.bgLineThickness },
        uLineOpacity: { value: DEFAULT_PARAMS.bgLineOpacity },
        uWaveAmount: { value: DEFAULT_PARAMS.bgWaveAmount },
        uWaveSpeed: { value: DEFAULT_PARAMS.bgWaveSpeed },
        uRevealOpacity: { value: DEFAULT_PARAMS.bgRevealOpacity },
      },
    });
    const backdrop = new Mesh(new PlaneGeometry(1, 1), this.backdropMaterial);
    backdrop.position.z = BACKDROP_Z;
    backdrop.renderOrder = -1;
    this.backdropMesh = backdrop;
    this.scene.add(backdrop);
  }
}
