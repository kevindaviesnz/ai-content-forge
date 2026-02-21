"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorAgent = void 0;
const base_1 = require("./base");
const types_1 = require("../types");
class EditorAgent extends base_1.BaseAgent {
    constructor() {
        super('editor.md');
        this.name = "EditorAgent";
        this.modelConfig = {};
        this.outputSchema = types_1.EditedArticleSchema;
    }
    async run(input) {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
exports.EditorAgent = EditorAgent;
