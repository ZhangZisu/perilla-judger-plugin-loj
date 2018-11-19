import { Array, Number, Partial, Record, String } from "runtypes";

export enum SolutionResult {
    WaitingJudge,            // Wating Judge
    Judging,                 // Judging
    Skipped,                 // Skipped
    Accepted,                // Accepted
    WrongAnswer,             // Wrong Answer
    TimeLimitExceeded,       // Time Limit Exceeded
    MemoryLimitExceeded,     // Memory Limit Exceeded
    RuntimeError,            // Runtime Error
    CompileError,            // Compile Error
    PresentationError,       // Presentation Error
    JudgementFailed,         // Judgement Failed (Judge program error)
    SystemError,             // System Error     (Judge framwork & Judge plugin error)
    OtherError,              // Other Error
}

export interface IFileModel {
    id: number;
    name: string;
    type: string;
    description: string;
    hash: string;
    size: number;
    created: Date;
    tags: string[];
    owner: string;
    creator: string;
}

export interface ISolution {
    status: SolutionResult;
    score: number;
    details?: IDetails;
}

export type JudgeFunction = (
    problem: object,
    solution: object,
    resolveFile: (id: number) => Promise<{ path: string, info: IFileModel }>,
    callback: (solution: ISolution) => Promise<void>,
) => Promise<void>;

export const Problem = Record({
    id: Number,
});

export const Solution = Record({
    file: Number,
    language: String,
});

export interface IDetails {
    time?: string;
    memory?: string;
    error?: string;
    runID?: number;
}
