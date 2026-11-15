import { promises as fs } from "fs";
import path from "path";
import type { AppData, LibraryEntry, MediaItem, Progress } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "store.json");

const DEFAULT: AppData = {
  library: [],
  progress: {},
  recent: [],
  settings: {
    homepageSections: [
      "public-domain",
      "trending",
      "popular-manga",
      "popular-manhwa",
      "popular-manhua",
      "visual-novels",
      "mangadex-trending",
      "novels",
      "hidden-gems",
      "top-rated",
    ],
    readerDirection: "rtl",
    novelFontSize: 18,
    novelTheme: "dark",
  },
};

let writeChain: Promise<void> = Promise.resolve();

/**
 * Vercel's filesystem is read-only. When a write fails we fall back to an
 * in-memory store so the deployed app keeps working for browsing, search and
 * readers instead of returning 500s. Data then lasts for the life of the
 * serverless instance — real persistence requires Supabase (db/schema.sql).
 */
let memory: AppData | null = null;
let readOnly = false;

export function storageMode(): "file" | "memory" {
  return readOnly || memory ? "memory" : "file";
}

export async function readData(): Promise<AppData> {
  if (memory) return structuredClone(memory);
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...DEFAULT,
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export async function writeData(data: AppData): Promise<void> {
  if (readOnly) {
    memory = structuredClone(data);
    return;
  }
  writeChain = writeChain.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${FILE}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
      await fs.rename(tmp, FILE);
    } catch {
      // Read-only or ephemeral filesystem (Vercel, containers).
      readOnly = true;
      memory = structuredClone(data);
    }
  });
  return writeChain;
}

export async function setLibraryStatus(
  media: MediaItem,
  status: LibraryEntry["status"] | null
): Promise<AppData> {
  const data = await readData();
  data.library = data.library.filter((e) => e.media.id !== media.id);
  if (status) {
    data.library.unshift({
      id: `lib_${media.id}`,
      status,
      addedAt: new Date().toISOString(),
      media,
    });
  }
  await writeData(data);
  return data;
}

export async function saveProgress(p: Omit<Progress, "updatedAt">): Promise<AppData> {
  const data = await readData();
  data.progress[p.mediaId] = { ...p, updatedAt: new Date().toISOString() };
  await writeData(data);
  return data;
}

export async function trackRecent(media: MediaItem): Promise<AppData> {
  const data = await readData();
  data.recent = [
    { mediaId: media.id, at: new Date().toISOString(), media },
    ...data.recent.filter((r) => r.mediaId !== media.id),
  ].slice(0, 30);
  await writeData(data);
  return data;
}

export async function updateSettings(patch: Partial<AppData["settings"]>): Promise<AppData> {
  const data = await readData();
  data.settings = { ...data.settings, ...patch };
  await writeData(data);
  return data;
}
