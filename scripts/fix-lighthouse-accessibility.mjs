import fs from "fs";
import path from "path";

const root = process.cwd();
const scanRoots = ["src"];
const extensions = new Set([".jsx", ".tsx", ".js", ".ts"]);

function walk(dir, files = []) {
  let items;

  try {
    items = fs.readdirSync(dir);
  } catch {
    return files;
  }

  for (const item of items) {
    if (item === "node_modules" || item === "dist" || item === ".git") continue;
    const full = path.join(dir, item);
    let stat;

    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }

    if (stat.isDirectory()) walk(full, files);
    else if (extensions.has(path.extname(full))) files.push(full);
  }
  return files;
}

let changed = 0;

for (const file of scanRoots.flatMap((dir) => walk(path.join(root, dir)))) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;

  text = text.replace(/<h4([^>]*)>\s*Resources\s*<\/h4>/g, "<h3$1>Resources</h3>");

  text = text.replace(
    /<a([^>]*href=["']\/dashboard["'][^>]*)>/g,
    (match, attrs) => {
      if (attrs.includes("aria-label")) return match;
      return `<a${attrs} aria-label="Open DownloadDash dashboard" title="Open DownloadDash dashboard">`;
    }
  );

  text = text.replace(/>Read Guide<\/a>/g, ">Read Full Guide</a>");

  if (text !== original) {
    fs.writeFileSync(file, text, "utf8");
    console.log("Updated:", path.relative(root, file));
    changed++;
  }
}

console.log(`Done. Files changed: ${changed}`);
console.log("Still manually check icon-only buttons.");
