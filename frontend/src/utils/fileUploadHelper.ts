/**
 * Utility to recursively read all files from dropped folders or file items.
 */
export async function getFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const files: File[] = [];

  // Try using webkitGetAsEntry for full directory traversal
  const items = dataTransfer.items;
  if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
    const queue: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) queue.push(entry);
    }

    while (queue.length > 0) {
      const entry = queue.shift();
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
          entry.file(resolve, reject);
        });
        files.push(file);
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readEntries = async (): Promise<any[]> => {
          return new Promise((resolve, reject) => {
            dirReader.readEntries(resolve, reject);
          });
        };

        let entries = await readEntries();
        while (entries.length > 0) {
          queue.push(...entries);
          entries = await readEntries();
        }
      }
    }

    if (files.length > 0) return files;
  }

  // Fallback to standard dataTransfer.files
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    return Array.from(dataTransfer.files);
  }

  return [];
}

