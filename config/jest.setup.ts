import { config } from 'dotenv';
import path from 'path';

// load environment variables
config({ path: path.join(process.cwd(), '.env') });