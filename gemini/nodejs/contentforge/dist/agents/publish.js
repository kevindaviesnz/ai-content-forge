"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishAgent = void 0;
const base_1 = require("./base");
const types_1 = require("../types");
class PublishAgent extends base_1.BaseAgent {
    constructor() {
        super('publish.md');
        this.name = "PublishAgent";
        this.modelConfig = {};
        this.outputSchema = types_1.PublishedArticleSchema;
    }
    async run(input) {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
exports.PublishAgent = PublishAgent;
