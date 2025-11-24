# Volumetric Particle Flow - Three.js Modern Version

This is a modernized version of the volumetric particle flow visualization, completely rewritten to use **Three.js** instead of raw WebGL.

## What Changed?

### Original Version
- Raw WebGL API calls
- Custom shader compilation and program linking
- Manual framebuffer and texture management
- Custom matrix math and camera system

### Modern Three.js Version
- Three.js renderer and scene management
- `ShaderMaterial` for custom shaders
- `WebGLRenderTarget` for off-screen rendering
- Three.js built-in camera and matrix operations
- ES6 modules instead of global scripts

## Key Conversions

1. **WebGL Context → Three.js Renderer**
   ```javascript
   // Old: var gl = canvas.getContext('webgl');
   // New: const renderer = new THREE.WebGLRenderer({ canvas });
   ```

2. **Shaders → ShaderMaterial**
   ```javascript
   // Old: buildProgramWrapper(gl, vertexShader, fragmentShader)
   // New: new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
   ```

3. **Framebuffers → WebGLRenderTarget**
   ```javascript
   // Old: gl.createFramebuffer() + gl.framebufferTexture2D()
   // New: new THREE.WebGLRenderTarget(width, height, options)
   ```

4. **Custom Camera → Three.js Camera**
   ```javascript
   // Old: Custom matrix calculations
   // New: THREE.PerspectiveCamera with built-in matrix handling
   ```

## Files

### Three.js Version (New)
- `index-three.html` - Entry point with module script
- `main-three.js` - Application initialization
- `flow-three.js` - Main Flow class using Three.js
- `shared-three.js` - Shared constants and utilities as ES modules
- `ui-three.js` - UI components as ES modules
- `package.json` - NPM dependencies
- `vite.config.js` - Build configuration

### Original Version
- `index.html` - Original entry point
- `main.js` - Original initialization
- `flow.js` - Original raw WebGL implementation
- `shared.js` - Original shared utilities
- `ui.js` - Original UI components

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview production build:
   ```bash
   npm run preview
   ```

## Features

- **GPU-based particle simulation** using texture-based storage
- **Curl noise** for organic flow patterns
- **Bitonic sorting** on GPU for proper alpha blending
- **Volumetric opacity mapping** for self-shadowing
- **Interactive controls** for particle count, speed, turbulence, and color
- **Responsive design** that adapts to window size

## Technical Details

### GPU Simulation
Particle positions and lifetimes are stored in floating-point textures. Each frame:
1. Simulation shader reads current particle state
2. Computes curl noise forces
3. Updates positions and lifetimes
4. Writes to output texture (ping-pong rendering)

### Rendering Pipeline
1. **Simulation Pass**: Update particle positions
2. **Sort Pass**: Bitonic sort for depth ordering
3. **Opacity Pass**: Render from light's perspective
4. **Main Pass**: Render particles with self-shadowing
5. **Floor Pass**: Render shadow-receiving floor
6. **Background Pass**: Render gradient background

### Performance
Quality levels range from 66K to 2M particles. Higher counts require:
- More GPU memory
- Better GPU performance
- OES_texture_float WebGL extension

## Browser Support

Requires WebGL with `OES_texture_float` extension:
- Chrome/Edge 9+
- Firefox 4+
- Safari 5.1+

## Credits

Original WebGL version by David Li (http://david.li)

Modernized to Three.js as a demonstration of converting raw WebGL to modern Three.js patterns.

## License

See LICENSE file for details.
