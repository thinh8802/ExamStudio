/**
 * Tauri IPC & Plugin Mocks for E2E Testing
 */

import { DbFixture } from './db_fixture.js';

export interface MockFileSystemStorage {
  [path: string]: string | Uint8Array;
}

export class MockTauriFileSystem {
  private files: Map<string, string | Uint8Array> = new Map();

  constructor(initialFiles: Record<string, string | Uint8Array> = {}) {
    Object.entries(initialFiles).forEach(([p, content]) => {
      this.files.set(p, content);
    });
  }

  public async readTextFile(filePath: string): Promise<string> {
    if (!this.files.has(filePath)) {
      throw new Error(`File not found in mock FS: ${filePath}`);
    }
    const content = this.files.get(filePath)!;
    if (typeof content === 'string') return content;
    return new TextDecoder().decode(content);
  }

  public async readBinaryFile(filePath: string): Promise<Uint8Array> {
    if (!this.files.has(filePath)) {
      throw new Error(`File not found in mock FS: ${filePath}`);
    }
    const content = this.files.get(filePath)!;
    if (content instanceof Uint8Array) return content;
    return new TextEncoder().encode(content);
  }

  public async writeTextFile(filePath: string, contents: string): Promise<void> {
    this.files.set(filePath, contents);
  }

  public async writeBinaryFile(filePath: string, contents: Uint8Array): Promise<void> {
    this.files.set(filePath, contents);
  }

  public async exists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }

  public removeFile(filePath: string): void {
    this.files.delete(filePath);
  }

  public clear(): void {
    this.files.clear();
  }
}

export class MockTauriSqlPlugin {
  private db: DbFixture;

  constructor(db?: DbFixture) {
    this.db = db || new DbFixture();
  }

  public async load(connectionString: string): Promise<MockTauriSqlPlugin> {
    await this.db.initSchema();
    return this;
  }

  public async execute(query: string, bindValues: any[] = []): Promise<{ rowsAffected: number; insertId?: number }> {
    return this.db.execute(query, bindValues);
  }

  public async select<T>(query: string, bindValues: any[] = []): Promise<T[]> {
    return this.db.select<T>(query, bindValues);
  }

  public getDbInstance(): DbFixture {
    return this.db;
  }
}

export class MockTauriWindow {
  public isFullscreenState: boolean = false;
  public isMinimizedState: boolean = false;

  public async setFullscreen(fullscreen: boolean): Promise<void> {
    this.isFullscreenState = fullscreen;
  }

  public async minimize(): Promise<void> {
    this.isMinimizedState = true;
  }

  public async unminimize(): Promise<void> {
    this.isMinimizedState = false;
  }

  public async close(): Promise<void> {
    // mock close
  }
}

export interface TauriMockHarness {
  fs: MockTauriFileSystem;
  sql: MockTauriSqlPlugin;
  window: MockTauriWindow;
  invoke: (cmd: string, args?: Record<string, any>) => Promise<any>;
}

export function setupTauriMocks(initialFiles: Record<string, string | Uint8Array> = {}): TauriMockHarness {
  const fsMock = new MockTauriFileSystem(initialFiles);
  const sqlMock = new MockTauriSqlPlugin();
  const windowMock = new MockTauriWindow();

  const invokeMock = async (cmd: string, args: Record<string, any> = {}): Promise<any> => {
    switch (cmd) {
      case 'tauri:sql:execute':
        return sqlMock.execute(args.query, args.bindValues);
      case 'tauri:sql:select':
        return sqlMock.select(args.query, args.bindValues);
      case 'tauri:fs:read_text_file':
        return fsMock.readTextFile(args.path);
      case 'tauri:fs:read_binary_file':
        return fsMock.readBinaryFile(args.path);
      case 'tauri:fs:exists':
        return fsMock.exists(args.path);
      case 'tauri:window:set_fullscreen':
        return windowMock.setFullscreen(args.fullscreen);
      default:
        return null;
    }
  };

  // Attach to global scope if window exists (for browser/dom test environments)
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__TAURI_INVOKE__ = invokeMock;
    (globalThis as any).__TAURI_INTERNALS__ = {
      invoke: invokeMock,
      plugins: {
        fs: fsMock,
        sql: sqlMock,
        window: windowMock
      }
    };
  }

  return {
    fs: fsMock,
    sql: sqlMock,
    window: windowMock,
    invoke: invokeMock
  };
}

export function resetTauriMocks(): void {
  if (typeof globalThis !== 'undefined') {
    delete (globalThis as any).__TAURI_INVOKE__;
    delete (globalThis as any).__TAURI_INTERNALS__;
  }
}
