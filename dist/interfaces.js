"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtypes_1 = require("runtypes");
var SolutionResult;
(function (SolutionResult) {
    SolutionResult[SolutionResult["WaitingJudge"] = 0] = "WaitingJudge";
    SolutionResult[SolutionResult["Judging"] = 1] = "Judging";
    SolutionResult[SolutionResult["Skipped"] = 2] = "Skipped";
    SolutionResult[SolutionResult["Accepted"] = 3] = "Accepted";
    SolutionResult[SolutionResult["WrongAnswer"] = 4] = "WrongAnswer";
    SolutionResult[SolutionResult["TimeLimitExceeded"] = 5] = "TimeLimitExceeded";
    SolutionResult[SolutionResult["MemoryLimitExceeded"] = 6] = "MemoryLimitExceeded";
    SolutionResult[SolutionResult["RuntimeError"] = 7] = "RuntimeError";
    SolutionResult[SolutionResult["CompileError"] = 8] = "CompileError";
    SolutionResult[SolutionResult["PresentationError"] = 9] = "PresentationError";
    SolutionResult[SolutionResult["JudgementFailed"] = 10] = "JudgementFailed";
    SolutionResult[SolutionResult["SystemError"] = 11] = "SystemError";
    SolutionResult[SolutionResult["OtherError"] = 12] = "OtherError";
})(SolutionResult = exports.SolutionResult || (exports.SolutionResult = {}));
exports.Problem = runtypes_1.Record({
    id: runtypes_1.Number,
});
exports.Solution = runtypes_1.Record({
    file: runtypes_1.Number,
    language: runtypes_1.String,
});
//# sourceMappingURL=interfaces.js.map