// .check/run.js - GIVEN. Checks one drill or one step of the lab.   npm run check l12-D1 K7QF
// The first word names the card; the second is the key shown on that card of the lab page.
// It holds no answer. It looks at what is really there: what your component draws, what your files and your
// history hold, what GitHub has received, and, for a release, what your published address answers.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, load, draw, words } from "./render.js";

const [id, key, roll, token] = process.argv.slice(2);
const SITE = (process.env.LMS_SITE || "https://rishi-fswd-java.pages.dev").replace(/\/+$/, "");
const PRACTICE = path.join(ROOT, "..", "practice");
// how long a check waits for a release to appear at the published address (the workflow takes about a minute)
const WAIT = Number(process.env.LAB12_WAIT) || 150;

function stop(line)
{
  console.log(line);
  process.exit(1);
}

// the result code: worked out from the key, so it fits only the card that showed that key
function code(k, task)
{
  const f = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  return (f(k + ":" + task).toString(36).toUpperCase() + f(task + "/" + k).toString(36).toUpperCase()).replace(/[O0I1]/g, "X").slice(0, 6);
}

let wrong = 0;
const say = (line) => { wrong++; console.log("NOT YET: " + line); };
const ok = (line) => console.log("ok  " + line);
const read = (file) => { try { return fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r/g, ""); } catch (e) { return null; } };

function git(args, where)
{
  const out = spawnSync("git", args, { cwd: where || ROOT, encoding: "utf8" });
  return { ok: out.status === 0, out: String(out.stdout || "").replace(/\r/g, "").trim(), err: String(out.stderr || "").trim() };
}

/* ---------------- what the files hold ---------------- */

// the value of VERSION in a version.js: of the project as it stands, or of one commit (git show)
function versionIn(text)
{
  const m = /VERSION\s*=\s*["']([^"']*)["']/.exec(String(text || "").replace(/\/\/.*$/gm, ""));
  return m ? m[1] : null;
}

