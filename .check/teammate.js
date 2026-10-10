// .check/teammate.js - GIVEN. Exercise 2, Step C:  npm run teammate
// A teammate works on the same project. This file makes the commit they made: release 1.1.1, in which the data
// file was "renamed" in the code but not in the folder. It commits; it does not push. Pushing is your move.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, load } from "./render.js";

const MESSAGE = "v1.1.1: rename the data file";

function git(args)
{
  const out = spawnSync("git", ["-c", "commit.gpgsign=false"].concat(args), { cwd: ROOT, encoding: "utf8" });
  return { ok: out.status === 0, out: String(out.stdout || "").trim(), err: String(out.stderr || "").trim() };
}

function stop(line)
{
  console.log(line);
  process.exit(1);
}

if (git(["log", "--format=%s"]).out.split("\n").indexOf(MESSAGE) >= 0)
{
  stop("The teammate's commit is already in your history. Look:  git log --oneline -3");
}
const changed = git(["status", "--porcelain"]).out;
if (changed)
{
  stop("You have changes that are not committed yet. Commit and push your own work first (Step B), then run this again.");
}
const now = (await load("src/version.js")).VERSION;
if (now !== "1.1.0")
{
  stop("The teammate starts from release 1.1.0, and src/version.js says " + JSON.stringify(now) + ". Finish Step B first.");
}

const edit = (file, from, to) =>
{
  const full = path.join(ROOT, file);
  const text = fs.readFileSync(full, "utf8");
  if (!(from instanceof RegExp ? from.test(text) : text.indexOf(from) >= 0)) { stop(file + " is not as it was given, so the teammate's change does not fit. Ask your teacher."); }
  fs.writeFileSync(full, text.replace(from, to));
};

edit("src/App.jsx", "fetch(\"services.json\")", "fetch(\"student-services.json\")");
edit("src/version.js", "\"1.1.0\"", "\"1.1.1\"");
edit("CHANGELOG.md", /^##\s*1\.1\.0/m, "## 1.1.1 - the data file renamed\n## 1.1.0");

git(["add", "src/App.jsx", "src/version.js", "CHANGELOG.md"]);
const made = git(["-c", "user.name=A teammate", "-c", "user.email=teammate@example.com", "commit", "--quiet", "-m", MESSAGE]);
if (!made.ok) { stop("The commit could not be made: " + made.err.split("\n")[0]); }

console.log("A teammate has committed a change to your project:");
console.log("");
console.log("  " + git(["log", "--oneline", "-1"]).out);
console.log("");
console.log("It is in this Codespace only. Read the history with  git log --oneline -3  and then push it:  git push");
