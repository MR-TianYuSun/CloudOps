/** File and Directory Entries API types (webkitGetAsEntry) */

interface FileSystemEntry {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly name: string;
  readonly fullPath: string;
}

interface FileSystemFileEntry extends FileSystemEntry {
  readonly isFile: true;
  file(
    successCallback: (file: File) => void,
    errorCallback?: (error: DOMException) => void
  ): void;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
  readonly isDirectory: true;
  createReader(): FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
  readEntries(
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: DOMException) => void
  ): void;
}

interface DataTransferItem {
  readonly kind: string;
  readonly type: string;
  getAsFile(): File | null;
  webkitGetAsEntry?(): FileSystemEntry | null;
}

interface DataTransfer {
  readonly items: DataTransferItemList;
  readonly files: FileList;
}

interface DataTransferItemList {
  readonly length: number;
  [index: number]: DataTransferItem;
}
