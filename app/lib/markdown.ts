// Minimal markdown → HTML server-side renderer.
//
// We need to render the legal-draft markdown (Terms / Privacy / Cookies) on
// /legal/* pages, but the project hasn't shipped `remark` / `react-markdown`
// yet and pre-launch isn't the moment to onboard a new dependency. This
// file implements the subset needed for the legal docs:
//
//   # ## ### ####       → <h1> <h2> <h3> <h4>
//   **bold** _italic_   → <strong> <em>
//   `code`              → <code>
//   - item / * item     → <ul><li>
//   1. item             → <ol><li>
//   blank line          → paragraph break
//   [text](url)         → <a href="url">text</a>
//   ---                 → <hr>
//   | a | b |           → <table> (very simple — header row + separator + body)
//
// Input is trusted (we ship it from disk, not from user submissions). Even
// so we escape `<`, `>`, `&`, `"`, `'` everywhere before applying inline
// patterns, so a stray `<script>` in a legal doc can't execute.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  let out = escapeHtml(s);
  // Links [text](url) — must run before bold/italic to avoid eating brackets.
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^\s)]+|mailto:[^\s)]+|#[^\s)]+|\/[^\s)]+)\)/g,
    (_, text, url) => `<a href="${url}" rel="noopener noreferrer">${text}</a>`,
  );
  // Inline code
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold (** or __)
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
  // Italic (* or _ — must come AFTER ** so ** isn't eaten)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");
  return out;
}

interface Block {
  html: string;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      blocks.push({ html: "<hr />" });
      i++;
      continue;
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      blocks.push({ html: `<h${level}>${inline(h[2].trim())}</h${level}>` });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i++;
      }
      const lis = items.map((it) => `<li>${inline(it)}</li>`).join("");
      blocks.push({ html: `<ul>${lis}</ul>` });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      const lis = items.map((it) => `<li>${inline(it)}</li>`).join("");
      blocks.push({ html: `<ol>${lis}</ol>` });
      continue;
    }

    // Table — header line starts with `|`, next line is `|---|---|...`
    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      /^\|[\s\-:|]+\|\s*$/.test(lines[i + 1])
    ) {
      const headerCells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        bodyRows.push(
          lines[i]
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((c) => c.trim()),
        );
        i++;
      }
      const thead = `<thead><tr>${headerCells
        .map((c) => `<th>${inline(c)}</th>`)
        .join("")}</tr></thead>`;
      const tbody = `<tbody>${bodyRows
        .map(
          (row) =>
            `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`,
        )
        .join("")}</tbody>`;
      blocks.push({ html: `<table>${thead}${tbody}</table>` });
      continue;
    }

    // Paragraph — gather until blank / heading / list / hr
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const nxt = lines[i];
      if (
        nxt.trim() === "" ||
        /^#{1,6}\s+/.test(nxt) ||
        /^[-*]\s+/.test(nxt) ||
        /^\d+\.\s+/.test(nxt) ||
        /^---+\s*$/.test(nxt) ||
        nxt.trim().startsWith("|")
      ) {
        break;
      }
      paraLines.push(nxt);
      i++;
    }
    blocks.push({ html: `<p>${inline(paraLines.join(" "))}</p>` });
  }

  return blocks.map((b) => b.html).join("\n");
}
