/**
 * E2E Test Execution Runner Harness for Offline Desktop Quiz App
 *
 * Dynamically discovers and executes all *.test.ts files in tests/e2e/,
 * aggregates test execution results, prints summary report, and exits with code 0 (pass) or 1 (fail).
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
  skip?: boolean;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeEachFns: Array<() => void | Promise<void>>;
  afterEachFns: Array<() => void | Promise<void>>;
}

class TestRegistry {
  public suites: TestSuite[] = [];
  public currentSuite: TestSuite | null = null;
  public totalPassed = 0;
  public totalFailed = 0;
  public totalSkipped = 0;
  public errors: Array<{ suite: string; test: string; error: any }> = [];

  public describe(name: string, fn: () => void): void {
    const parentSuite = this.currentSuite;
    const suite: TestSuite = {
      name,
      tests: [],
      beforeEachFns: parentSuite ? [...parentSuite.beforeEachFns] : [],
      afterEachFns: parentSuite ? [...parentSuite.afterEachFns] : []
    };
    this.currentSuite = suite;
    this.suites.push(suite);
    fn();
    this.currentSuite = parentSuite;
  }

  public it(name: string, fn: () => void | Promise<void>): void {
    if (!this.currentSuite) {
      this.describe('Global Test Suite', () => {
        this.it(name, fn);
      });
      return;
    }
    this.currentSuite.tests.push({ name, fn, skip: false });
  }

  public test(name: string, fn: () => void | Promise<void>): void {
    this.it(name, fn);
  }

  public skip(name: string, fn: () => void | Promise<void>): void {
    if (!this.currentSuite) return;
    this.currentSuite.tests.push({ name, fn, skip: true });
  }

  public beforeEach(fn: () => void | Promise<void>): void {
    if (this.currentSuite) {
      this.currentSuite.beforeEachFns.push(fn);
    }
  }

  public afterEach(fn: () => void | Promise<void>): void {
    if (this.currentSuite) {
      this.currentSuite.afterEachFns.push(fn);
    }
  }

  public reset(): void {
    this.suites = [];
    this.currentSuite = null;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.totalSkipped = 0;
    this.errors = [];
  }
}

export const registry = new TestRegistry();

export const describe = registry.describe.bind(registry);
export const it = registry.it.bind(registry);
export const test = registry.test.bind(registry);
export const beforeEach = registry.beforeEach.bind(registry);
export const afterEach = registry.afterEach.bind(registry);

// Minimal Expect Assertion Library
export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      const actualJson = JSON.stringify(actual);
      const expectedJson = JSON.stringify(expected);
      if (actualJson !== expectedJson) {
        throw new Error(`Expected deep equality:\nExpected: ${expectedJson}\nActual:   ${actualJson}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value but got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual < expected) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
      }
    },
    toContain(item: any) {
      if (Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(item)) {
          throw new Error(`Expected string to contain "${item}"`);
        }
      } else {
        throw new Error(`toContain supported on Array or String, got ${typeof actual}`);
      }
    },
    toThrow(expectedMessage?: string | RegExp) {
      let threw = false;
      let caughtError: any = null;
      try {
        if (typeof actual === 'function') {
          actual();
        }
      } catch (err) {
        threw = true;
        caughtError = err;
      }
      if (!threw) {
        throw new Error('Expected function to throw an error, but it did not throw.');
      }
      if (expectedMessage) {
        const msg = caughtError?.message || String(caughtError);
        if (typeof expectedMessage === 'string' && !msg.includes(expectedMessage)) {
          throw new Error(`Expected error message containing "${expectedMessage}", got "${msg}"`);
        } else if (expectedMessage instanceof RegExp && !expectedMessage.test(msg)) {
          throw new Error(`Expected error matching ${expectedMessage}, got "${msg}"`);
        }
      }
    }
  };
}

// Attach framework to globalThis so test files can use standard describe/it/expect if needed
(globalThis as any).describe = describe;
(globalThis as any).it = it;
(globalThis as any).test = test;
(globalThis as any).expect = expect;
(globalThis as any).beforeEach = beforeEach;
(globalThis as any).afterEach = afterEach;

function findTestFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findTestFiles(filePath));
    } else {
      if ((file.endsWith('.test.ts') || file.endsWith('.spec.ts')) && file !== 'runner.ts') {
        results.push(filePath);
      }
    }
  });
  return results;
}

export async function runAllTests(): Promise<number> {
  const startTime = Date.now();
  const cwd = process.cwd();
  const e2eDir = cwd.endsWith('quiz_app')
    ? path.resolve(cwd, 'tests/e2e')
    : path.resolve(cwd, 'quiz_app/tests/e2e');
  const testFiles = findTestFiles(e2eDir);


  console.log('\n==================================================');
  console.log('🚀  OFFLINE QUIZ APP - E2E TEST HARNESS RUNNER');
  console.log('==================================================');
  console.log(`📁 Test directory: ${e2eDir}`);
  console.log(`🔎 Found ${testFiles.length} test file(s):\n`);
  testFiles.forEach(f => console.log(`   • ${path.relative(e2eDir, f)}`));
  console.log('--------------------------------------------------\n');

  for (const file of testFiles) {
    const fileUrl = pathToFileURL(file).href;
    console.log(`📦 Running test file: ${path.relative(e2eDir, file)}`);
    try {
      await import(fileUrl);
    } catch (err) {
      console.error(`❌ Failed to import test file ${file}:`, err);
      registry.totalFailed++;
      registry.errors.push({ suite: 'Import Phase', test: file, error: err });
    }
  }

  // Execute registered suites
  for (const suite of registry.suites) {
    console.log(`\n  --- Suite: ${suite.name} ---`);
    for (const testCase of suite.tests) {
      if (testCase.skip) {
        console.log(`    ⚠️  [SKIP] ${testCase.name}`);
        registry.totalSkipped++;
        continue;
      }

      try {
        for (const be of suite.beforeEachFns) await be();
        await testCase.fn();
        for (const ae of suite.afterEachFns) await ae();
        console.log(`    ✓  [PASS] ${testCase.name}`);
        registry.totalPassed++;
      } catch (err: any) {
        console.log(`    ✗  [FAIL] ${testCase.name}`);
        console.log(`       Error: ${err.message || err}`);
        registry.totalFailed++;
        registry.errors.push({ suite: suite.name, test: testCase.name, error: err });
      }
    }
  }

  const durationMs = Date.now() - startTime;
  console.log('\n==================================================');
  console.log('📊  TEST RUNNER SUMMARY REPORT');
  console.log('==================================================');
  console.log(`  Passed:  ${registry.totalPassed}`);
  console.log(`  Failed:  ${registry.totalFailed}`);
  console.log(`  Skipped: ${registry.totalSkipped}`);
  console.log(`  Total:   ${registry.totalPassed + registry.totalFailed + registry.totalSkipped}`);
  console.log(`  Duration: ${(durationMs / 1000).toFixed(2)}s`);

  if (registry.errors.length > 0) {
    console.log('\n❌ FAILING TESTS DETAILS:');
    registry.errors.forEach((e, idx) => {
      console.log(`\n${idx + 1}) [${e.suite}] ${e.test}`);
      console.log(`   ${e.error?.stack || e.error}`);
    });
    console.log('==================================================\n');
    return 1;
  }

  console.log('\n✨ ALL E2E INFRASTRUCTURE TESTS PASSED SUCCESSFULLY! ✨');
  console.log('==================================================\n');
  return 0;
}

// Auto-run if executed directly as main script
const isMain = process.argv[1] && (
  process.argv[1].endsWith('runner.ts') ||
  path.resolve(process.argv[1]) === path.resolve('tests/e2e/runner.ts')
);

if (isMain) {
  runAllTests().then(exitCode => {
    process.exit(exitCode);
  }).catch(err => {
    console.error('Fatal error during E2E test execution:', err);
    process.exit(1);
  });
}

