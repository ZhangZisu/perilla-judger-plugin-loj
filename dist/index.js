"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const puppeteer_1 = require("puppeteer");
const interfaces_1 = require("./interfaces");
const { submitHandler, waitForWS } = require("./handler");
const MAX_SOURCE_SIZE = 16 * 1024 * 1024;
const UPDATE_INTERVAL = 1000;
const configPath = path_1.join(__dirname, "..", "config.json");
const config = JSON.parse(fs_1.readFileSync(configPath).toString());
let browser = null;
if (!config.loj_addr.endsWith("/")) {
    config.loj_addr = config.loj_addr + "/";
}
const getURL = (url) => {
    if (url.startsWith("/")) {
        return config.loj_addr + url.substr(1);
    }
    return config.loj_addr + url;
};
const blockedResourceList = [
    /google/,
    /gstatic/,
];
const registerResourceBlocker = async (page) => {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
        const url = request.url();
        for (const blocked of blockedResourceList) {
            if (blocked.test(url)) {
                return request.abort();
            }
        }
        return request.continue();
    });
};
const isLoggedIn = async () => {
    if (!browser) {
        return false;
    }
    const page = await browser.newPage();
    await registerResourceBlocker(page);
    try {
        const res = await page.goto(getURL("/login?url="));
        const failed = (res.status() !== 200) || !(/您已经登录了，请先注销。/.test(await res.text()));
        await page.close();
        return !failed;
    }
    catch (e) {
        await page.close();
        return false;
    }
};
const initRequest = async () => {
    console.log("[INFO] [LOJ] Puppeteer is initializing");
    browser = await puppeteer_1.launch();
    const page = await browser.newPage();
    await registerResourceBlocker(page);
    try {
        await page.goto(getURL("login?url="));
        await page.evaluate((username, password) => {
            const usr = document.querySelector("#username");
            const pwd = document.querySelector("#password");
            usr.value = username;
            pwd.value = password;
            const btn = document.querySelector("#login");
            btn.click();
        }, config.username, config.password);
        await page.waitForNavigation();
        if (!await isLoggedIn()) {
            throw new Error("Login failed");
        }
        await page.close();
        console.log("[INFO] [LOJ] Puppeteer is initialized");
    }
    catch (e) {
        await page.close();
        throw e;
    }
};
const submit = async (id, code, langname) => {
    const page = await browser.newPage();
    await registerResourceBlocker(page);
    try {
        await page.goto(getURL("problem/" + id));
        const unparsed = await page.evaluate(submitHandler, langname, code);
        if (!unparsed) {
            throw new Error("Submit failed");
        }
        await page.close();
        return parseInt(unparsed, 10);
    }
    catch (e) {
        await page.close();
        throw e;
    }
};
const updateMap = new Map();
const convertStatus = (text) => {
    switch (text) {
        case "Waiting":
            return interfaces_1.SolutionResult.WaitingJudge;
        case "Compiling":
        case "Running":
            return interfaces_1.SolutionResult.Judging;
        case "Compile Error":
            return interfaces_1.SolutionResult.CompileError;
        case "Judgement Failed":
        case "System Error":
        case "No Testdata":
        case "File Error":
        case "Invalid Interaction":
            return interfaces_1.SolutionResult.JudgementFailed;
        case "Accepted":
            return interfaces_1.SolutionResult.Accepted;
        case "Wrong Answer":
            return interfaces_1.SolutionResult.WrongAnswer;
        case "Runtime Error":
            return interfaces_1.SolutionResult.RuntimeError;
        case "Time Limit Exceeded":
            return interfaces_1.SolutionResult.TimeLimitExceeded;
        case "Memory Limit Exceeded":
            return interfaces_1.SolutionResult.MemoryLimitExceeded;
        case "Partially Correct":
            return interfaces_1.SolutionResult.WrongAnswer;
        case "Skipped":
            return interfaces_1.SolutionResult.Skipped;
    }
    return interfaces_1.SolutionResult.OtherError;
};
const fetch = async (runID) => {
    const page = await browser.newPage();
    await registerResourceBlocker(page);
    try {
        await page.goto(getURL("submission/" + runID));
        await page.waitForFunction(waitForWS, { timeout: 500 });
        const { memory, time, statusText, score } = await page.evaluate(() => {
            return {
                memory: document.querySelector("#status_table > tbody > tr > td:nth-child(6)").textContent.trim(),
                time: document.querySelector("#status_table > tbody > tr > td:nth-child(5)").textContent.trim(),
                statusText: document.querySelector("#status_table > tbody > tr > td:nth-child(3)").textContent.trim(),
                score: parseInt(document.querySelector("#status_table > tbody > tr > td:nth-child(4)").textContent.trim(), 10),
            };
        });
        const status = convertStatus(statusText);
        const result = {
            status,
            score,
            details: {
                time,
                memory,
                runID,
            },
        };
        await page.close();
        return result;
    }
    catch (e) {
        await page.close();
        if (e.message.startsWith("waiting for function failed")) {
            const result = {
                status: interfaces_1.SolutionResult.WaitingJudge,
                score: 0,
                details: {
                    time: "/",
                    memory: "/",
                    runID,
                },
            };
            return result;
        }
        throw e;
    }
};
const updateSolutionResults = async () => {
    for (const [runid, cb] of updateMap) {
        try {
            const result = await fetch(runid);
            cb(result);
            if (result.status !== interfaces_1.SolutionResult.Judging && result.status !== interfaces_1.SolutionResult.WaitingJudge) {
                updateMap.delete(runid);
            }
        }
        catch (e) {
            cb({ status: interfaces_1.SolutionResult.JudgementFailed, score: 0, details: { error: e.message, runID: runid } });
        }
    }
    setTimeout(updateSolutionResults, UPDATE_INTERVAL);
};
const main = async (problem, solution, resolve, update) => {
    if (interfaces_1.Problem.guard(problem)) {
        if (interfaces_1.Solution.guard(solution)) {
            if (!browser) {
                try {
                    await initRequest();
                }
                catch (e) {
                    browser = null;
                    return update({ status: interfaces_1.SolutionResult.JudgementFailed, score: 0, details: { error: e.message } });
                }
            }
            try {
                let langname = null;
                if (solution.language === "c") {
                    langname = "c";
                }
                else if (solution.language === "cpp98") {
                    langname = "cpp";
                }
                else if (solution.language === "cpp11") {
                    langname = "cpp11";
                }
                else if (solution.language === "java") {
                    langname = "java";
                }
                else if (solution.language === "python3") {
                    langname = "python3";
                }
                else if (solution.language === "python2") {
                    langname = "python2";
                }
                else if (solution.language === "node") {
                    langname = "nodejs";
                }
                else if (solution.language === "csharp") {
                    langname = "csharp";
                }
                if (langname === null) {
                    return update({ status: interfaces_1.SolutionResult.JudgementFailed, score: 0, details: { error: "Language rejected" } });
                }
                const source = await resolve(solution.file);
                const stat = fs_1.statSync(source.path);
                if (stat.size > MAX_SOURCE_SIZE) {
                    return update({ status: interfaces_1.SolutionResult.JudgementFailed, score: 0, details: { error: "File is too big" } });
                }
                const content = fs_1.readFileSync(source.path).toString();
                const runID = await submit(problem.id, content, langname);
                updateMap.set(runID, update);
            }
            catch (e) {
                return update({ status: interfaces_1.SolutionResult.JudgementFailed, score: 0, details: { error: "Invalid solution" } });
            }
        }
        else {
            return update({ status: interfaces_1.SolutionResult.JudgementFailed, score: 0, details: { error: "Invalid solution" } });
        }
    }
    else {
        return update({ status: interfaces_1.SolutionResult.JudgementFailed, score: 0, details: { error: "Invalid problem" } });
    }
};
module.exports = main;
updateSolutionResults();
//# sourceMappingURL=index.js.map