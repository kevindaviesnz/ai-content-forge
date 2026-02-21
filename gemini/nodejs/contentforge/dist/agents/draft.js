"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftAgent = void 0;
const base_1 = require("./base");
const types_1 = require("../types");
class DraftAgent extends base_1.BaseAgent {
    constructor() {
        super('draft.md');
        this.name = "DraftAgent";
        this.modelConfig = {};
        this.outputSchema = types_1.ArticleDraftSchema;
    }
    async run(input) {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
exports.DraftAgent = DraftAgent;