// the release lines of a change log, newest first:  ## 1.0.0 - the first dashboard
function releases(text)
{
  return String(text || "").split("\n").map((l) => /^##\s*(\S+)\s*(?:-\s*(.*))?$/.exec(l.trim())).filter(Boolean)
    .map((m) => ({ version: m[1], what: (m[2] || "").trim() }));
}

// one release line, where it should be: at the top of the list, with words after the hyphen
function changeLine(file, want, below)
{
  const text = read(file);
  if (text == null) { say("the file " + file + " is missing"); return false; }
  const list = releases(text);
  const mine = list.filter((r) => r.version.replace(/^v/i, "") === want)[0];
  if (!mine)
  {
    const loose = new RegExp("^\\s*#*\\s*v?" + want.replace(/\./g, "\\.") + "\\b", "m").test(text);
    say(loose ? file + " names " + want + ", but not as a release line. Begin the line as the others begin: two # signs, a space, the version, a hyphen, what changed"
      : file + " has no line for release " + want + " yet: ## " + want + " - and then what changed");
    return false;
  }
  if (/^v/i.test(mine.version)) { say("in " + file + " the version is written without a v: ## " + want + " - ..."); return false; }
  if (mine.what.length < 3) { say("the line of " + want + " in " + file + " does not say what changed: write a few words after the hyphen"); return false; }
  if (list[0] !== mine) { say("in " + file + " the newest release stands first: move the line of " + want + " above the line of " + list[0].version); return false; }
  if (below && (!list[1] || list[1].version !== below)) { say("in " + file + " the line of " + below + " should still stand, right under the line of " + want); return false; }
  ok(file + " has the line  ## " + want + " - " + mine.what);
  return true;
}

/* ---------------- what a component draws ---------------- */

async function drawn(file, swap)
{
  const made = await load(file, swap);
  if (typeof made.default !== "function") { throw new Error(file + " no longer hands out its component: keep the line that begins  export default function"); }
  return words(draw(made.default));
}

// a component must show the version from the constant: drawn once as it stands, and once with another version
async function showsVersion(file, versionFile, name, lead)
{
  const text = read(versionFile);
  const given = versionIn(text);
  const other = "7.4.2";
  const withOther = text.replace(/(VERSION\s*=\s*)["'][^"']*["']/, "$1\"" + other + "\"");
  let now, then;
  try
  {
    now = await drawn(file);
    const swap = {};
    swap[versionFile] = withOther;
    then = await drawn(file, swap);
  }
  catch (e) { say(file + " cannot be read as it stands. " + e.message); return false; }
  if (/VERSION/.test(now)) { say(name + " shows the word VERSION itself: " + JSON.stringify(now) + ". A value goes into JSX inside braces, with no quotation marks: v{VERSION}"); return false; }
  if (now === lead + " v" + given && then !== lead + " v" + other)
  {
    say(name + " shows " + given + " only because that number is typed into the line: with VERSION changed to " + other + " it still showed " + JSON.stringify(then) + ". Show it from the constant: v{VERSION}");
    return false;
  }
  if (now !== lead + " v" + given)
  {
    say(name + " shows " + JSON.stringify(now) + "; it must show " + JSON.stringify(lead + " v" + given) + (now === lead ? ": after the name, a space, the letter v and {VERSION}" : now.indexOf(given) >= 0 ? ": mind the space and the letter v before the number" : /v\d/.test(now) ? ": the number in the line is still typed by hand. Put {VERSION} in its place" : ""));
    return false;
  }
  ok(name + " shows  " + now + "  and follows VERSION when it changes");
  return true;
}

/* ---------------- what Git holds, here and on GitHub ---------------- */

function clean()
{
  const list = git(["status", "--porcelain"]).out.split("\n").filter(Boolean);
  if (!list.length) { ok("every change is committed"); return true; }
  say(list.length + (list.length === 1 ? " file is" : " files are") + " changed and not committed yet (" + list.slice(0, 3).map((l) => l.replace(/^\s*\S+\s+/, "")).join(", ") + (list.length > 3 ? ", ..." : "") + "): stage, commit with a message, then push");
  return false;
}

let asked = null;
// what GitHub has: one question for the branch and the tags
function remote()
{
  if (asked) { return asked; }
  const r = git(["ls-remote", "origin"]);
  if (!r.ok) { asked = { failed: true }; return asked; }
  asked = { refs: {} };
  r.out.split("\n").forEach((l) => { const p = l.split(/\s+/); if (p[1]) { asked.refs[p[1]] = p[0]; } });
  return asked;
}

function pushed()
{
  const head = git(["rev-parse", "HEAD"]).out;
  const there = remote();
  if (there.failed) { say("GitHub could not be asked what it has (git ls-remote origin did not answer). Check the internet, then run this again"); return false; }
  if (there.refs["refs/heads/main"] !== head) { say("your newest commit is in this Codespace only: GitHub has not received it. Push it (Sync Changes, or  git push )"); return false; }
  ok("GitHub has your newest commit");
  return true;
}

function tagged(name, version)
{
  const at = git(["rev-parse", "-q", "--verify", "refs/tags/" + name + "^{commit}"]);
  if (!at.ok)
  {
    const near = git(["tag"]).out.split("\n").filter((t) => t && t.replace(/^v/i, "") === version)[0];
    say(near ? "the tag is named " + near + ", and this lab names a release with a small v in front. Make the right one:  git tag " + name
      : "there is no tag " + name + " yet:  git tag " + name);
    return false;
  }
  const held = versionIn(git(["show", name + ":src/version.js"]).out);
  if (held !== version)
  {
    say("the tag " + name + " sits on a commit whose src/version.js says " + JSON.stringify(held) + ": the tag was made before the commit of this release. Move it to your newest commit with  git tag -f " + name + "  and then  git push -f origin " + name);
    return false;
  }
  const there = remote();
  if (there.failed) { say("GitHub could not be asked what it has. Check the internet, then run this again"); return false; }
  const got = there.refs["refs/tags/" + name + "^{}"] || there.refs["refs/tags/" + name];
  if (!got) { say("the tag " + name + " is in this Codespace only. A tag is pushed by its own command:  git push origin " + name); return false; }
  if (got !== at.out) { say("on GitHub the tag " + name + " sits on another commit than here. Send yours:  git push -f origin " + name); return false; }
  ok("the tag " + name + " names the commit of release " + version + ", here and on GitHub");
  return true;
}

/* ---------------- what the published address answers ---------------- */

function address()
{
  // a teacher trying the lab on one computer may name another address; a student's address comes from the repository
  if (process.env.LAB12_SITE) { return process.env.LAB12_SITE.replace(/\/+$/, "") + "/"; }
  const m = /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\s*$/.exec(git(["remote", "get-url", "origin"]).out);
  if (!m) { return null; }
  const user = m[1].toLowerCase();
  return m[2].toLowerCase() === user + ".github.io" ? "https://" + user + ".github.io/" : "https://" + user + ".github.io/" + m[2] + "/";
}

async function get(url)
{
  try
  {
    const reply = await fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(), { cache: "no-store", signal: AbortSignal.timeout(10000) });
    return { status: reply.status, text: await reply.text() };
  }
  catch (e) { return { status: 0, text: "" }; }
}

