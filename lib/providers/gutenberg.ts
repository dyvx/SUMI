import { blank, fetchJson, type ProviderAdapter } from "./base";
import type { Category, MediaItem } from "../types";

/**
 * Project Gutenberg — public-domain books with REAL, readable text.
 * Text and cover files are fetched live from gutenberg.org. Nothing is bundled
 * or rehosted, and every work here is in the public domain.
 */

interface Book {
  id: number;
  title: string;
  authors: string[];
  category: Category;
  genres: string[];
  year: number;
  language: string;
  blurb: string;
}

export const GUTENBERG_BOOKS: Book[] = [
  { id: 1342, title: "Pride and Prejudice", authors: ["Jane Austen"], category: "light-novel", genres: ["Romance", "Classics", "Drama"], year: 1813, language: "en", blurb: "Elizabeth Bennet navigates family, pride and the infuriating Mr Darcy in Austen's sharpest comedy of manners." },
  { id: 84, title: "Frankenstein", authors: ["Mary Wollstonecraft Shelley"], category: "light-novel", genres: ["Gothic", "Horror", "Science Fiction"], year: 1818, language: "en", blurb: "A scientist assembles life from death, and spends the rest of his days learning what he has made." },
  { id: 345, title: "Dracula", authors: ["Bram Stoker"], category: "light-novel", genres: ["Gothic", "Horror", "Classics"], year: 1897, language: "en", blurb: "Assembled from letters and journals, the hunt for a count who has left Carpathia for London." },
  { id: 2701, title: "Moby Dick", authors: ["Herman Melville"], category: "light-novel", genres: ["Adventure", "Classics", "Philosophy"], year: 1851, language: "en", blurb: "Ishmael joins the Pequod and discovers its captain hunts one whale above all others." },
  { id: 1661, title: "The Adventures of Sherlock Holmes", authors: ["Arthur Conan Doyle"], category: "light-novel", genres: ["Mystery", "Detective", "Classics"], year: 1892, language: "en", blurb: "Twelve cases from Baker Street, narrated by Dr Watson." },
  { id: 11, title: "Alice's Adventures in Wonderland", authors: ["Lewis Carroll"], category: "light-novel", genres: ["Fantasy", "Adventure", "Classics"], year: 1865, language: "en", blurb: "A rabbit hole, a bottle marked DRINK ME, and a world with its own rules." },
  { id: 174, title: "The Picture of Dorian Gray", authors: ["Oscar Wilde"], category: "light-novel", genres: ["Gothic", "Philosophy", "Drama"], year: 1890, language: "en", blurb: "A portrait ages so that its subject need not." },
  { id: 35, title: "The Time Machine", authors: ["H. G. Wells"], category: "light-novel", genres: ["Science Fiction", "Adventure"], year: 1895, language: "en", blurb: "An inventor travels to the year 802,701 and finds what humanity became." },
  { id: 132, title: "The Art of War", authors: ["Sun Tzu"], category: "light-novel", genres: ["Strategy", "Philosophy", "Non-fiction"], year: -500, language: "en", blurb: "Thirteen chapters on conflict, deception and the cost of war, translated from the Chinese." },
  { id: 23950, title: "三國志演義 — Romance of the Three Kingdoms", authors: ["Luo Guanzhong"], category: "light-novel", genres: ["Historical", "Wuxia", "Epic"], year: 1400, language: "zh", blurb: "The fall of the Han and the wars of Wei, Shu and Wu — the foundational Chinese historical epic." },
  { id: 25328, title: "豆棚閒話 — Idle Talk Under the Bean Arbor", authors: ["Aina Jushi"], category: "light-novel", genres: ["Historical", "Wuxia", "Classics"], year: 1650, language: "zh", blurb: "Twelve linked tales told beneath a bean trellis, from the late Ming and early Qing." },
  { id: 219, title: "Heart of Darkness", authors: ["Joseph Conrad"], category: "light-novel", genres: ["Classics", "Psychological", "Adventure"], year: 1899, language: "en", blurb: "A river journey into the Congo and toward a man who has stopped answering to anything." },
  { id: 1952, title: "The Yellow Wallpaper", authors: ["Charlotte Perkins Gilman"], category: "light-novel", genres: ["Psychological", "Horror", "Short Stories"], year: 1892, language: "en", blurb: "A woman confined to one room begins to read the walls." },
  { id: 1998, title: "Thus Spake Zarathustra", authors: ["Friedrich Nietzsche"], category: "light-novel", genres: ["Philosophy", "Classics"], year: 1883, language: "en", blurb: "A prophet descends from the mountain to speak to the people about the human and what follows it." },
  { id: 1497, title: "The Republic", authors: ["Plato"], category: "light-novel", genres: ["Philosophy", "Politics"], year: -380, language: "en", blurb: "Socrates and company construct a just city to find out what justice is." },
  { id: 16, title: "Peter Pan", authors: ["J. M. Barrie"], category: "light-novel", genres: ["Fantasy", "Adventure", "Classics"], year: 1911, language: "en", blurb: "Second star to the right, and straight on till morning." },
  { id: 1232, title: "The Prince", authors: ["Niccolò Machiavelli"], category: "light-novel", genres: ["Politics", "Strategy", "Non-fiction"], year: 1532, language: "en", blurb: "A practical manual on acquiring and keeping power." },
  { id: 158, title: "Emma", authors: ["Jane Austen"], category: "light-novel", genres: ["Romance", "Classics", "Comedy"], year: 1815, language: "en", blurb: "Emma Woodhouse arranges everyone's happiness except, initially, her own." },
  { id: 863, title: "The Mysterious Affair at Styles", authors: ["Agatha Christie"], category: "light-novel", genres: ["Mystery", "Detective"], year: 1920, language: "en", blurb: "Poirot's first case: a poisoning at an English country house." },
  { id: 120, title: "Treasure Island", authors: ["Robert Louis Stevenson"], category: "light-novel", genres: ["Adventure", "Classics", "Pirates"], year: 1883, language: "en", blurb: "Jim Hawkins, a map, a one-legged cook, and a ship full of men who want the same gold." },
  { id: 205, title: "Walden", authors: ["Henry David Thoreau"], category: "light-novel", genres: ["Philosophy", "Nature", "Memoir"], year: 1854, language: "en", blurb: "Two years in a cabin by a pond, testing what a life actually needs." },
  { id: 6130, title: "The Iliad", authors: ["Homer"], category: "light-novel", genres: ["Epic", "Classics", "Historical"], year: -750, language: "en", blurb: "Fifty-one days in the tenth year of the siege of Troy." },
  { id: 98, title: "A Tale of Two Cities", authors: ["Charles Dickens"], category: "light-novel", genres: ["Historical", "Classics", "Drama"], year: 1859, language: "en", blurb: "London and Paris, on the edge of revolution." },
  { id: 1400, title: "Great Expectations", authors: ["Charles Dickens"], category: "light-novel", genres: ["Classics", "Drama", "Coming of Age"], year: 1861, language: "en", blurb: "Pip receives money from an unknown source and assumes he knows who sent it." },
  { id: 43, title: "The Strange Case of Dr. Jekyll and Mr. Hyde", authors: ["Robert Louis Stevenson"], category: "light-novel", genres: ["Gothic", "Horror", "Classics"], year: 1886, language: "en", blurb: "A respectable doctor and the man who has been living in his house." },
  { id: 45, title: "Anne of Green Gables", authors: ["L. M. Montgomery"], category: "light-novel", genres: ["Slice of Life", "Classics", "Coming of Age"], year: 1908, language: "en", blurb: "An orphan arrives at a farm expecting a boy and is not that." },
  { id: 46, title: "A Christmas Carol", authors: ["Charles Dickens"], category: "light-novel", genres: ["Classics", "Drama", "Fantasy"], year: 1843, language: "en", blurb: "Four visitors on Christmas Eve and a man who counts his losses." },
  { id: 76, title: "Adventures of Huckleberry Finn", authors: ["Mark Twain"], category: "light-novel", genres: ["Adventure", "Classics", "Satire"], year: 1884, language: "en", blurb: "A raft, a runaway, and a river that keeps offering choices." },
  { id: 768, title: "Wuthering Heights", authors: ["Emily Brontë"], category: "light-novel", genres: ["Romance", "Gothic", "Classics"], year: 1847, language: "en", blurb: "Two families and one obsession, across two generations of moorland weather." },
  { id: 2814, title: "Dubliners", authors: ["James Joyce"], category: "light-novel", genres: ["Short Stories", "Classics", "Slice of Life"], year: 1914, language: "en", blurb: "Fifteen stories of ordinary lives in Dublin, closing with The Dead." },
  { id: 244, title: "A Study in Scarlet", authors: ["Arthur Conan Doyle"], category: "light-novel", genres: ["Mystery", "Detective", "Classics"], year: 1887, language: "en", blurb: "The first meeting of Holmes and Watson, and a body in an empty house." },
  { id: 1250, title: "Anthem", authors: ["Ayn Rand"], category: "light-novel", genres: ["Dystopian", "Science Fiction"], year: 1938, language: "en", blurb: "In a world where the word 'I' no longer exists, one man invents it." },
  { id: 203, title: "Uncle Tom's Cabin", authors: ["Harriet Beecher Stowe"], category: "light-novel", genres: ["Historical", "Drama", "Classics"], year: 1852, language: "en", blurb: "Slavery in America, told through the lives it moves around." },
];

