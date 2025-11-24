import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    NOISE_OCTAVES,
    NOISE_POSITION_SCALE,
    NOISE_TIME_SCALE,
    NOISE_SCALE,
    BASE_SPEED,
    PARTICLE_OPACITY_SCALE,
    FLOOR_ORIGIN,
    BACKGROUND_DISTANCE_SCALE,
    QUALITY_LEVELS,
    SPAWN_RADIUS,
    BASE_LIFETIME,
    MAX_ADDITIONAL_LIFETIME,
    OFFSET_RADIUS,
    PROJECTION_FOV,
    PROJECTION_NEAR,
    PROJECTION_FAR,
    LIGHT_DIRECTION,
    LIGHT_UP_VECTOR,
    LIGHT_PROJECTION_LEFT,
    LIGHT_PROJECTION_RIGHT,
    LIGHT_PROJECTION_TOP,
    LIGHT_PROJECTION_BOTTOM,
    LIGHT_PROJECTION_NEAR,
    LIGHT_PROJECTION_FAR,
    CAMERA_DISTANCE,
    INITIAL_AZIMUTH,
    INITIAL_ELEVATION,
    MIN_ELEVATION,
    MAX_ELEVATION,
    CAMERA_ORBIT_POINT,
    CAMERA_SENSITIVITY,
    INITIAL_SPEED,
    INITIAL_TURBULENCE,
    OPACITY_TEXTURE_RESOLUTION,
    SLICES,
    SORT_PASSES_PER_FRAME,
    MAX_DELTA_TIME,
    PRESIMULATION_DELTA_TIME,
    PARTICLE_SATURATION,
    PARTICLE_VALUE,
    randomPointInSphere,
    log2,
    hsvToRGB
} from './shared-three.js';

// Shader sources
const SIMULATION_VERTEX_SHADER = `
precision highp float;

attribute vec2 a_position;

void main () {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const SIMULATION_FRAGMENT_SHADER = `
precision highp float;

uniform sampler2D u_particleTexture;
uniform sampler2D u_spawnTexture;

uniform vec2 u_resolution;

uniform float u_deltaTime;
uniform float u_time;

uniform float u_persistence;

const int OCTAVES = ${NOISE_OCTAVES};

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

float mod289(float x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) {
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p,s;

    p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

    return p;
}

#define F4 0.309016994374947451

vec4 simplexNoiseDerivatives (vec4 v) {
    const vec4  C = vec4( 0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958);

    vec4 i  = floor(v + dot(v, vec4(F4)) );
    vec4 x0 = v -   i + dot(i, C.xxxx);

    vec4 i0;
    vec3 isX = step( x0.yzw, x0.xxx );
    vec3 isYZ = step( x0.zww, x0.yyz );
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;

    vec4 i3 = clamp( i0, 0.0, 1.0 );
    vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
    vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;

    i = mod289(i);
    float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));


    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4,p4));

    vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2));
    vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));

    vec3 m0 = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    vec2 m1 = max(0.5 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);

    vec3 temp0 = -6.0 * m0 * m0 * values0;
    vec2 temp1 = -6.0 * m1 * m1 * values1;

    vec3 mmm0 = m0 * m0 * m0;
    vec2 mmm1 = m1 * m1 * m1;

    float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;
    float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;
    float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;
    float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;

    return vec4(dx, dy, dz, dw) * 49.0;
}

