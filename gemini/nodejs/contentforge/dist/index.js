#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const dotenv = __importStar(require("dotenv"));
const orchestrator_1 = require("./orchestrator");
const brief_1 = require("./agents/brief");
const chalk_1 = __importDefault(require("chalk"));
dotenv.config();
const program = new commander_1.Command();
program
    .name('contentforge')
    .description('AI Content Generation Pipeline')
    .version('1.0.0');
program
    .command('run')
    .description('Run the full content generation pipeline')
    .argument('<topic>', 'The raw topic or idea')
    .action(async (topic) => {
    const orchestrator = new orchestrator_1.Orchestrator();
    await orchestrator.run(topic);
});
program
    .command('agent')
    .description('Run a specific agent for testing')
    .argument('<agent>', 'Agent name (brief, research, etc.)')
    .argument('<input>', 'Input string (for brief) or file path (for others)')
    .action(async (agentName, input) => {
    // Simplified CLI for testing single agents
    // In a full implementation, this would load previous JSON outputs for inputs
    if (agentName === 'brief') {
        const agent = new brief_1.BriefAgent();
        const result = await agent.run(input);
        console.log(JSON.stringify(result, null, 2));
    }
    else {
        console.log(chalk_1.default.yellow('Single agent testing for downstream agents requires JSON input piping. Please use the full run command for this demo.'));
    }
});
program.parse(process.argv);
