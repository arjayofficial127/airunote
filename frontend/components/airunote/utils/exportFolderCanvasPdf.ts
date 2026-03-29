import { jsPDF } from 'jspdf';
import MarkdownIt from 'markdown-it';

type ExportItemType = 'document' | 'folder';
type ExportDocumentType = 'TXT' | 'MD' | 'RTF';

export interface FolderCanvasPdfExportItem {
  id: string;
  type: ExportItemType;
  title: string;
  documentType?: ExportDocumentType;
  content?: string;
  hasUnsavedLocalChanges?: boolean;
  exportWarning?: string | null;
}

export interface FolderCanvasPdfExportPayload {
  folderTitle: string;
  lensName?: string;
  items: FolderCanvasPdfExportItem[];
}

const markdownRenderer = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function htmlToPlainText(html: string): string {
  if (typeof window === 'undefined') {
    return normalizeWhitespace(html.replace(/<[^>]+>/g, ' '));
  }

  const parsed = new window.DOMParser().parseFromString(html, 'text/html');
  return normalizeWhitespace(parsed.body.textContent ?? '');
}

function getReadableDocumentContent(item: FolderCanvasPdfExportItem): string {
  if (!item.content) {
    return '';
  }

  if (item.documentType === 'RTF') {
    return htmlToPlainText(item.content);
  }

  if (item.documentType === 'MD') {
    return htmlToPlainText(markdownRenderer.render(item.content));
  }

  return normalizeWhitespace(item.content);
}

export async function exportFolderCanvasPdf(payload: FolderCanvasPdfExportPayload): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 56;
  const contentWidth = pageWidth - marginX * 2;
  const defaultLineHeight = 14;
  let cursorY = marginTop;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY + requiredHeight <= pageHeight - marginBottom) {
      return;
    }

    doc.addPage();
    cursorY = marginTop;
  };

  const addWrappedText = (text: string, fontSize = 11, lineHeight = defaultLineHeight) => {
    if (!text.trim()) {
      return;
    }

    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];

    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, marginX, cursorY);
      cursorY += lineHeight;
    }
  };

  const addGap = (height: number) => {
    cursorY += height;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(payload.folderTitle, marginX, cursorY);
  cursorY += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const subtitle = payload.lensName
    ? `Folder canvas export | Lens: ${payload.lensName}`
    : 'Folder canvas export';
  doc.text(subtitle, marginX, cursorY);
  cursorY += 16;
  doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, cursorY);
  cursorY += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Table of Contents', marginX, cursorY);
  cursorY += 18;

  doc.setFont('helvetica', 'normal');
  payload.items.forEach((item, index) => {
    const flags = [
      item.type === 'folder' ? 'Folder' : item.documentType ?? 'Document',
      item.hasUnsavedLocalChanges ? 'Unsaved local edits' : null,
    ].filter(Boolean);
    addWrappedText(`${index + 1}. ${item.title}${flags.length > 0 ? ` (${flags.join(', ')})` : ''}`, 11, 13);
  });

  doc.addPage();
  cursorY = marginTop;

  payload.items.forEach((item, index) => {
    ensureSpace(64);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`${index + 1}. ${item.title}`, marginX, cursorY);
    cursorY += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const metaParts = [item.type === 'folder' ? 'Folder' : 'Document'];
    if (item.type === 'document' && item.documentType) {
      metaParts.push(item.documentType);
    }
    doc.text(metaParts.join(' | '), marginX, cursorY);
    cursorY += 16;

    if (item.hasUnsavedLocalChanges) {
      addWrappedText('Note: this item has unsaved inline edits in the current canvas. This export includes the latest saved content.', 10, 12);
      addGap(6);
    }

    if (item.exportWarning) {
      addWrappedText(`Warning: ${item.exportWarning}`, 10, 12);
      addGap(6);
    }

    if (item.type === 'folder') {
      addWrappedText('Folder item. This export includes the folder in the table of contents and item listing.', 11, 14);
      addGap(18);
      return;
    }

    const readableContent = getReadableDocumentContent(item);
    addWrappedText(readableContent || 'Document content is empty.', 11, 14);
    addGap(18);
  });

  const safeFolderTitle = payload.folderTitle.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'folder_canvas';
  doc.save(`${safeFolderTitle}_canvas_export.pdf`);
}