async function liveNow(base)
{
  const now = { base: base, page: await get(base), release: null, script: "", services: null, renamed: 0 };
  if (now.page.status !== 200) { return now; }
  const v = await get(base + "version.json");
  try { now.release = v.status === 200 ? JSON.parse(v.text) : null; } catch (e) { now.release = null; }
  const m = /<script[^>]+src="([^"]+\.js)"/.exec(now.page.text);
  if (m) { now.script = (await get(new URL(m[1], base).href)).text; }
  const s = await get(base + "services.json");
  try { now.services = s.status === 200 ? JSON.parse(s.text) : null; } catch (e) { now.services = null; }
  now.renamed = (await get(base + "student-services.json")).status;
  return now;
}

// the published site must show this release. A push takes about a minute to appear, so the check waits for it.
async function live(version, more)
{
  const base = address();
  if (!base) { say("this project is not joined to a repository on github.com, so it has no published address. Work in the Codespace of your own copy"); return null; }
  console.log("    asking " + base + "  (a new release takes about a minute to appear)");
  let now = null;
  const until = Date.now() + WAIT * 1000;
  for (;;)
  {
    now = await liveNow(base);
    if (now.page.status === 200 && now.release && now.release.version === version) { break; }
    if (Date.now() > until) { break; }
    console.log("    not there yet: asking again in 10 seconds");
    await new Promise((done) => setTimeout(done, Math.min(10000, WAIT * 1000)));
  }
  if (now.page.status !== 200)
  {
    say(base + " does not answer with a page (" + (now.page.status ? "status " + now.page.status : "no reply") + "). Two things to look at in your repository on GitHub: Settings, Pages, Source must say GitHub Actions; and the Actions tab must show a green tick on the newest run. A red run: open it and press Re-run all jobs");
    return null;
  }
  if (!now.release || now.release.version !== version)
  {
    say(base + " shows " + (now.release ? "v" + now.release.version : "no version") + ", not v" + version + ". The newest push is still being built, or it was not pushed: open the Actions tab, wait for the green tick, then run this check again");
    return null;
  }
  if (now.script.indexOf(version) < 0) { say("the page at " + base + " does not carry " + version + " in its script: the footer must show the version from VERSION"); return null; }
  ok(base + " is live, and shows v" + version);
  if (more && more.search)
  {
    if (now.release.search !== true || now.script.indexOf("Search for a service") < 0) { say("the live page has no search box: SEARCH in src/features.js must be true in the release that is published"); return null; }
    ok("the live page has the search box");
  }
  if (more && more.broken)
  {
    if (now.script.indexOf("student-services.json") < 0 || now.renamed === 200) { say("the live page should be the teammate's release, which asks for student-services.json, a file that does not exist"); return null; }
    ok("the live page asks for student-services.json, and that address answers " + now.renamed + ": the release is broken, for everyone");
    return now;
  }
  if (!Array.isArray(now.services) || now.services.length !== 8) { say("the live site does not serve its eight services (services.json): the folder public must be as it was given"); return null; }
  if (now.script.indexOf("student-services.json") >= 0) { say("the live page still asks for student-services.json: the teammate's change is still in the release"); return null; }
  ok("the live site serves its eight services");
  return now;
}

/* ---------------- the cards ---------------- */

const FEST = "Add the fest notice";
const BAD = "Move the shuttle to Gate 9";
const TEAMMATE = "v1.1.1: rename the data file";

function practice()
{
  if (!fs.existsSync(path.join(PRACTICE, ".git"))) { say("the practice repository is not there yet: run  npm run practice  first"); return null; }
  const log = git(["log", "--format=%H%x09%s"], PRACTICE).out.split("\n").filter(Boolean).map((l) => ({ id: l.split("\t")[0], what: l.split("\t").slice(1).join("\t") }));
  return log;
}

