import { readFileSync } from 'fs';
import { join } from 'path';

// Single source of truth — reads package.json rather than a
// hand-maintained version string that inevitably goes stale.
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
export const APP_VERSION: string = packageJson.version;