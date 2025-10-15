// Shared test instance - created once by global setup
import { Subscrio } from '../../src/index.js';

let _subscrio: Subscrio | null = null;
let _dbName: string | null = null;

export function setTestInstance(subscrio: Subscrio, dbName: string) {
  _subscrio = subscrio;
  _dbName = dbName;
}

export function getTestInstance(): Subscrio {
  if (!_subscrio) {
    throw new Error('Test instance not initialized. Global setup may have failed.');
  }
  return _subscrio;
}

export function getTestDbName(): string | null {
  return _dbName;
}

