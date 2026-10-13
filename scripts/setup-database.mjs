import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {getAuth}=require('../lib/auth.cjs');
const {getMigrations}=await import('better-auth/db/migration');
const auth=await getAuth();
const migration=await getMigrations(auth.options);
await migration.runMigrations();
const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL});
await pool.query(await fs.readFile(new URL('../migrations/003-file-store.sql',import.meta.url),'utf8'));
try{await pool.query(await fs.readFile(new URL('../migrations/001-project-store.sql',import.meta.url),'utf8'));await pool.query(await fs.readFile(new URL('../migrations/002-access-security.sql',import.meta.url),'utf8'));console.log('Authentication, project and access security schemas created.');}finally{await pool.end();}
process.exit(0);
