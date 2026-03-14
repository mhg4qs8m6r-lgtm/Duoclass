"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOpacityEffect = exports.isClipEffect = exports.isTransformEffect = exports.OpacityEffect = exports.ClipEffect = exports.TransformEffect = void 0;
class TransformEffect {
    constructor(offsetX, offsetY, matrix) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.matrix = matrix;
        this.type = 0 /* EffectType.TRANSFORM */;
        this.target = 2 /* EffectTarget.BACKGROUND_BORDERS */ | 4 /* EffectTarget.CONTENT */;
    }
}
exports.TransformEffect = TransformEffect;
class ClipEffect {
    constructor(path, target) {
        this.path = path;
        this.target = target;
        this.type = 1 /* EffectType.CLIP */;
    }
}
exports.ClipEffect = ClipEffect;
class OpacityEffect {
    constructor(opacity) {
        this.opacity = opacity;
        this.type = 2 /* EffectType.OPACITY */;
        this.target = 2 /* EffectTarget.BACKGROUND_BORDERS */ | 4 /* EffectTarget.CONTENT */;
    }
}
exports.OpacityEffect = OpacityEffect;
const isTransformEffect = (effect) => effect.type === 0 /* EffectType.TRANSFORM */;
exports.isTransformEffect = isTransformEffect;
const isClipEffect = (effect) => effect.type === 1 /* EffectType.CLIP */;
exports.isClipEffect = isClipEffect;
const isOpacityEffect = (effect) => effect.type === 2 /* EffectType.OPACITY */;
exports.isOpacityEffect = isOpacityEffect;
//# sourceMappingURL=effects.js.map