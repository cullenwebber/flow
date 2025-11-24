// Configuration constants
export const MAX_DELTA_TIME = 0.2;
export const PRESIMULATION_DELTA_TIME = 0.1;

export const QUALITY_LEVELS = [
    {
        resolution: [256, 256],
        diameter: 0.03,
        alpha: 0.5
    }, {
        resolution: [512, 256],
        diameter: 0.025,
        alpha: 0.4
    }, {
        resolution: [512, 512],
        diameter: 0.02,
        alpha: 0.3
    }, {
        resolution: [1024, 512],
        diameter: 0.015,
        alpha: 0.25
    }, {
        resolution: [1024, 1024],
        diameter: 0.0125,
        alpha: 0.2
    }, {
        resolution: [2048, 1024],
        diameter: 0.01,
        alpha: 0.2
    },
];

export const OPACITY_TEXTURE_RESOLUTION = 1024;
export const LIGHT_DIRECTION = [0.0, -1.0, 0.0];
export const LIGHT_UP_VECTOR = [0.0, 0.0, 1.0];
export const SLICES = 128;
export const SORT_PASSES_PER_FRAME = 50;

export const NOISE_OCTAVES = 3;
export const NOISE_POSITION_SCALE = 1.5;
export const NOISE_SCALE = 0.075;
export const NOISE_TIME_SCALE = 1 / 4000;
export const BASE_SPEED = 0.2;

export const PARTICLE_SATURATION = 0.75;
export const PARTICLE_VALUE = 1.0;
export const PARTICLE_OPACITY_SCALE = 0.75;

export const BACKGROUND_DISTANCE_SCALE = 0.1;

export const FLOOR_WIDTH = 100.0;
export const FLOOR_HEIGHT = 100.0;
export const FLOOR_ORIGIN = [-2.0, -0.75, -5.0];

export const ASPECT_RATIO = 16 / 9;
export const PROJECTION_NEAR = 0.01;
export const PROJECTION_FAR = 10.0;
export const PROJECTION_FOV = (60 / 180) * Math.PI;

export const LIGHT_PROJECTION_LEFT = -5.0;
export const LIGHT_PROJECTION_RIGHT = 5.0;
export const LIGHT_PROJECTION_BOTTOM = -5.0;
export const LIGHT_PROJECTION_TOP = 5.0;
export const LIGHT_PROJECTION_NEAR = -50.0;
export const LIGHT_PROJECTION_FAR = 50.0;

export const SPAWN_RADIUS = 0.1;
export const BASE_LIFETIME = 10;
export const MAX_ADDITIONAL_LIFETIME = 5;
export const OFFSET_RADIUS = 0.5;

export const CAMERA_DISTANCE = 2.2;
export const INITIAL_AZIMUTH = 0.6;
export const INITIAL_ELEVATION = 0.4;

export const MIN_ELEVATION = -0.1;
export const MAX_ELEVATION = Math.PI / 2.0;

export const CAMERA_ORBIT_POINT = [1.2, -0.3, 0.0];
export const CAMERA_SENSITIVITY = 0.005;

export const INITIAL_SPEED = 2;
export const INITIAL_TURBULENCE = 0.2;

export const MAX_SPEED = 5;
export const MAX_TURBULENCE = 0.5;

export const HUE_INNER_RADIUS = 40;
export const HUE_OUTER_RADIUS = 70;

export const UI_SATURATION = 0.75;
export const UI_VALUE = 0.75;

export const BUTTON_ACTIVE_COLOR = 'white';
export const BUTTON_COLOR = '#333333';
export const BUTTON_BACKGROUND = '#bbbbbb';

export const HUE_HIGHLIGHTER_ANGLE_OFFSET = 0.2;
export const HUE_HIGHLIGHTER_RADIUS_OFFSET = 2;
export const HUE_PICKER_SATURATION = 0.75;
export const HUE_PICKER_VALUE = 1.0;
export const HUE_HIGHLIGHTER_SATURATION = 1;
export const HUE_HIGHLIGHTER_VALUE = 0.75;
export const HUE_HIGHLIGHTER_LINE_WIDTH = 5;

// Utility functions
export const randomPointInSphere = function () {
    const lambda = Math.random();
    const u = Math.random() * 2.0 - 1.0;
    const phi = Math.random() * 2.0 * Math.PI;

    return [
        Math.pow(lambda, 1/3) * Math.sqrt(1.0 - u * u) * Math.cos(phi),
        Math.pow(lambda, 1/3) * Math.sqrt(1.0 - u * u) * Math.sin(phi),
        Math.pow(lambda, 1/3) * u
    ];
};

export const log2 = function (x) {
    return Math.log(x) / Math.log(2);
};

export const getMousePosition = function (event, element) {
    const boundingRect = element.getBoundingClientRect();
    return {
        x: event.clientX - boundingRect.left,
        y: event.clientY - boundingRect.top
    };
};

export const hsvToRGB = function (h, s, v) {
    h = h % 1;

    const c = v * s;
    const hDash = h * 6;
    const x = c * (1 - Math.abs(hDash % 2 - 1));
    const mod = Math.floor(hDash);

    const r = [c, x, 0, 0, x, c][mod];
    const g = [x, c, c, x, 0, 0][mod];
    const b = [0, 0, x, c, c, x][mod];

    const m = v - c;

    return [r + m, g + m, b + m];
};

export const rgbToString = function (color) {
    return 'rgb(' + (color[0] * 255).toFixed(0) + ',' + (color[1] * 255).toFixed(0) + ',' + (color[2] * 255).toFixed(0) + ')';
};

export const clamp = function (x, min, max) {
    return Math.max(min, Math.min(max, x));
};

// Check WebGL support
export const hasWebGLSupportWithExtensions = function (extensions) {
    const canvas = document.createElement('canvas');
    let gl = null;
    try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) {
        return false;
    }
    if (gl === null) {
        return false;
    }

    for (let i = 0; i < extensions.length; ++i) {
        if (gl.getExtension(extensions[i]) === null) {
            return false;
        }
    }

    return true;
};