const CARDS = {
  "l12-D1": async () =>
  {
    await showsVersion("drills/Badge.jsx", "drills/Badge.jsx", "the badge", "Shuttle times");
  },

  "l12-D2": async () =>
  {
    const text = read("drills/CHANGELOG.md");
    const list = releases(text);
    const top = list[0] ? list[0].version.replace(/^v/i, "") : "";
    if (list.length === 2 && top === "0.9.0")
    {
      // a line that names a version but does not begin as a release line begins
      const loose = String(text || "").split("\n").some((l) => /^\s*v?\d+\.\d+/.test(l));
      say(loose ? "your line in drills/CHANGELOG.md does not begin as the others begin: two # signs and a space come first, then the version, a hyphen, what changed"
        : "drills/CHANGELOG.md has no new line yet: write it above the line of 0.9.0");
      return;
    }
    if (top !== "0.9.1" && top !== "0.9.0" && top !== "0.8.0")
    {
      say("you wrote " + top + ". This release is a fix: nothing new, nothing broken. A fix moves the last of the three numbers one up, and the others stay");
      return;
    }
    changeLine("drills/CHANGELOG.md", "0.9.1", "0.9.0");
  },

  "l12-D3": async () =>
  {
    const log = practice();
    if (!log) { return; }
    const fest = log.filter((c) => c.what === FEST)[0];
    if (!fest) { say("the practice repository is not as it was made: run  npm run practice  to start it afresh"); return; }
    const at = git(["rev-parse", "-q", "--verify", "refs/tags/v0.9.0^{commit}"], PRACTICE);
    if (!at.ok)
    {
      const other = git(["tag"], PRACTICE).out.split("\n").filter(Boolean);
      say(other.length ? "the practice repository has the tag " + other.join(", ") + ", and the tag asked for is v0.9.0, with a small v"
        : "the practice repository has no tag yet:  git -C ../practice tag v0.9.0  and then the id of the commit");
      return;
    }
    if (at.out !== fest.id)
    {
      const on = log.filter((c) => c.id === at.out)[0];
      say("v0.9.0 sits on the commit \"" + (on ? on.what : "?") + "\", and it belongs on \"" + FEST + "\". Without an id, a tag goes on the newest commit. Take it off with  git -C ../practice tag -d v0.9.0  and tag again, with the id from the log");
      return;
    }
    ok("the tag v0.9.0 names the commit \"" + FEST + "\"");
  },

  "l12-D4": async () =>
  {
    const log = practice();
    if (!log) { return; }
    const board = (() => { try { return fs.readFileSync(path.join(PRACTICE, "board.txt"), "utf8").replace(/\r/g, "").trim().split("\n"); } catch (e) { return []; } })();
    const bad = log.filter((c) => c.what === BAD)[0];
    if (!bad) { say("the commit \"" + BAD + "\" is gone from the history. A revert removes nothing: it adds a commit. Start afresh with  npm run practice  and use  git revert"); return; }
    const back = log.filter((c) => /^Revert "/.test(c.what));
    if (fs.existsSync(path.join(PRACTICE, ".git", "REVERT_HEAD")))
    {
      say("a revert was started and has stopped half-way: the commit you named clashes with a later one, so it was not the wrong commit. Call it off with  git -C ../practice revert --abort , read the log again, and revert \"" + BAD + "\"");
      return;
    }
    if (!back.length)
    {
      say(board.indexOf("Shuttle: leaves the Main gate at 08:15") >= 0 ? "the board is right again, but no commit of the history says Revert: it was put right by hand. Start afresh with  npm run practice  and let Git do it:  git -C ../practice revert --no-edit  and the id"
        : "nothing has been reverted yet: find the id of \"" + BAD + "\" in the log, then  git -C ../practice revert --no-edit  and that id");
      return;
    }
    if (back[0].what !== "Revert \"" + BAD + "\"")
    {
      say("you reverted " + back[0].what.replace(/^Revert /, "") + ", and the wrong commit is \"" + BAD + "\". Start afresh with  npm run practice , read the log again, and revert that one");
      return;
    }
    const want = ["NOTICE BOARD", "Shuttle: leaves the Main gate at 08:15", "Store: open from 09:00 to 17:30", "Fest: registrations close on Friday", "Contest: Array Sprint on Saturday"];
    if (board.join("\n") !== want.join("\n")) { say("board.txt is not what it should be after the revert: the shuttle at the Main gate again, and the contest notice still there. Start afresh with  npm run practice"); return; }
    ok("the history holds the wrong commit and its revert, " + log.length + " commits in all");
    ok("board.txt has the shuttle at the Main gate again, and keeps the contest notice");
  },

  "l12-E1A": async () =>
  {
    const v = versionIn(read("src/version.js"));
    if (v === "0.0.0") { say("src/version.js still says 0.0.0: the first release is 1.0.0"); return; }
    if (v !== "1.0.0")
    {
      say("src/version.js says " + JSON.stringify(v) + (v && /^v/i.test(v) ? ": write the number alone. The footer adds the letter v" : "") + ". The first release is 1.0.0: three numbers, two dots, inside the quotation marks");
      return;
    }
    ok("src/version.js says 1.0.0");
    await showsVersion("src/Footer.jsx", "src/version.js", "the footer", "Student Services Dashboard");
  },

  "l12-E1B": async () =>
  {
    if (versionIn(read("src/version.js")) !== "1.0.0") { say("src/version.js should say 1.0.0 (Step A)"); return; }
    if (!changeLine("CHANGELOG.md", "1.0.0")) { return; }
    const built = read("dist/version.json");
    if (built == null || read("dist/index.html") == null) { say("there is no built site yet: run  npm run build . It makes the folder dist"); return; }
    let release = null;
    try { release = JSON.parse(built); } catch (e) { release = null; }
    if (!release || release.version !== "1.0.0") { say("the folder dist was built before the version was set: it says " + JSON.stringify(release && release.version) + ". Run  npm run build  again"); return; }
    ok("the folder dist holds the built site of release 1.0.0");
  },

  "l12-E1C": async () =>
  {
    if (versionIn(read("src/version.js")) !== "1.0.0") { say("src/version.js should say 1.0.0 (Step A)"); return; }
    if (!clean()) { return; }
    if (versionIn(git(["show", "HEAD:src/version.js"]).out) !== "1.0.0") { say("your newest commit does not hold version 1.0.0"); return; }
    pushed();
  },

  "l12-E1D": async () =>
  {
    if (!tagged("v1.0.0", "1.0.0")) { return; }
    await live("1.0.0");
  },

  "l12-E2A": async () =>
  {
    let made;
    try { made = await load("src/features.js"); }
    catch (e) { say("src/features.js cannot be read as it stands. " + e.message); return; }
    if (made.SEARCH === false) { say("SEARCH is still false in src/features.js: the search box is not drawn"); return; }
    if (made.SEARCH !== true) { say("SEARCH is " + JSON.stringify(made.SEARCH) + " in src/features.js. It must be the value true: the word alone, small letters, no quotation marks"); return; }
    ok("SEARCH is true in src/features.js");
    let page;
    try { page = draw((await load("src/App.jsx")).default); }
    catch (e) { say("src/App.jsx cannot be read as it stands: it was given finished. " + e.message); return; }
    if (page.indexOf("Search for a service") < 0) { say("the page still draws no search box: src/App.jsx and src/Search.jsx must be as they were given"); return; }
    ok("the page now draws the search box");
  },

  "l12-E2B": async () =>
  {
    const v = versionIn(read("src/version.js"));
    if (v === "1.0.1") { say("you wrote 1.0.1. The search is a new feature, and nothing was broken: a new feature moves the middle number one up, and the last goes back to 0"); return; }
    if (v === "2.0.0") { say("you wrote 2.0.0. The first number moves only when a change breaks something for the people who use the app. The search breaks nothing: it is a new feature"); return; }
    if (v !== "1.1.0") { say("src/version.js says " + JSON.stringify(v) + ". The release with the search is 1.1.0"); return; }
    ok("src/version.js says 1.1.0");
    if ((await load("src/features.js")).SEARCH !== true) { say("SEARCH must be true in src/features.js (Step A): release 1.1.0 is the one with the search"); return; }
    if (!changeLine("CHANGELOG.md", "1.1.0", "1.0.0")) { return; }
    if (!clean()) { return; }
    if (!pushed()) { return; }
    if (!tagged("v1.1.0", "1.1.0")) { return; }
    await live("1.1.0", { search: true });
  },

  "l12-E2C": async () =>
  {
    const log = git(["log", "--format=%s"]).out.split("\n");
    if (log.indexOf(TEAMMATE) < 0) { say("the teammate's commit is not in your history yet: run  npm run teammate"); return; }
    if (log.some((s) => /^Revert "/.test(s))) { say("the teammate's commit has been reverted already. This step is checked while the broken release is live: go on to Step D"); return; }
    ok("your history holds the teammate's commit: " + TEAMMATE);
    if (!pushed()) { return; }
    await live("1.1.1", { broken: true });
  },

  "l12-E2D": async () =>
  {
    const log = git(["log", "--format=%s"]).out.split("\n");
    if (log.indexOf(TEAMMATE) < 0) { say("the teammate's commit is not in your history. Do Step C first:  npm run teammate . If it was there and you took it out with git reset, tell your teacher: a release that went out is never rubbed out, and revert adds a commit instead"); return; }
    const back = log.filter((s) => /^Revert "/.test(s));
    if (fs.existsSync(path.join(ROOT, ".git", "REVERT_HEAD")))
    {
      say("a revert was started and has stopped half-way: the commit you named clashes with a later one, so it was not the teammate's. Call it off with  git revert --abort , read  git log --oneline -3  again, and revert \"" + TEAMMATE + "\"");
      return;
    }
    if (!back.length) { say("nothing has been reverted yet: find the id of \"" + TEAMMATE + "\" with  git log --oneline -3 , then  git revert --no-edit  and that id"); return; }
    if (back.indexOf("Revert \"" + TEAMMATE + "\"") < 0) { say("you reverted " + back[0].replace(/^Revert /, "") + ", and the wrong commit is \"" + TEAMMATE + "\". Undo your own revert with  git revert --no-edit HEAD , then revert the teammate's commit by its id"); return; }
    if (!git(["diff", "--quiet", "v1.1.0", "HEAD", "--", "src", "public"]).ok)
    {
      say("the folders src and public are not what release 1.1.0 held (git diff v1.1.0 HEAD shows the difference): only the teammate's commit should be reverted, and nothing else changed");
      return;
    }
    ok("the history holds the teammate's commit and its revert, and the code is that of release 1.1.0 again");
    if (!clean()) { return; }
    if (!pushed()) { return; }
    await live("1.1.0", { search: true });
  }
};

/* ---------------- the finished work of each exercise, sent to the lab page for the record ---------------- */

const HAND = {
  "l12-E1D": () => ({ id: "LAB12-E1D", files: { "version-and-footer.jsx": "// src/version.js\n" + read("src/version.js").trim() + "\n\n// src/Footer.jsx\n" + read("src/Footer.jsx").trim() + "\n" } }),
  "l12-E2D": () => ({ id: "LAB12-E2D", files: { "release-log.txt": "src/features.js\n" + read("src/features.js").trim() + "\n\nCHANGELOG.md\n" + read("CHANGELOG.md").trim()
    + "\n\ngit log --oneline\n" + git(["log", "--oneline", "-8"]).out + "\n\ngit tag\n" + git(["tag"]).out + "\n\nthe published address\n" + (address() || "") + "\n" } })
};

async function handIn(h)
{
  if (!roll || !token)
  {
    console.log("\nThis step is also handed in for your lab record. Copy the whole command from its card: it ends with your roll number and a long key.");
    return;
  }
  try
  {
    const res = await fetch(SITE + "/api/project", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", labId: "fswd-lab-12", roll: roll, token: token, files: h.files, results: [{ id: h.id, ok: true, line: "passed" }] }) });
    const j = await res.json();
    console.log(j && j.ok ? "\nHanded in for your lab record: " + Object.keys(h.files).join(", ")
      : "\nNot handed in: the roll number or the key after it does not fit. Copy the whole command from the card again.");
  }
  catch (e)
  {
    console.log("\nNot handed in: the lab page could not be reached. Your result code still counts; run the same command again in a minute.");
  }
}

if (!id) { stop("Name the card and the key from it, for example:  npm run check l12-D1 K7QF"); }
if (!CARDS[id]) { stop("There is no card named " + JSON.stringify(id) + " here. Copy the command from the card on the lab page."); }
if (!key) { stop("The key is missing. Copy the whole command from the card: it ends with a short key."); }

await CARDS[id]();
if (wrong) { console.log("\nPut right what is named above, then run the same command again."); process.exit(1); }
console.log("\nPASSED. Result code: " + code(key.toUpperCase(), id));
console.log("Type this code into the card on the lab page.");
if (HAND[id]) { await handIn(HAND[id]()); }
