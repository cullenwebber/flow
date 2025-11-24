# Volumetric Particle Flow

![Alt text](http://david.li/images/flowgithub.png)

[http://david.li/flow](http://david.li/flow) ([video](http://www.youtube.com/watch?v=a0hJAZfIRvE))

**Three.js + curl noise + half-angle slice rendering + incremental odd-even merge sort**

## Modernized with Three.js

This project has been completely rewritten to use modern **Three.js** instead of raw WebGL, while preserving all the original features and rendering techniques.

### What's New

- ✨ **Three.js Renderer** - Clean, modern API instead of raw WebGL calls
- 📦 **ES6 Modules** - Modern import/export syntax
- 🛠️ **Vite Build System** - Fast development and optimized production builds
- 🎨 **ShaderMaterial** - Simplified custom shader management
- 🎯 **WebGLRenderTarget** - Elegant framebuffer handling

### Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Features

- **GPU-based particle simulation** with texture-based storage (up to 2M particles)
- **4D simplex curl noise** for organic, turbulent flow patterns
- **GPU bitonic sorting** for proper alpha blending
- **Volumetric opacity mapping** with self-shadowing effects
- **Interactive controls** for particle count, speed, turbulence, and color

### Technical Details

The simulation stores particle positions and lifetimes in floating-point textures. Each frame:
1. **Simulation Pass**: Compute curl noise forces and update particle positions
2. **Sort Pass**: Bitonic sort on GPU for depth-ordered rendering
3. **Opacity Pass**: Render from light's perspective for shadow mapping
4. **Main Pass**: Render particles with volumetric self-shadowing
5. **Floor & Background**: Final compositing passes

### Browser Support

Requires WebGL with `OES_texture_float` extension:
- Chrome/Edge 9+
- Firefox 4+
- Safari 5.1+

### Credits

Original WebGL implementation by [David Li](http://david.li)

Modernized to Three.js while preserving all rendering techniques and visual fidelity.