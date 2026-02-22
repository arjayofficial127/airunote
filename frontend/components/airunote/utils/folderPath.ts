/**
 * Utility functions for building folder paths from tree data
 */

import type { AiruFolder, FolderTreeResponse } from '../types';

export interface FolderPathItem {
  folder: AiruFolder;
  siblings: AiruFolder[];
}

/**
 * Find a folder by ID in the tree (recursive)
 */
function findFolderInTree(
  tree: FolderTreeResponse,
  folderId: string
): AiruFolder | null {
  // Check current level
  const folder = tree.folders.find((f) => f.id === folderId);
  if (folder) return folder;

  // Check children recursively
  for (const child of tree.children) {
    const found = findFolderInTree(child, folderId);
    if (found) return found;
  }

  return null;
}

/**
 * Get all folders at a specific level (same parentId)
 */
function getSiblings(
  tree: FolderTreeResponse,
  parentFolderId: string
): AiruFolder[] {
  const siblings: AiruFolder[] = [];

  function collectSiblings(node: FolderTreeResponse) {
    // Check if any folder in this node has the target parentId
    const matchingFolders = node.folders.filter(
      (f) => f.parentFolderId === parentFolderId
    );
    siblings.push(...matchingFolders);

    // Recurse into children
    for (const child of node.children) {
      collectSiblings(child);
    }
  }

  collectSiblings(tree);
  return siblings;
}

/**
 * Build folder path from root to current folder
 * Returns array of folders in order: [root, ..., current]
 */
export function buildFolderPath(
  tree: FolderTreeResponse,
  currentFolderId: string
): FolderPathItem[] {
  const path: FolderPathItem[] = [];

  // Find current folder
  const currentFolder = findFolderInTree(tree, currentFolderId);
  if (!currentFolder) {
    return path;
  }

  // Build path by traversing upward
  let folder: AiruFolder | null = currentFolder;
  const pathFolders: AiruFolder[] = [];

  // Collect all folders in the tree for parent lookup
  const allFolders: AiruFolder[] = [];
  function collectAllFolders(node: FolderTreeResponse) {
    allFolders.push(...node.folders);
    for (const child of node.children) {
      collectAllFolders(child);
    }
  }
  collectAllFolders(tree);

  // Build path upward from current to root
  while (folder) {
    pathFolders.unshift(folder); // Add to beginning

    // Find parent folder
    if (folder.parentFolderId === folder.id) {
      // Self-parent means root, stop here
      break;
    }

    const parent = allFolders.find((f) => f.id === folder.parentFolderId);
    if (!parent) {
      // Parent not found, stop
      break;
    }

    folder = parent;
  }

  // Build path items with siblings
  // Filter out root folders (self-parent) - they're represented by "Home" in breadcrumb
  for (const pathFolder of pathFolders) {
    // Skip root folders (self-parent pattern)
    if (pathFolder.parentFolderId === pathFolder.id) {
      continue;
    }

    // Get siblings (folders with same parent as this folder)
    const siblings = getSiblings(tree, pathFolder.parentFolderId);
    path.push({
      folder: pathFolder,
      siblings: siblings.filter((s) => s.id !== pathFolder.id), // Exclude self
    });
  }

  return path;
}
