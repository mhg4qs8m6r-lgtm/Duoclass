"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
const logger_1 = require("./logger");
const cache_storage_1 = require("./cache-storage");
class Context {
    constructor(options, windowBounds) {
        this.windowBounds = windowBounds;
        this.instanceName = `#${Context.instanceCount++}`;
        this.logger = new logger_1.Logger({ id: this.instanceName, enabled: options.logging });
        this.cache = options.cache ?? new cache_storage_1.Cache(this, options);
    }
}
exports.Context = Context;
Context.instanceCount = 1;
//# sourceMappingURL=context.js.map