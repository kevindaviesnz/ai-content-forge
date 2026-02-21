"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchAgent = void 0;
const base_1 = require("./base");
const types_1 = require("../types");
class ResearchAgent extends base_1.BaseAgent {
    constructor() {
        super('research.md');
        this.name = "ResearchAgent";
        this.modelConfig = {};
        this.outputSchema = types_1.ResearchPackageSchema;
    }
    async run(input) {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
exports.ResearchAgent = ResearchAgent;
