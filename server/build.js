#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('Building admin...');
execSync('npm run build:admin', { stdio: 'inherit' });

console.log('Compiling TypeScript...');
execSync('npx tsc --project tsconfig.server.json', { stdio: 'inherit' });

console.log('Build completed successfully!');