const BY_ID = new Map(GUTENBERG_BOOKS.map((b) => [String(b.id), b]));

function toItem(b: Book): MediaItem {
  return blank({
    id: `gutenberg:${b.id}`,
    provider: "gutenberg",
    providerId: String(b.id),
    title: b.title,
    category: b.category,
    description: b.blurb,
    cover: `https://www.gutenberg.org/cache/epub/${b.id}/pg${b.id}.cover.medium.jpg`,
    author: b.authors[0] ?? null,
    releaseYear: b.year > 0 ? b.year : null,
    genres: b.genres,
    originalLanguage: b.language,
    status: "finished",
    sourceUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
    attribution: "Public-domain text from Project Gutenberg (gutenberg.org)",
    readable: true,
  });
}

export const gutenberg: ProviderAdapter = {
  id: "gutenberg",
  label: "Project Gutenberg",
  attribution: "Public-domain texts from Project Gutenberg",
  categories: ["light-novel"],

  async search(query, limit = 20) {
    const q = query.toLowerCase().trim();
    return GUTENBERG_BOOKS.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.authors.some((a) => a.toLowerCase().includes(q)) ||
        b.genres.some((g) => g.toLowerCase().includes(q))
    )
      .slice(0, limit)
      .map(toItem);
  },

  async trending(limit = 12) {
    return GUTENBERG_BOOKS.slice(0, limit).map(toItem);
  },

  async byId(providerId) {
    const b = BY_ID.get(providerId);
    return b ? toItem(b) : null;
  },
};

