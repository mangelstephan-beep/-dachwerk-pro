// Server operator only. No browser can mint its own pairing permission.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {randomBytes,hash}=require('../lib/access-security.cjs');
const {Pool}=require('pg');
let input='';for await(const part of process.stdin)input+=part;
const {slot}=JSON.parse(input);
if(!['iphone','hp-laptop'].includes(slot) || !process.env.DWP_OWNER_USER_ID || !process.env.DWP_TENANT_ID || !process.env.DATABASE_URL)throw Error('Eigentümer, Mandant, Datenbank und Gerät erforderlich.');
const token=randomBytes(32).toString('hex'),pool=new Pool({connectionString:process.env.DATABASE_URL});
try {
 await pool.query('INSERT INTO dwp_device_pairings(token_hash,tenant_id,actor,slot,expires_at) VALUES($1,$2,$3,$4,now()+interval \'10 minutes\')',[hash(token),process.env.DWP_TENANT_ID,process.env.DWP_OWNER_USER_ID,slot]);
 // Deliberate operator-only output; never copy into repo, general audit, or access list.
 process.stdout.write(JSON.stringify({slot,pairingToken:token,expiresInMinutes:10})+'\n');
}finally{await pool.end();}
