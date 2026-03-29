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

function getItemMetaLabel(item: FolderCanvasPdfExportItem): string {
  if (item.type === 'folder') {
    return 'Folder';
  }

  return item.documentType ?? 'Document';
}

function getItemStatusFlags(item: FolderCanvasPdfExportItem): string[] {
  return [
    item.hasUnsavedLocalChanges ? 'Unsaved local edits' : null,
    item.exportWarning ? 'Content warning' : null,
  ].filter((value): value is string => Boolean(value));
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
  const headerHeight = 52;
  const footerHeight = 34;
  const contentTop = headerHeight + 30;
  const contentBottom = pageHeight - footerHeight - 22;
  const contentWidth = pageWidth - marginX * 2;
  const defaultLineHeight = 15;
  const pageSections = new Map<number, string>();
  let cursorY = contentTop;
  let currentSectionLabel = 'Overview';

  const registerCurrentPageSection = (label = currentSectionLabel) => {
    currentSectionLabel = label;
    pageSections.set(doc.getCurrentPageInfo().pageNumber, label);
  };

  const addPage = (sectionLabel = currentSectionLabel) => {
    doc.addPage();
    cursorY = contentTop;
    registerCurrentPageSection(sectionLabel);
  };

  const ensureSpace = (requiredHeight: number, nextSectionLabel = currentSectionLabel) => {
    if (cursorY + requiredHeight <= contentBottom) {
      return;
    }

    addPage(nextSectionLabel);
  };

  const addGap = (height: number) => {
    cursorY += height;
  };

  const addDivider = (spacingTop = 10, spacingBottom = 16) => {
    ensureSpace(spacingTop + spacingBottom + 1);
    cursorY += spacingTop;
    doc.setDrawColor(218, 223, 230);
    doc.setLineWidth(0.8);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += spacingBottom;
  };

  const addWrappedText = (text: string, fontSize = 11, lineHeight = defaultLineHeight) => {
    if (!text.trim()) {
      return;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(38, 46, 56);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];

    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, marginX, cursorY);
      cursorY += lineHeight;
    }
  };

  const addSectionEyebrow = (text: string) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(text.toUpperCase(), marginX, cursorY);
    cursorY += 12;
  };

  const addSectionTitle = (text: string, sectionLabel = text) => {
    registerCurrentPageSection(sectionLabel);
    ensureSpace(24, sectionLabel);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text(text, marginX, cursorY);
    cursorY += 22;
  };

  const addMetaLine = (text: string) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(91, 99, 110);
    doc.text(text, marginX, cursorY);
    cursorY += 14;
  };

  const addCallout = (label: string, text: string, tone: 'warning' | 'note') => {
    const background = tone === 'warning' ? [255, 247, 237] : [239, 246, 255];
    const border = tone === 'warning' ? [245, 158, 11] : [59, 130, 246];
    const textColor = tone === 'warning' ? [146, 64, 14] : [30, 64, 175];
    const lines = doc.splitTextToSize(`${label}: ${text}`, contentWidth - 24) as string[];
    const height = lines.length * 12 + 18;

    ensureSpace(height + 6);
    doc.setFillColor(background[0], background[1], background[2]);
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.roundedRect(marginX, cursorY - 10, contentWidth, height, 8, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(label, marginX + 12, cursorY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    let lineY = cursorY + 4;
    lines.forEach((line, index) => {
      doc.text(line, marginX + (index === 0 ? 44 : 12), lineY);
      lineY += 12;
    });

    cursorY += height + 8;
  };

  const addTocEntry = (index: number, item: FolderCanvasPdfExportItem) => {
    const flags = getItemStatusFlags(item);
    const metaLabel = getItemMetaLabel(item);
    const titleLines = doc.splitTextToSize(`${index + 1}. ${item.title}`, contentWidth - 120) as string[];
    const entryHeight = titleLines.length * 14 + (flags.length > 0 ? 14 : 0) + 12;

    ensureSpace(entryHeight, 'Table of Contents');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    let lineY = cursorY;
    titleLines.forEach((line) => {
      doc.text(line, marginX, lineY);
      lineY += 14;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(91, 99, 110);
    doc.text(metaLabel.toUpperCase(), pageWidth - marginX, cursorY, { align: 'right' });

    if (flags.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(146, 64, 14);
      doc.text(flags.join(' • '), marginX, lineY);
      lineY += 12;
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(marginX, lineY + 2, pageWidth - marginX, lineY + 2);
    cursorY = lineY + 10;
  };

  const renderPageChrome = () => {
    const totalPages = doc.getNumberOfPages();
    const generatedAt = new Date().toLocaleString();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      doc.setPage(pageNumber);

      const sectionLabel = pageSections.get(pageNumber) ?? 'Folder Canvas Export';

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.8);
      doc.line(marginX, headerHeight, pageWidth - marginX, headerHeight);
      doc.line(marginX, pageHeight - footerHeight, pageWidth - marginX, pageHeight - footerHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text(payload.folderTitle, marginX, 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(sectionLabel, pageWidth - marginX, 28, { align: 'right' });

      doc.text(
        payload.lensName ? `Lens: ${payload.lensName}` : 'Folder canvas export',
        marginX,
        pageHeight - 14
      );
      doc.text(generatedAt, pageWidth / 2, pageHeight - 14, { align: 'center' });
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - marginX, pageHeight - 14, { align: 'right' });
    }
  };

  registerCurrentPageSection('Overview');

  addSectionEyebrow('Folder Canvas Export');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39);
  doc.text(payload.folderTitle, marginX, cursorY);
  cursorY += 28;

  addMetaLine(payload.lensName ? `Lens view: ${payload.lensName}` : 'Folder canvas export');
  addMetaLine(`Generated ${new Date().toLocaleString()}`);
  addMetaLine(`${payload.items.length} canvas item${payload.items.length === 1 ? '' : 's'} included`);
  addGap(10);
  addDivider(0, 18);

  addSectionEyebrow('Contents');
  addSectionTitle('Table of Contents', 'Table of Contents');
  payload.items.forEach((item, index) => {
    addTocEntry(index, item);
  });

  addPage('Items');

  payload.items.forEach((item, index) => {
    const sectionLabel = `${index + 1}. ${item.title}`;
    ensureSpace(86, sectionLabel);
    addSectionEyebrow(item.type === 'folder' ? 'Folder Item' : 'Document Item');
    addSectionTitle(`${index + 1}. ${item.title}`, sectionLabel);

    const metaParts = [item.type === 'folder' ? 'Folder' : 'Document'];
    if (item.type === 'document' && item.documentType) {
      metaParts.push(item.documentType);
    }
    addMetaLine(metaParts.join(' | '));

    if (item.hasUnsavedLocalChanges) {
      addCallout(
        'Note',
        'This item has unsaved inline edits in the current canvas. This export includes the latest saved content.',
        'note'
      );
    }

    if (item.exportWarning) {
      addCallout('Warning', item.exportWarning, 'warning');
    }

    if (item.type === 'folder') {
      addWrappedText(
        'Folder item. This export includes the folder in the table of contents and item listing.',
        11,
        15
      );
      addGap(20);
      addDivider(0, 18);
      return;
    }

    const readableContent = getReadableDocumentContent(item);
    addWrappedText(readableContent || 'Document content is empty.', 11, 16);
    addGap(20);
    addDivider(0, 18);
  });

  renderPageChrome();

  const safeFolderTitle = payload.folderTitle.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'folder_canvas';
  doc.save(`${safeFolderTitle}_canvas_export.pdf`);
}