void main () {
    vec2 textureCoordinates = gl_FragCoord.xy / u_resolution;
    vec4 data = texture2D(u_particleTexture, textureCoordinates);

    vec3 oldPosition = data.rgb;

    vec3 noisePosition = oldPosition * ${NOISE_POSITION_SCALE.toFixed(8)};

    float noiseTime = u_time * ${NOISE_TIME_SCALE.toFixed(8)};

    vec4 xNoisePotentialDerivatives = vec4(0.0);
    vec4 yNoisePotentialDerivatives = vec4(0.0);
    vec4 zNoisePotentialDerivatives = vec4(0.0);

    float persistence = u_persistence;

    for (int i = 0; i < OCTAVES; ++i) {
        float scale = (1.0 / 2.0) * pow(2.0, float(i));

        float noiseScale = pow(persistence, float(i));
        if (persistence == 0.0 && i == 0) {
            noiseScale = 1.0;
        }

        xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(noisePosition * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;
        yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((noisePosition + vec3(123.4, 129845.6, -1239.1)) * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;
        zNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((noisePosition + vec3(-9519.0, 9051.0, -123.0)) * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;
    }

    vec3 noiseVelocity = vec3(
        zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
        xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
        yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]
    ) * ${NOISE_SCALE.toFixed(8)};

    vec3 velocity = vec3(${BASE_SPEED.toFixed(8)}, 0.0, 0.0);
    vec3 totalVelocity = velocity + noiseVelocity;

    vec3 newPosition = oldPosition + totalVelocity * u_deltaTime;

    float oldLifetime = data.a;
    float newLifetime = oldLifetime - u_deltaTime;

    vec4 spawnData = texture2D(u_spawnTexture, textureCoordinates);

    if (newLifetime < 0.0) {
        newPosition = spawnData.rgb;
        newLifetime = spawnData.a + newLifetime;
    }

    gl_FragColor = vec4(newPosition, newLifetime);
}
`;

const RENDERING_VERTEX_SHADER = `
precision highp float;

attribute vec2 a_textureCoordinates;

varying vec3 v_position;
varying float v_opacity;

uniform sampler2D u_particleTexture;
uniform sampler2D u_opacityTexture;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat4 u_lightViewProjectionMatrix;

uniform float u_particleDiameter;
uniform float u_screenWidth;

void main () {
    vec3 position = texture2D(u_particleTexture, a_textureCoordinates).rgb;
    v_position = position;

    vec2 lightTextureCoordinates = vec2(u_lightViewProjectionMatrix * vec4(position, 1.0)) * 0.5 + 0.5;
    v_opacity = texture2D(u_opacityTexture, lightTextureCoordinates).a;

    vec3 viewSpacePosition = vec3(u_viewMatrix * vec4(position, 1.0));
    vec4 corner = vec4(u_particleDiameter * 0.5, u_particleDiameter * 0.5, viewSpacePosition.z, 1.0);
    float projectedCornerX = dot(vec4(u_projectionMatrix[0][0], u_projectionMatrix[1][0], u_projectionMatrix[2][0], u_projectionMatrix[3][0]), corner);
    float projectedCornerW = dot(vec4(u_projectionMatrix[0][3], u_projectionMatrix[1][3], u_projectionMatrix[2][3], u_projectionMatrix[3][3]), corner);
    gl_PointSize = u_screenWidth * 0.5 * projectedCornerX * 2.0 / projectedCornerW;

    gl_Position = u_projectionMatrix * vec4(viewSpacePosition, 1.0);

    if (position.y < ${FLOOR_ORIGIN[1].toFixed(8)}) gl_Position = vec4(9999999.0, 9999999.0, 9999999.0, 1.0);
}
`;

const RENDERING_FRAGMENT_SHADER = `
precision highp float;

varying vec3 v_position;
varying float v_opacity;

uniform float u_particleAlpha;
uniform vec3 u_particleColor;
uniform bool u_flipped;

void main () {
    float distanceFromCenter = distance(gl_PointCoord.xy, vec2(0.5, 0.5));
    if (distanceFromCenter > 0.5) discard;
    float alpha = clamp(1.0 - distanceFromCenter * 2.0, 0.0, 1.0) * u_particleAlpha;

    vec3 color = (1.0 - v_opacity * ${PARTICLE_OPACITY_SCALE.toFixed(8)}) * u_particleColor;

    gl_FragColor = vec4(color * alpha, alpha);
}
`;

const OPACITY_VERTEX_SHADER = `
precision highp float;

attribute vec2 a_textureCoordinates;

uniform sampler2D u_particleTexture;
uniform mat4 u_lightViewMatrix;
uniform mat4 u_lightProjectionMatrix;
uniform float u_particleDiameter;
uniform float u_screenWidth;

void main () {
    vec3 position = texture2D(u_particleTexture, a_textureCoordinates).rgb;
    vec3 viewSpacePosition = vec3(u_lightViewMatrix * vec4(position, 1.0));
    vec4 corner = vec4(u_particleDiameter * 0.5, u_particleDiameter * 0.5, viewSpacePosition.z, 1.0);
    float projectedCornerX = dot(vec4(u_lightProjectionMatrix[0][0], u_lightProjectionMatrix[1][0], u_lightProjectionMatrix[2][0], u_lightProjectionMatrix[3][0]), corner);
    float projectedCornerW = dot(vec4(u_lightProjectionMatrix[0][3], u_lightProjectionMatrix[1][3], u_lightProjectionMatrix[2][3], u_lightProjectionMatrix[3][3]), corner);
    gl_PointSize = u_screenWidth * 0.5 * projectedCornerX * 2.0 / projectedCornerW;
    gl_Position = u_lightProjectionMatrix * vec4(viewSpacePosition, 1.0);
}
`;

const OPACITY_FRAGMENT_SHADER = `
precision highp float;

uniform float u_particleAlpha;

void main () {
    float distanceFromCenter = distance(gl_PointCoord.xy, vec2(0.5, 0.5));
    if (distanceFromCenter > 0.5) discard;
    float alpha = clamp(1.0 - distanceFromCenter * 2.0, 0.0, 1.0) * u_particleAlpha;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`;

const SORT_VERTEX_SHADER = `
precision highp float;

attribute vec2 a_position;

void main () {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const SORT_FRAGMENT_SHADER = `
precision highp float;

uniform sampler2D u_dataTexture;
uniform vec2 u_resolution;
uniform float pass;
uniform float stage;
uniform vec3 u_halfVector;

void main () {
    vec2 normalizedCoordinates = gl_FragCoord.xy / u_resolution;
    vec4 self = texture2D(u_dataTexture, normalizedCoordinates);
    float i = floor(normalizedCoordinates.x * u_resolution.x) + floor(normalizedCoordinates.y * u_resolution.y) * u_resolution.x;
    float j = floor(mod(i, 2.0 * stage));
    float compare = 0.0;

    if ((j < mod(pass, stage)) || (j > (2.0 * stage - mod(pass, stage) - 1.0))) {
        compare = 0.0;
    } else {
        if (mod((j + mod(pass, stage)) / pass, 2.0) < 1.0) {
            compare = 1.0;
        } else {
            compare = -1.0;
        }
    }

    float adr = i + compare * pass;
    vec4 partner = texture2D(u_dataTexture, vec2(floor(mod(adr, u_resolution.x)) / u_resolution.x, floor(adr / u_resolution.x) / u_resolution.y));
    float selfProjectedLength = dot(u_halfVector, self.xyz);
    float partnerProjectedLength = dot(u_halfVector, partner.xyz);

    gl_FragColor = (selfProjectedLength * compare < partnerProjectedLength * compare) ? self : partner;
}
`;

const RESAMPLE_VERTEX_SHADER = `
precision highp float;

attribute vec2 a_position;
varying vec2 v_coordinates;

void main () {
    v_coordinates = a_position.xy * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const RESAMPLE_FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_particleTexture;
uniform sampler2D u_offsetTexture;
uniform float u_offsetScale;

void main () {
    vec4 data = texture2D(u_particleTexture, v_coordinates);
    vec4 offset = texture2D(u_offsetTexture, v_coordinates);
    vec3 position = data.rgb + offset.rgb * u_offsetScale;
    gl_FragColor = vec4(position, data.a);
}
`;

const FLOOR_VERTEX_SHADER = `
precision highp float;

attribute vec3 a_vertexPosition;
varying vec3 v_position;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

void main () {
    v_position = a_vertexPosition;
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_vertexPosition, 1.0);
}
`;

const FLOOR_FRAGMENT_SHADER = `
precision highp float;

varying vec3 v_position;

uniform sampler2D u_opacityTexture;
uniform mat4 u_lightViewProjectionMatrix;

void main () {
    vec2 lightTextureCoordinates = vec2(u_lightViewProjectionMatrix * vec4(v_position, 1.0)) * 0.5 + 0.5;
    float opacity = texture2D(u_opacityTexture, lightTextureCoordinates).a;

    if (lightTextureCoordinates.x < 0.0 || lightTextureCoordinates.x > 1.0 || lightTextureCoordinates.y < 0.0 || lightTextureCoordinates.y > 1.0) {
        opacity = 0.0;
    }

    gl_FragColor = vec4(0.0, 0.0, 0.0, opacity * 0.5);
}
`;

const BACKGROUND_VERTEX_SHADER = `
precision highp float;

attribute vec2 a_position;
varying vec2 v_position;

void main () {
    v_position = a_position;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const BACKGROUND_FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_position;

void main () {
    float dist = length(v_position);
    gl_FragColor = vec4(vec3(1.0) - dist * ${BACKGROUND_DISTANCE_SCALE.toFixed(8)}, 1.0);
}
`;

export class Flow {
    constructor(canvas) {
        // Initialize Three.js renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            premultipliedAlpha: false,
            alpha: true,
            antialias: false
        });
        this.renderer.autoClear = false;

        const gl = this.renderer.getContext();
        gl.getExtension('OES_texture_float');

        this.canvas = canvas;
        this.scene = new THREE.Scene();

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            PROJECTION_FOV * 180 / Math.PI,
            window.innerWidth / window.innerHeight,
            PROJECTION_NEAR,
            PROJECTION_FAR
        );

        // Custom camera controls (simplified version of the original)
        this.setupCamera();

        // Light camera for shadow mapping
        this.lightCamera = new THREE.OrthographicCamera(
            LIGHT_PROJECTION_LEFT,
            LIGHT_PROJECTION_RIGHT,
            LIGHT_PROJECTION_TOP,
            LIGHT_PROJECTION_BOTTOM,
            LIGHT_PROJECTION_NEAR,
            LIGHT_PROJECTION_FAR
        );
        this.lightCamera.position.set(0, 0, 0);
        this.lightCamera.lookAt(new THREE.Vector3(...LIGHT_DIRECTION));
        this.lightCamera.up.set(...LIGHT_UP_VECTOR);
        this.lightCamera.updateMatrixWorld();

        // Generate particle data
        this.maxParticleCount = QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[0] *
                                 QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[1];

        this.randomNumbers = [];
        for (let i = 0; i < this.maxParticleCount; ++i) {
            this.randomNumbers[i] = Math.random();
        }

        this.randomSpherePoints = [];
        for (let i = 0; i < this.maxParticleCount; ++i) {
            this.randomSpherePoints.push(randomPointInSphere());
        }

        // Create buffers and textures for each quality level
        this.particleVertexBuffers = [];
        this.spawnTextures = [];

        for (let i = 0; i < QUALITY_LEVELS.length; ++i) {
            const width = QUALITY_LEVELS[i].resolution[0];
            const height = QUALITY_LEVELS[i].resolution[1];
            const count = width * height;

            // Create particle texture coordinates
            const particleTextureCoordinates = new Float32Array(width * height * 2);
            for (let y = 0; y < height; ++y) {
                for (let x = 0; x < width; ++x) {
                    particleTextureCoordinates[(y * width + x) * 2] = (x + 0.5) / width;
                    particleTextureCoordinates[(y * width + x) * 2 + 1] = (y + 0.5) / height;
                }
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('a_textureCoordinates', new THREE.BufferAttribute(particleTextureCoordinates, 2));
            this.particleVertexBuffers[i] = geometry;

            // Create spawn texture
            const spawnData = new Float32Array(count * 4);
            for (let j = 0; j < count; ++j) {
                const position = this.randomSpherePoints[j];
                spawnData[j * 4] = position[0] * SPAWN_RADIUS;
                spawnData[j * 4 + 1] = position[1] * SPAWN_RADIUS;
                spawnData[j * 4 + 2] = position[2] * SPAWN_RADIUS;
                spawnData[j * 4 + 3] = BASE_LIFETIME + this.randomNumbers[j] * MAX_ADDITIONAL_LIFETIME;
            }

            this.spawnTextures[i] = new THREE.DataTexture(
                spawnData,
                width,
                height,
                THREE.RGBAFormat,
                THREE.FloatType
            );
            this.spawnTextures[i].minFilter = THREE.NearestFilter;
            this.spawnTextures[i].magFilter = THREE.NearestFilter;
            this.spawnTextures[i].needsUpdate = true;
        }

        // Create offset texture
        const offsetData = new Float32Array(this.maxParticleCount * 4);
        for (let i = 0; i < this.maxParticleCount; ++i) {
            const position = this.randomSpherePoints[i];
            offsetData[i * 4] = position[0] * OFFSET_RADIUS;
            offsetData[i * 4 + 1] = position[1] * OFFSET_RADIUS;
            offsetData[i * 4 + 2] = position[2] * OFFSET_RADIUS;
            offsetData[i * 4 + 3] = 0.0;
        }

        this.offsetTexture = new THREE.DataTexture(
            offsetData,
            QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[0],
            QUALITY_LEVELS[QUALITY_LEVELS.length - 1].resolution[1],
            THREE.RGBAFormat,
            THREE.FloatType
        );
        this.offsetTexture.minFilter = THREE.NearestFilter;
        this.offsetTexture.magFilter = THREE.NearestFilter;
        this.offsetTexture.needsUpdate = true;

        // Create render targets for particle simulation
        this.particleTextureA = new THREE.WebGLRenderTarget(1, 1, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType
        });

        this.particleTextureB = new THREE.WebGLRenderTarget(1, 1, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType
        });

        // Create opacity render target
        this.opacityTexture = new THREE.WebGLRenderTarget(
            OPACITY_TEXTURE_RESOLUTION,
            OPACITY_TEXTURE_RESOLUTION,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType
            }
        );

        // Initialize shader materials
        this.createShaderMaterials();

        // Create fullscreen quad
        const fullscreenGeometry = new THREE.BufferGeometry();
        fullscreenGeometry.setAttribute('a_position',
            new THREE.BufferAttribute(new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]), 2)
        );
        this.fullscreenQuad = new THREE.Mesh(fullscreenGeometry, this.simulationMaterial);

        // Create floor mesh
        const floorGeometry = new THREE.BufferGeometry();
        floorGeometry.setAttribute('a_vertexPosition', new THREE.BufferAttribute(new Float32Array([
            FLOOR_ORIGIN[0], FLOOR_ORIGIN[1], FLOOR_ORIGIN[2],
            FLOOR_ORIGIN[0], FLOOR_ORIGIN[1], FLOOR_ORIGIN[2] + FLOOR_HEIGHT,
            FLOOR_ORIGIN[0] + FLOOR_WIDTH, FLOOR_ORIGIN[1], FLOOR_ORIGIN[2],
            FLOOR_ORIGIN[0] + FLOOR_WIDTH, FLOOR_ORIGIN[1], FLOOR_ORIGIN[2] + FLOOR_HEIGHT
        ]), 3));
        this.floorMesh = new THREE.Mesh(floorGeometry, this.floorMaterial);

        // Settings
        this.hue = 0;
        this.timeScale = INITIAL_SPEED;
        this.persistence = INITIAL_TURBULENCE;

        // Quality level
        this.qualityLevel = 0;
        this.changeQualityLevel(0);

        // Sorting variables
        this.totalSortSteps = 0;
        this.sortStepsLeft = 0;
        this.sortPass = -1;
        this.sortStage = -1;

        // Timing
        this.firstFrame = true;
        this.lastTime = 0;
        this.flipped = false;

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
        this.onResize();

        // Start animation
        this.render();
    }

    setupCamera() {
        let azimuth = INITIAL_AZIMUTH;
        let elevation = INITIAL_ELEVATION;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let mouseDown = false;

        const updateCamera = () => {
            const cameraPosition = new THREE.Vector3(
                CAMERA_DISTANCE * Math.sin(Math.PI / 2 - elevation) * Math.sin(-azimuth) + CAMERA_ORBIT_POINT[0],
                CAMERA_DISTANCE * Math.cos(Math.PI / 2 - elevation) + CAMERA_ORBIT_POINT[1],
                CAMERA_DISTANCE * Math.sin(Math.PI / 2 - elevation) * Math.cos(-azimuth) + CAMERA_ORBIT_POINT[2]
            );
            this.camera.position.copy(cameraPosition);
            this.camera.lookAt(new THREE.Vector3(...CAMERA_ORBIT_POINT));
            this.camera.updateMatrixWorld();
        };

        this.canvas.addEventListener('mousedown', (event) => {
            mouseDown = true;
            const pos = this.getMousePosition(event);
            lastMouseX = pos.x;
            lastMouseY = pos.y;
        });

        document.addEventListener('mouseup', () => {
            mouseDown = false;
        });

        this.canvas.addEventListener('mousemove', (event) => {
            if (mouseDown) {
                const pos = this.getMousePosition(event);
                const deltaAzimuth = (pos.x - lastMouseX) * CAMERA_SENSITIVITY;
                const deltaElevation = (pos.y - lastMouseY) * CAMERA_SENSITIVITY;

                azimuth += deltaAzimuth;
                elevation += deltaElevation;

                elevation = Math.max(MIN_ELEVATION, Math.min(MAX_ELEVATION, elevation));

                updateCamera();

                lastMouseX = pos.x;
                lastMouseY = pos.y;

                this.canvas.style.cursor = 'grabbing';
            } else {
                this.canvas.style.cursor = 'grab';
            }
        });

        updateCamera();

        this.getCameraViewDirection = () => {
            const viewDirection = new THREE.Vector3();
            this.camera.getWorldDirection(viewDirection);
            return viewDirection;
        };
    }

    getMousePosition(event) {
        const boundingRect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - boundingRect.left,
            y: event.clientY - boundingRect.top
        };
    }

    createShaderMaterials() {
        // Simulation material
        this.simulationMaterial = new THREE.ShaderMaterial({
            vertexShader: SIMULATION_VERTEX_SHADER,
            fragmentShader: SIMULATION_FRAGMENT_SHADER,
            uniforms: {
                u_particleTexture: { value: null },
                u_spawnTexture: { value: null },
                u_resolution: { value: new THREE.Vector2() },
                u_deltaTime: { value: 0 },
                u_time: { value: 0 },
                u_persistence: { value: 0 }
            }
        });

        // Rendering material
        this.renderingMaterial = new THREE.ShaderMaterial({
            vertexShader: RENDERING_VERTEX_SHADER,
            fragmentShader: RENDERING_FRAGMENT_SHADER,
            uniforms: {
                u_particleTexture: { value: null },
                u_opacityTexture: { value: null },
                u_viewMatrix: { value: new THREE.Matrix4() },
                u_projectionMatrix: { value: new THREE.Matrix4() },
                u_lightViewProjectionMatrix: { value: new THREE.Matrix4() },
                u_particleDiameter: { value: 0 },
                u_screenWidth: { value: 0 },
                u_particleAlpha: { value: 0 },
                u_particleColor: { value: new THREE.Vector3() },
                u_flipped: { value: false }
            },
            transparent: true,
            depthTest: false
        });

        // Opacity material
        this.opacityMaterial = new THREE.ShaderMaterial({
            vertexShader: OPACITY_VERTEX_SHADER,
            fragmentShader: OPACITY_FRAGMENT_SHADER,
            uniforms: {
                u_particleTexture: { value: null },
                u_lightViewMatrix: { value: new THREE.Matrix4() },
                u_lightProjectionMatrix: { value: new THREE.Matrix4() },
                u_particleDiameter: { value: 0 },
                u_screenWidth: { value: OPACITY_TEXTURE_RESOLUTION },
                u_particleAlpha: { value: 0 }
            },
            transparent: true,
            depthTest: false
        });

        // Sort material
        this.sortMaterial = new THREE.ShaderMaterial({
            vertexShader: SORT_VERTEX_SHADER,
            fragmentShader: SORT_FRAGMENT_SHADER,
            uniforms: {
                u_dataTexture: { value: null },
                u_resolution: { value: new THREE.Vector2() },
                pass: { value: 0 },
                stage: { value: 0 },
                u_halfVector: { value: new THREE.Vector3() }
            }
        });

        // Resample material
        this.resampleMaterial = new THREE.ShaderMaterial({
            vertexShader: RESAMPLE_VERTEX_SHADER,
            fragmentShader: RESAMPLE_FRAGMENT_SHADER,
            uniforms: {
                u_particleTexture: { value: null },
                u_offsetTexture: { value: null },
                u_offsetScale: { value: 0 }
            }
        });

        // Floor material
        this.floorMaterial = new THREE.ShaderMaterial({
            vertexShader: FLOOR_VERTEX_SHADER,
            fragmentShader: FLOOR_FRAGMENT_SHADER,
            uniforms: {
                u_viewMatrix: { value: new THREE.Matrix4() },
                u_projectionMatrix: { value: new THREE.Matrix4() },
                u_lightViewProjectionMatrix: { value: new THREE.Matrix4() },
                u_opacityTexture: { value: null }
            },
            transparent: true
        });

        // Background material
        this.backgroundMaterial = new THREE.ShaderMaterial({
            vertexShader: BACKGROUND_VERTEX_SHADER,
            fragmentShader: BACKGROUND_FRAGMENT_SHADER,
            depthTest: false,
            depthWrite: false
        });
    }

    setHue(newHue) {
        this.hue = newHue;
    }

    setTimeScale(newTimeScale) {
        this.timeScale = newTimeScale;
    }

    setPersistence(newPersistence) {
        this.persistence = newPersistence;
    }

    changeQualityLevel(newLevel) {
        this.qualityLevel = newLevel;
        this.particleAlpha = QUALITY_LEVELS[this.qualityLevel].alpha;
        this.particleDiameter = QUALITY_LEVELS[this.qualityLevel].diameter;
        this.particleCountWidth = QUALITY_LEVELS[this.qualityLevel].resolution[0];
        this.particleCountHeight = QUALITY_LEVELS[this.qualityLevel].resolution[1];
        this.particleCount = this.particleCountWidth * this.particleCountHeight;

        this.particleGeometry = this.particleVertexBuffers[this.qualityLevel];
        this.spawnTexture = this.spawnTextures[this.qualityLevel];

        // Resize particle textures
        this.particleTextureA.setSize(this.particleCountWidth, this.particleCountHeight);
        this.particleTextureB.setSize(this.particleCountWidth, this.particleCountHeight);

        // Reset sort
        this.totalSortSteps = (log2(this.particleCount) * (log2(this.particleCount) + 1)) / 2;
        this.sortStepsLeft = this.totalSortSteps;
        this.sortPass = -1;
        this.sortStage = -1;

        // Initialize particle data
        this.initializeParticleData();
    }

    initializeParticleData() {
        const particleData = new Float32Array(this.particleCount * 4);

        for (let i = 0; i < this.particleCount; ++i) {
            const position = randomPointInSphere();
            particleData[i * 4] = position[0] * SPAWN_RADIUS;
            particleData[i * 4 + 1] = position[1] * SPAWN_RADIUS;
            particleData[i * 4 + 2] = position[2] * SPAWN_RADIUS;
            particleData[i * 4 + 3] = Math.random() * BASE_LIFETIME;
        }

        const dataTexture = new THREE.DataTexture(
            particleData,
            this.particleCountWidth,
            this.particleCountHeight,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        dataTexture.needsUpdate = true;

        // Copy to render target A
        this.fullscreenQuad.material = new THREE.MeshBasicMaterial({ map: dataTexture });
        this.renderer.setRenderTarget(this.particleTextureA);
        this.renderer.render(new THREE.Scene().add(this.fullscreenQuad), new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
        this.renderer.setRenderTarget(null);
        this.fullscreenQuad.material = this.simulationMaterial;
    }

    onResize() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        this.camera.aspect = aspectRatio;
        this.camera.fov = PROJECTION_FOV * 180 / Math.PI;
        this.camera.updateProjectionMatrix();
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render = (currentTime = 0) => {
        requestAnimationFrame(this.render);

        let deltaTime = (currentTime - this.lastTime) / 1000 || 0.0;
        this.lastTime = currentTime;

        if (deltaTime > MAX_DELTA_TIME) {
            deltaTime = 0;
        }

        // Simulation pass
        const iterations = this.firstFrame ? Math.floor(BASE_LIFETIME / PRESIMULATION_DELTA_TIME) : 1;
        for (let i = 0; i < iterations; ++i) {
            this.simulationMaterial.uniforms.u_particleTexture.value = this.particleTextureA.texture;
            this.simulationMaterial.uniforms.u_spawnTexture.value = this.spawnTexture;
            this.simulationMaterial.uniforms.u_resolution.value.set(this.particleCountWidth, this.particleCountHeight);
            this.simulationMaterial.uniforms.u_deltaTime.value = this.firstFrame ? PRESIMULATION_DELTA_TIME : deltaTime * this.timeScale;
            this.simulationMaterial.uniforms.u_time.value = this.firstFrame ? PRESIMULATION_DELTA_TIME : currentTime / 1000;
            this.simulationMaterial.uniforms.u_persistence.value = this.persistence;

            this.fullscreenQuad.material = this.simulationMaterial;
            this.renderer.setRenderTarget(this.particleTextureB);
            this.renderer.render(new THREE.Scene().add(this.fullscreenQuad), new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));

            // Swap textures
            [this.particleTextureA, this.particleTextureB] = [this.particleTextureB, this.particleTextureA];
        }

        this.firstFrame = false;

        // Determine view direction and flip state
        const viewDirection = this.getCameraViewDirection();
        const lightDirection = new THREE.Vector3(...LIGHT_DIRECTION);
        const flippedThisFrame = this.determineFlipState(viewDirection, lightDirection);

        // Sorting pass (simplified - doing fewer sorts per frame)
        if (flippedThisFrame) {
            this.sortPass = -1;
            this.sortStage = -1;
            this.sortStepsLeft = this.totalSortSteps;
        }

        const sortPasses = Math.min(SORT_PASSES_PER_FRAME, this.sortStepsLeft);
        for (let i = 0; i < sortPasses; ++i) {
            this.performSortPass();
        }

        // Clear opacity texture
        this.renderer.setRenderTarget(this.opacityTexture);
        this.renderer.clear();

        // Render particles in slices
        const particlesPerSlice = Math.floor(this.particleCount / SLICES);

        for (let slice = 0; slice < SLICES; ++slice) {
            this.renderParticleSlice(slice, particlesPerSlice);
            this.renderOpacitySlice(slice, particlesPerSlice);
        }

        // Render floor
        this.renderFloor();

        // Render background
        this.renderBackground();
    }

    determineFlipState(viewDirection, lightDirection) {
        const dot = viewDirection.dot(lightDirection);
        const halfVector = new THREE.Vector3();

        let flippedThisFrame = false;

        if (dot > 0.0) {
            halfVector.copy(lightDirection).add(viewDirection).normalize();
            if (this.flipped) {
                flippedThisFrame = true;
            }
            this.flipped = false;
        } else {
            halfVector.copy(lightDirection).sub(viewDirection).normalize();
            if (!this.flipped) {
                flippedThisFrame = true;
            }
            this.flipped = true;
        }

        this.halfVector = halfVector;
        return flippedThisFrame;
    }

    performSortPass() {
        this.sortPass--;
        if (this.sortPass < 0) {
            this.sortStage++;
            this.sortPass = this.sortStage;
        }

        this.sortMaterial.uniforms.u_dataTexture.value = this.particleTextureA.texture;
        this.sortMaterial.uniforms.u_resolution.value.set(this.particleCountWidth, this.particleCountHeight);
        this.sortMaterial.uniforms.pass.value = 1 << this.sortPass;
        this.sortMaterial.uniforms.stage.value = 1 << this.sortStage;
        this.sortMaterial.uniforms.u_halfVector.value.copy(this.halfVector);

        this.fullscreenQuad.material = this.sortMaterial;
        this.renderer.setRenderTarget(this.particleTextureB);
        this.renderer.render(new THREE.Scene().add(this.fullscreenQuad), new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));

        [this.particleTextureA, this.particleTextureB] = [this.particleTextureB, this.particleTextureA];

        this.sortStepsLeft--;
        if (this.sortStepsLeft === 0) {
            this.sortStepsLeft = this.totalSortSteps;
            this.sortPass = -1;
            this.sortStage = -1;
        }
    }

    renderParticleSlice(slice, particlesPerSlice) {
        this.renderer.setRenderTarget(null);

        const colorRGB = hsvToRGB(this.hue, PARTICLE_SATURATION, PARTICLE_VALUE);

        this.renderingMaterial.uniforms.u_particleTexture.value = this.particleTextureA.texture;
        this.renderingMaterial.uniforms.u_opacityTexture.value = this.opacityTexture.texture;
        this.renderingMaterial.uniforms.u_viewMatrix.value.copy(this.camera.matrixWorldInverse);
        this.renderingMaterial.uniforms.u_projectionMatrix.value.copy(this.camera.projectionMatrix);
        this.renderingMaterial.uniforms.u_lightViewProjectionMatrix.value.multiplyMatrices(
            this.lightCamera.projectionMatrix,
            this.lightCamera.matrixWorldInverse
        );
        this.renderingMaterial.uniforms.u_particleDiameter.value = this.particleDiameter;
        this.renderingMaterial.uniforms.u_screenWidth.value = this.canvas.width;
        this.renderingMaterial.uniforms.u_particleAlpha.value = this.particleAlpha;
        this.renderingMaterial.uniforms.u_particleColor.value.set(colorRGB[0], colorRGB[1], colorRGB[2]);
        this.renderingMaterial.uniforms.u_flipped.value = this.flipped;

        if (!this.flipped) {
            this.renderingMaterial.blending = THREE.CustomBlending;
            this.renderingMaterial.blendEquation = THREE.AddEquation;
            this.renderingMaterial.blendSrc = THREE.OneMinusDstAlphaFactor;
            this.renderingMaterial.blendDst = THREE.OneFactor;
        } else {
            this.renderingMaterial.blending = THREE.CustomBlending;
            this.renderingMaterial.blendEquation = THREE.AddEquation;
            this.renderingMaterial.blendSrc = THREE.OneFactor;
            this.renderingMaterial.blendDst = THREE.OneMinusSrcAlphaFactor;
        }

        const particlePoints = new THREE.Points(this.particleGeometry, this.renderingMaterial);
        particlePoints.geometry.setDrawRange(slice * particlesPerSlice, particlesPerSlice);

        const scene = new THREE.Scene();
        scene.add(particlePoints);
        this.renderer.render(scene, this.camera);
    }

    renderOpacitySlice(slice, particlesPerSlice) {
        this.renderer.setRenderTarget(this.opacityTexture);

        this.opacityMaterial.uniforms.u_particleTexture.value = this.particleTextureA.texture;
        this.opacityMaterial.uniforms.u_lightViewMatrix.value.copy(this.lightCamera.matrixWorldInverse);
        this.opacityMaterial.uniforms.u_lightProjectionMatrix.value.copy(this.lightCamera.projectionMatrix);
        this.opacityMaterial.uniforms.u_particleDiameter.value = this.particleDiameter;
        this.opacityMaterial.uniforms.u_screenWidth.value = OPACITY_TEXTURE_RESOLUTION;
        this.opacityMaterial.uniforms.u_particleAlpha.value = this.particleAlpha;

        this.opacityMaterial.blending = THREE.CustomBlending;
        this.opacityMaterial.blendEquation = THREE.AddEquation;
        this.opacityMaterial.blendSrc = THREE.OneFactor;
        this.opacityMaterial.blendDst = THREE.OneMinusSrcAlphaFactor;

        const particlePoints = new THREE.Points(this.particleGeometry, this.opacityMaterial);
        particlePoints.geometry.setDrawRange(slice * particlesPerSlice, particlesPerSlice);

        const scene = new THREE.Scene();
        scene.add(particlePoints);
        this.renderer.render(scene, this.lightCamera);
    }

    renderFloor() {
        this.renderer.setRenderTarget(null);

        this.floorMaterial.uniforms.u_viewMatrix.value.copy(this.camera.matrixWorldInverse);
        this.floorMaterial.uniforms.u_projectionMatrix.value.copy(this.camera.projectionMatrix);
        this.floorMaterial.uniforms.u_lightViewProjectionMatrix.value.multiplyMatrices(
            this.lightCamera.projectionMatrix,
            this.lightCamera.matrixWorldInverse
        );
        this.floorMaterial.uniforms.u_opacityTexture.value = this.opacityTexture.texture;

        this.floorMaterial.blending = THREE.CustomBlending;
        this.floorMaterial.blendEquation = THREE.AddEquation;
        this.floorMaterial.blendSrc = THREE.OneMinusDstAlphaFactor;
        this.floorMaterial.blendDst = THREE.OneFactor;

        this.floorMesh.geometry.setDrawRange(0, 4);
        const scene = new THREE.Scene();
        scene.add(this.floorMesh);
        this.renderer.render(scene, this.camera);
    }

    renderBackground() {
        this.renderer.setRenderTarget(null);

        const scene = new THREE.Scene();
        const bgQuad = new THREE.Mesh(
            new THREE.BufferGeometry().setAttribute('a_position',
                new THREE.BufferAttribute(new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]), 2)
            ),
            this.backgroundMaterial
        );
        scene.add(bgQuad);
        this.renderer.render(scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
    }
}
