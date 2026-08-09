import type { JSONContent } from "@tiptap/core";

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

type LegacyBlockType = "text" | "todo" | "bullet";
type LegacyBlock = { id: string; type: LegacyBlockType; text: string; checked?: boolean };

function paragraphNode(text: string): JSONContent {
  return text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" };
}

function legacyBlocksToDoc(blocks: LegacyBlock[]): JSONContent {
  const nodes: JSONContent[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === "bullet") {
      const items: JSONContent[] = [];
      while (i < blocks.length && blocks[i].type === "bullet") {
        items.push({ type: "listItem", content: [paragraphNode(blocks[i].text)] });
        i++;
      }
      nodes.push({ type: "bulletList", content: items });
    } else if (block.type === "todo") {
      const items: JSONContent[] = [];
      while (i < blocks.length && blocks[i].type === "todo") {
        items.push({
          type: "taskItem",
          attrs: { checked: !!blocks[i].checked },
          content: [paragraphNode(blocks[i].text)],
        });
        i++;
      }
      nodes.push({ type: "taskList", content: items });
    } else {
      nodes.push(paragraphNode(block.text));
      i++;
    }
  }
  if (nodes.length === 0) nodes.push({ type: "paragraph" });
  return { type: "doc", content: nodes };
}

/**
 * Notes created before the Tiptap rewrite stored content as a flat array of
 * {id,type,text,checked} blocks. Detect and convert that shape transparently
 * on read so old notes keep working without a database migration — the note
 * is re-saved in the new doc shape the next time it's edited.
 */
export function toEditorContent(raw: unknown): JSONContent {
  if (!raw) return EMPTY_DOC;
  if (Array.isArray(raw)) return legacyBlocksToDoc(raw as LegacyBlock[]);
  return raw as JSONContent;
}

function walkText(node: JSONContent, out: string[]) {
  if (typeof node.text === "string") out.push(node.text);
  node.content?.forEach((child) => walkText(child, out));
}

export function extractPlainText(raw: unknown): string {
  const doc = toEditorContent(raw);
  const parts: string[] = [];
  walkText(doc, parts);
  return parts.join(" ");
}
