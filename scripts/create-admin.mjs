import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let input='';for await(const chunk of process.stdin)input+=chunk;
const values=JSON.parse(input);
if(!values.email || !values.name || typeof values.password!=='string' || values.password.length<12)throw Error('Provide name, email and password of at least 12 characters through stdin.');
const {getAuth}=require('../lib/auth.cjs');
const auth=await getAuth({provisioning:true});
const result=await auth.api.signUpEmail({body:{name:values.name,email:values.email,password:values.password}});
const {Pool}=require('pg'),pool=new Pool({connectionString:process.env.DATABASE_URL});
try{await pool.query('UPDATE "user" SET role=$1,"tenantId"=$2 WHERE id=$3',['admin',process.env.DWP_TENANT_ID || 'dachwerk',result.user.id]);console.log('Administrator provisioned.');}finally{await pool.end();}
process.exit(0);
