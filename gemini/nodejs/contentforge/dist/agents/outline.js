"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutlineAgent = void 0;
const base_1 = require("./base");
const types_1 = require("../types");
class OutlineAgent extends base_1.BaseAgent {
    constructor() {
        super('outline.md');
        this.name = "OutlineAgent";
        this.modelConfig = {};
        this.outputSchema = types_1.ArticleOutlineSchema;
    }
    async run(input) {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
exports.OutlineAgent = OutlineAgent;
