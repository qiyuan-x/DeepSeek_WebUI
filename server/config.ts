import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize data directory
export const DATA_DIR = process.env.DATA_PATH || path.join(process.cwd(), "data");
export const DB_DIR = path.join(DATA_DIR, "database");
export const CONFIG_DIR = path.join(DATA_DIR, "config");
export const INDEX_FILE = path.join(DB_DIR, "index.json");
export const SECRET_KEY_FILE = path.join(CONFIG_DIR, "secret.key");
export const SETTINGS_FILE = path.join(CONFIG_DIR, "settings.json");

// Ensure directories exist
[DB_DIR, CONFIG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize index if it doesn't exist
if (!fs.existsSync(INDEX_FILE)) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify([], null, 2), 'utf-8');
}

export function sanitizeFolderName(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Untitled';
}

export function getConvDir(title: string, id: string) {
  return path.join(DB_DIR, `${sanitizeFolderName(title)}_${id.slice(0, 8)}`);
}

export function readJson(file: string, defaultVal: any = []) {
  if (!fs.existsSync(file)) return defaultVal;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (error) {
    console.error(`Error reading ${file}:`, error);
    return defaultVal;
  }
}

export function writeJson(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}
