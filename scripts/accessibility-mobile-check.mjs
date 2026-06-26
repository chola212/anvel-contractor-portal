import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");
const appRoot = path.join(srcRoot, "app");
const globalsPath = path.join(appRoot, "globals.css");

const failures = [];
const warnings = [];

function walkFiles(directory, predicate, files = []) {
  if (!existsSync(directory)) {
    return files;
  }

  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walkFiles(fullPath, predicate, files);
      continue;
    }

    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function read(filePath) {
  return readFileSync(filePath, "utf8");
}

function relative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function warn(condition, message) {
  if (!condition) {
    warnings.push(message);
  }
}

const sourceFiles = walkFiles(
  srcRoot,
  (filePath) => filePath.endsWith(".tsx") || filePath.endsWith(".css"),
);
const sourceText = sourceFiles.map(read).join("\n");

const pageFiles = walkFiles(appRoot, (filePath) => filePath.endsWith("page.tsx"));
const pageFilesMissingHeading = pageFiles
  .filter((filePath) => !read(filePath).includes("<h1"))
  .map(relative);

check(pageFiles.length > 0, "No App Router page files were found.");
check(
  pageFilesMissingHeading.length === 0,
  `Every page should expose one visible h1. Missing h1 in: ${pageFilesMissingHeading.join(
    ", ",
  )}`,
);

const imgFilesMissingAlt = sourceFiles
  .filter((filePath) => filePath.endsWith(".tsx"))
  .filter((filePath) => {
    const contents = read(filePath);
    return /<img[\s>]/.test(contents) && !/<img[\s\S]*\salt=/.test(contents);
  })
  .map(relative);

check(
  imgFilesMissingAlt.length === 0,
  `Images must include alt text. Check: ${imgFilesMissingAlt.join(", ")}`,
);

const globals = existsSync(globalsPath) ? read(globalsPath) : "";

check(
  globals.includes("box-sizing: border-box"),
  "Global CSS should keep border-box sizing enabled.",
);
check(
  !sourceText.includes("letter-spacing: -"),
  "Avoid negative letter spacing; it can reduce readability.",
);
check(
  /aria-current=\{/.test(sourceText),
  "Active navigation should expose aria-current for screen readers.",
);
check(
  /aria-label=/.test(sourceText),
  "At least one landmark or control should use aria-label where visible text is not enough.",
);
check(
  /htmlFor=/.test(sourceText),
  "Forms should use explicit labels connected with htmlFor.",
);
check(
  /(sm:|md:|lg:)/.test(sourceText),
  "Responsive Tailwind breakpoints should be present for mobile/tablet layouts.",
);
check(
  sourceText.includes("overflow-x-auto"),
  "Wide operational tables should be wrapped in horizontal scrolling containers.",
);

warn(
  sourceText.includes("sr-only"),
  "No sr-only labels found. That can be fine, but icon-only or compact controls may need hidden labels.",
);
warn(
  sourceText.includes("focus:") || sourceText.includes("focus-visible:"),
  "No explicit focus utilities found. Browser defaults may still work; verify keyboard focus manually.",
);

if (failures.length > 0) {
  console.error("Accessibility and mobile static QA failed.");
  for (const failure of failures) {
    console.error(`FAIL ${failure}`);
  }

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`WARN ${warning}`);
    }
  }

  process.exitCode = 1;
} else {
  console.log("Accessibility and mobile static QA passed.");
  console.log(`Checked ${pageFiles.length} pages and ${sourceFiles.length} source files.`);

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`WARN ${warning}`);
    }
  }
}
