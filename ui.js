import {
    getMousePosition,
    hsvToRGB,
    rgbToString,
    clamp,
    HUE_INNER_RADIUS,
    HUE_OUTER_RADIUS,
    HUE_PICKER_SATURATION,
    HUE_PICKER_VALUE,
    HUE_HIGHLIGHTER_ANGLE_OFFSET,
    HUE_HIGHLIGHTER_RADIUS_OFFSET,
    HUE_HIGHLIGHTER_SATURATION,
    HUE_HIGHLIGHTER_VALUE,
    HUE_HIGHLIGHTER_LINE_WIDTH,
    BUTTON_ACTIVE_COLOR,
    BUTTON_COLOR,
    BUTTON_BACKGROUND
} from './shared.js';

export class HuePicker {
    constructor(canvas, changeCallback) {
        this.canvas = canvas;
        this.changeCallback = changeCallback;
        this.context = canvas.getContext('2d');
        this.hue = 0.0;
        this.mousePressed = false;

        changeCallback(this.hue);

        // Create spectrum canvas
        const spectrumCanvas = document.createElement('canvas');
        spectrumCanvas.width = canvas.width;
        spectrumCanvas.height = canvas.height;
        const spectrumContext = spectrumCanvas.getContext('2d');

        const imageData = spectrumContext.createImageData(canvas.width, canvas.height);
        for (let y = 0; y < canvas.height; y += 1) {
            for (let x = 0; x < canvas.width; x += 1) {
                const angle = Math.atan2(y - canvas.height / 2, x - canvas.width / 2) + Math.PI;
                const color = hsvToRGB(angle / (2.0 * Math.PI), HUE_PICKER_SATURATION, HUE_PICKER_VALUE);

                imageData.data[(y * canvas.width + x) * 4] = color[0] * 255;
                imageData.data[(y * canvas.width + x) * 4 + 1] = color[1] * 255;
                imageData.data[(y * canvas.width + x) * 4 + 2] = color[2] * 255;
                imageData.data[(y * canvas.width + x) * 4 + 3] = 255;
            }
        }

        spectrumContext.putImageData(imageData, 0, 0);
        this.spectrumCanvas = spectrumCanvas;

        this.redraw();
        this.setupEvents();
    }

    redraw() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.save();

        this.context.fillStyle = 'black';
        this.context.beginPath();
        this.context.arc(this.canvas.width / 2, this.canvas.height / 2, HUE_OUTER_RADIUS, 0, Math.PI * 2, false);
        this.context.arc(this.canvas.width / 2, this.canvas.height / 2, HUE_INNER_RADIUS, 0, Math.PI * 2, true);
        this.context.fill();

        this.context.globalCompositeOperation = 'source-in';
        this.context.drawImage(this.spectrumCanvas, 0, 0);

        this.context.restore();

        this.context.globalCompositeOperation = 'source-over';

        const startAngle = (this.hue - 0.5) * Math.PI * 2 - HUE_HIGHLIGHTER_ANGLE_OFFSET;
        const endAngle = (this.hue - 0.5) * Math.PI * 2 + HUE_HIGHLIGHTER_ANGLE_OFFSET;

        this.context.beginPath();
        this.context.arc(this.canvas.width / 2, this.canvas.height / 2, HUE_INNER_RADIUS - HUE_HIGHLIGHTER_RADIUS_OFFSET, startAngle, endAngle, false);
        this.context.arc(this.canvas.width / 2, this.canvas.height / 2, HUE_OUTER_RADIUS + HUE_HIGHLIGHTER_RADIUS_OFFSET, endAngle, startAngle, true);
        this.context.closePath();

        const color = hsvToRGB(this.hue, HUE_HIGHLIGHTER_SATURATION, HUE_HIGHLIGHTER_VALUE);
        const rgbString = rgbToString(color);

        this.context.strokeStyle = rgbString;
        this.context.lineWidth = HUE_HIGHLIGHTER_LINE_WIDTH;
        this.context.stroke();
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', (event) => {
            const pos = getMousePosition(event, this.canvas);
            const xDistance = this.canvas.width / 2 - pos.x;
            const yDistance = this.canvas.height / 2 - pos.y;
            const distance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);

            if (distance < HUE_OUTER_RADIUS) {
                this.mousePressed = true;
                this.onChange(event);
            }
        });

        document.addEventListener('mouseup', () => {
            this.mousePressed = false;
        });

        document.addEventListener('mousemove', (event) => {
            if (this.mousePressed) {
                this.onChange(event);
            }
        });
    }

    onChange(event) {
        const pos = getMousePosition(event, this.canvas);
        const angle = Math.atan2(pos.y - this.canvas.width / 2, pos.x - this.canvas.width / 2) + Math.PI;
        this.hue = angle / (Math.PI * 2.0);
        this.changeCallback(this.hue);
        this.redraw();
    }

    getHue() {
        return this.hue;
    }
}

export class Slider {
    constructor(element, min, max, initialValue, changeCallback) {
        this.element = element;
        this.min = min;
        this.max = max;
        this.value = initialValue;
        this.changeCallback = changeCallback;
        this.color = 'black';
        this.mousePressed = false;

        this.innerDiv = document.createElement('div');
        this.innerDiv.style.position = 'absolute';
        this.innerDiv.style.height = element.offsetHeight + 'px';
        element.appendChild(this.innerDiv);

        this.redraw();
        this.setupEvents();
    }

    setColor(newColor) {
        this.color = newColor;
        this.redraw();
    }

    getValue() {
        return this.value;
    }

    redraw() {
        const fraction = (this.value - this.min) / (this.max - this.min);
        this.innerDiv.style.background = this.color;
        this.innerDiv.style.width = fraction * this.element.offsetWidth + 'px';
        this.innerDiv.style.height = this.element.offsetHeight + 'px';
    }

    setupEvents() {
        this.element.addEventListener('mousedown', (event) => {
            this.mousePressed = true;
            this.onChange(event);
        });

        document.addEventListener('mouseup', () => {
            this.mousePressed = false;
        });

        document.addEventListener('mousemove', (event) => {
            if (this.mousePressed) {
                this.onChange(event);
            }
        });
    }

    onChange(event) {
        const pos = getMousePosition(event, this.element);
        this.value = clamp((pos.x / this.element.offsetWidth) * (this.max - this.min) + this.min, this.min, this.max);
        this.changeCallback(this.value);
        this.redraw();
    }
}

export class Buttons {
    constructor(elements, changeCallback) {
        this.elements = elements;
        this.changeCallback = changeCallback;
        this.activeElement = elements[0];
        this.color = BUTTON_COLOR;

        this.setupEvents();
    }

    setColor(newColor) {
        this.color = newColor;
        this.refresh();
    }

    refresh() {
        for (let i = 0; i < this.elements.length; ++i) {
            if (this.elements[i] === this.activeElement) {
                this.elements[i].style.color = BUTTON_ACTIVE_COLOR;
                this.elements[i].style.background = this.color;
            } else {
                this.elements[i].style.color = BUTTON_COLOR;
                this.elements[i].style.background = BUTTON_BACKGROUND;
            }
        }
    }

    setupEvents() {
        for (let i = 0; i < this.elements.length; ++i) {
            const index = i;
            const clickedElement = this.elements[i];
            this.elements[i].addEventListener('click', () => {
                if (this.activeElement !== clickedElement) {
                    this.activeElement = clickedElement;
                    this.changeCallback(index);
                    this.refresh();
                }
            });
        }
    }
}