/** Strip the Project Gutenberg header and licence footer. */
function stripBoilerplate(raw: string): string {
  let t = raw.replace(/\r\n/g, "\n");
  const startMarkers = [
    /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i,
    /\*\*\*\s*START OF THE PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i,
  ];
  for (const m of startMarkers) {
    const hit = t.match(m);
    if (hit?.index !== undefined) {
      t = t.slice(hit.index + hit[0].length);
      break;
    }
  }
  const end = t.search(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i);
  if (end > 0) t = t.slice(0, end);
  return t.trim();
}

export interface ProseChapter {
  index: number;
  title: string;
  body: string;
}

/** Split raw prose into readable chapters, falling back to size-based parts. */
export function splitChapters(text: string): ProseChapter[] {
  const chapterRe = /^(?:(?:CHAPTER|Chapter|BOOK|Book|PART|Part)\s+[IVXLCDM0-9]+[^\n]{0,80}|第[一二三四五六七八九十百零〇\d]+[回章][^\n]{0,60})$/gm;
  const marks: { index: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = chapterRe.exec(text))) {
    marks.push({ index: m.index, title: m[0].trim() });
  }

  if (marks.length >= 3) {
    const out: ProseChapter[] = [];
    for (let i = 0; i < marks.length; i++) {
      const start = marks[i].index;
      const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
      const body = text.slice(start, end).replace(/^[^\n]*\n/, "").trim();
      if (body.length < 200) continue;
      const cleanTitle = cleanHeading(marks[i].title);
      // Split only genuinely long chapters, and split them evenly.
      const parts = body.length > 16000 ? chunk(body, Math.ceil(body.length / Math.ceil(body.length / 12000))) : [body];
      parts.forEach((p, j) => {
        out.push({
          index: out.length,
          title: parts.length > 1 ? `${cleanTitle} · part ${j + 1}` : cleanTitle,
          body: p,
        });
      });
    }
    if (out.length) return out;
  }

  return chunk(text, 9000).map((body, i) => ({
    index: i,
    title: `Part ${i + 1}`,
    body,
  }));
}

/** Tidy an extracted heading: strip stray brackets, trailing dots, extra spaces. */
function cleanHeading(raw: string): string {
  return raw
    .replace(/^[\s\[\]()]+|[\s\[\]()]+$/g, "")
    .replace(/[.\u3002\s]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function chunk(text: string, size: number): string[] {
  const paras = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur.length + p.length > size && cur.length > 0) {
      out.push(cur.trim());
      cur = "";
    }
    cur += p + "\n\n";
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const textCache = new Map<string, ProseChapter[]>();

export async function gutenbergChapters(bookId: string): Promise<ProseChapter[]> {
  const cached = textCache.get(bookId);
  if (cached) return cached;

  const book = BY_ID.get(bookId);
  if (!book) throw new Error("Unknown Gutenberg book");

  const url = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  let raw: string;
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Gutenberg responded ${res.status}`);
    raw = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const chapters = splitChapters(stripBoilerplate(raw));
  if (!chapters.length) throw new Error("This book has no extractable text.");
  textCache.set(bookId, chapters);
  return chapters;
}
