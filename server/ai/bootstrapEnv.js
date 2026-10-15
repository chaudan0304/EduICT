// Resolve local data/settings before modules capture uploads paths at import time.
import { loadEnv } from './envLoader.js';

loadEnv();
