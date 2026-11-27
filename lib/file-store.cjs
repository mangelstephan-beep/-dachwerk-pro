const {randomUUID,createHash}=require('node:crypto');
const CHUNK=524288,MAX=67108864;
const TYPES=new Set(['application/pdf','image/jpeg','image/png','image/webp']);
const failure=(message,status=422)=>Object.assign(Error(message),{status});
function metadata(v) {
 if(!v || !TYPES.has(v.mime) || !Number.isInteger(v.size) || v.size<1 || v.size>MAX || !/^[a-f0-9]{64}$/.test(v.sha256 || '') || typeof v.name!=='string' || !v.name.trim() || v.name.length>240 || /[\x00-\x1f\/\\]/.test(v.name))throw failure('PDF, JPG, PNG oder WebP bis 64 MB mit gültigem Dateinamen erforderlich.');
 return {name:v.name.trim(),mime:v.mime,size:v.size,sha256:v.sha256};
}
function sniff(buffer,mime) {
 if(mime==='application/pdf')return buffer.subarray(0,1024).includes(Buffer.from('%PDF-'));
 if(mime==='image/png')return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(mime==='image/jpeg')return buffer[0]===255&&buffer[1]===216&&buffer[2]===255;
 return buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
}
function fileRepository({query}={}) {
 const sql=query?{query}:require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
 const read=async(actor,id,ready)=>{
  const rows=await sql.query('SELECT * FROM dwp_files WHERE id=$1 AND tenant_id=$2'+(ready?' AND ready=true':''),[id,actor.tenantId]);
  if(!rows[0])throw failure('Datei nicht vorhanden.',404);return rows[0];
 };
 return {
  read,
  async start(actor,record,v) {
   const m=metadata(v),id=randomUUID();
   const quota=await sql.query('SELECT coalesce(sum(size),0)::bigint AS bytes,count(*)::int AS count FROM dwp_files WHERE tenant_id=$1',[actor.tenantId]);
   if(Number(quota[0]?.bytes || 0)+m.size>2147483648)throw failure('Dateiablage erreicht 2 GB. Weitere Kapazität einrichten.',413);
   await sql.query('INSERT INTO dwp_files(id,tenant_id,actor,record_id,project_id,name,mime,size,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,actor.tenantId,actor.id,record.id,record.projectId,m.name,m.mime,m.size,m.sha256]);
   return {fileId:id,chunkSize:CHUNK,parts:Math.ceil(m.size/CHUNK)};
  },
  async put(actor,id,part,data) {
   const f=await read(actor,id);
   if(f.actor!==actor.id||f.ready)throw failure('Upload nicht zugelassen.',403);
   if(!Number.isInteger(part)||part<0||part>=Math.ceil(f.size/CHUNK)||typeof data!=='string'||data.length>Math.ceil(CHUNK/3)*4||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data))throw failure('Dateiteil ungültig.');
   const bytes=Buffer.from(data,'base64'),expected=Math.min(CHUNK,f.size-part*CHUNK);
   if(bytes.length!==expected)throw failure('Dateiteil hat eine falsche Länge.');
   const result=await sql.query("INSERT INTO dwp_file_chunks(file_id,part,data) VALUES($1,$2,decode($3,'base64')) ON CONFLICT(file_id,part) DO UPDATE SET data=dwp_file_chunks.data WHERE dwp_file_chunks.data=EXCLUDED.data RETURNING part",[id,part,data]);
   if(!result.length)throw failure('Bereits hochgeladener Dateiteil stimmt nicht überein.',409);
   return {part};
  },
  async validate(actor,id) {
   const f=await read(actor,id);
   if(f.actor!==actor.id)throw failure('Upload gehört einem anderen Benutzer.',403);
   const result=await sql.query("SELECT count(*)::int AS parts,encode(string_agg(data,''::bytea ORDER BY part),'base64') AS content FROM dwp_file_chunks WHERE file_id=$1",[id]);
   const bytes=Buffer.from(result[0]?.content || '','base64');
   if(result[0]?.parts!==Math.ceil(f.size/CHUNK)||bytes.length!==f.size||createHash('sha256').update(bytes).digest('hex')!==f.sha256||!sniff(bytes,f.mime))throw failure('Datei unvollständig, beschädigt oder nicht im angegebenen Format.');
   return f;
  },
  async ready(actor,id){await sql.query('UPDATE dwp_files SET ready=true WHERE id=$1 AND tenant_id=$2 AND actor=$3',[id,actor.tenantId,actor.id]);},
  async chunk(actor,id,part) {
   const f=await read(actor,id,true);
   if(!Number.isInteger(part)||part<0||part>=Math.ceil(f.size/CHUNK))throw failure('Dateiteil ungültig.');
   const rows=await sql.query("SELECT encode(data,'base64') AS data FROM dwp_file_chunks WHERE file_id=$1 AND part=$2",[id,part]);
   if(!rows[0])throw failure('Dateiteil nicht verfügbar.',503);return {part,data:rows[0].data};
  }
 };
}
module.exports={fileRepository,metadata,sniff,CHUNK,MAX,failure};
