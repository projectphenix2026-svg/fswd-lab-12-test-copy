// .check/practice.js - GIVEN. Makes a small practice repository beside this project:  npm run practice
// It is the notice board of Drills 3 and 4: one file, four commits, one of them wrong. Run it again to start afresh.
// It is a folder of its own, outside your project, so nothing you try there can touch your dashboard.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "./render.js";

const HERE = path.join(ROOT, "..", "practice");
const MARK = path.join(HERE, ".made-by-lab-12");

if (fs.existsSync(HERE) && !fs.existsSync(MARK))
{
  console.log("There is already a folder named practice beside this project, and this lab did not make it.");
  console.log("Rename that folder, then run  npm run practice  again.");
  process.exit(1);
}
fs.rmSync(HERE, { recursive: true, force: true });
fs.mkdirSync(HERE, { recursive: true });

// every student gets the same four commits with the same ids: the same author, the same times, the same text
function git(args, when)
{
  const env = Object.assign({}, process.env);
  if (when)
  {
    env.GIT_AUTHOR_NAME = env.GIT_COMMITTER_NAME = "Notice board";
    env.GIT_AUTHOR_EMAIL = env.GIT_COMMITTER_EMAIL = "board@example.com";
    env.GIT_AUTHOR_DATE = env.GIT_COMMITTER_DATE = when;
  }
  const out = spawnSync("git", ["-c", "core.autocrlf=false", "-c", "commit.gpgsign=false", "-c", "init.defaultBranch=main"].concat(args), { cwd: HERE, encoding: "utf8", env: env });
  if (out.status !== 0)
  {
    console.log("git " + args.join(" ") + " did not work: " + String(out.stderr || out.error || "").trim().split("\n")[0]);
    process.exit(1);
  }
}

const START = ["NOTICE BOARD", "Shuttle: leaves the Main gate at 08:15", "Store: open from 09:00 to 17:30"];
const FEST = "Fest: registrations close on Friday";
const CONTEST = "Contest: Array Sprint on Saturday";
const WRONG = "Shuttle: leaves Gate 9 at 08:15";

const commits = [
  ["Start the notice board", START, "2026-10-05T09:00:00+05:30"],
  ["Add the fest notice", START.concat([FEST]), "2026-10-06T09:00:00+05:30"],
  ["Move the shuttle to Gate 9", [START[0], WRONG, START[2], FEST], "2026-10-07T09:00:00+05:30"],
  ["Add the contest notice", [START[0], WRONG, START[2], FEST, CONTEST], "2026-10-08T09:00:00+05:30"]
];

git(["init", "--quiet"]);
git(["symbolic-ref", "HEAD", "refs/heads/main"]);
fs.writeFileSync(path.join(HERE, ".gitignore"), ".made-by-lab-12\n");
fs.writeFileSync(MARK, "made by npm run practice\n");
commits.forEach((c) =>
{
  fs.writeFileSync(path.join(HERE, "board.txt"), c[1].join("\n") + "\n");
  git(["add", "board.txt", ".gitignore"]);
  git(["commit", "--quiet", "-m", c[0]], c[2]);
});

console.log("The practice repository is ready: the folder practice, beside this project.");
console.log("It holds one file, board.txt, and four commits. Read them:");
console.log("");
console.log("  git -C ../practice log --oneline");
