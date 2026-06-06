/* global console, process */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const excludeDirs = new Set(["node_modules", "dist", ".git", ".cache", "coverage"]);

function shouldIncludeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);

  const allowedExtensions = [".md", ".ts", ".tsx", ".css", ".html"];
  if (allowedExtensions.includes(ext)) {
    return true;
  }

  const allowedNames = [
    "package.json",
    "tsconfig.json",
    "tsconfig.base.json",
    "tsconfig.app.json",
    "tsconfig.test.json",
    "eslint.config.js",
    "vite.config.ts",
  ];
  return allowedNames.includes(name);
}

function getReviewFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!excludeDirs.has(file)) {
        getReviewFiles(filePath, files);
      }
    } else if (shouldIncludeFile(filePath)) {
      files.push(filePath);
    }
  }
  return files;
}

try {
  const reviewFiles = getReviewFiles(rootDir);
  reviewFiles.sort();

  for (const file of reviewFiles) {
    const relativePath = path.relative(rootDir, file);
    const content = fs.readFileSync(file, "utf-8");
    console.log(`--- START OF FILE: ${relativePath} ---`);
    console.log(content);
    console.log(`--- END OF FILE: ${relativePath} ---\n`);
  }
} catch (err) {
  console.error("Error gathering review files:", err);
  process.exit(1);
}
