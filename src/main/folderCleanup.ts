import { isAbsolute, relative, resolve, sep } from 'node:path'

export type FolderReader = (folderPath: string) => Promise<string[]>
export type ItemTrasher = (itemPath: string) => Promise<void>

export class FolderCleanupError extends Error {
  constructor(
    readonly removedCount: number,
    readonly failedCount: number
  ) {
    super(
      `Se enviaron ${removedCount} elementos a la Papelera, pero ${failedCount} no pudieron eliminarse. Cierra los programas que los esten usando y vuelve a intentar.`
    )
    this.name = 'FolderCleanupError'
  }
}

export async function trashFolderContents(
  folderPath: string,
  readFolder: FolderReader,
  trashItem: ItemTrasher
): Promise<number> {
  const entries = await readFolder(folderPath)
  const resolvedFolder = resolve(folderPath)
  let removedCount = 0
  let failedCount = 0

  for (const entry of entries) {
    const itemPath = resolve(resolvedFolder, entry)
    const child = relative(resolvedFolder, itemPath)
    if (child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
      failedCount += 1
      continue
    }
    try {
      await trashItem(itemPath)
      removedCount += 1
    } catch {
      failedCount += 1
    }
  }

  if (failedCount > 0) throw new FolderCleanupError(removedCount, failedCount)
  return removedCount
}
