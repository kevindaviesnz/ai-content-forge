"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BriefAgent = void 0;
const base_1 = require("./base");
const types_1 = require("../types");
class BriefAgent extends base_1.BaseAgent {
    constructor() {
        super('brief.md');
        this.name = "BriefAgent";
        this.modelConfig = {};
        this.outputSchema = types_1.ContentBriefSchema;
    }
    async run(input) {
        // We pass the raw topic wrapped in a simple JSON structure to the LLM
        const response = await this.callLLM(JSON.stringify({ topic: input }));
        return this.parse(response);
    }
}
exports.BriefAgent = BriefAgent;
