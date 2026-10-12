function createHandler(deps={getAuth:require('../lib/auth.cjs').getAuth}) {
  return async function(req,res) {
    res.setHeader('Cache-Control','private, no-store');
    try {
      const {fromNodeHeaders}=await import('better-auth/node');
      const path=req.query?.authPath;
      if(path && !/^[a-zA-Z0-9_\/-]+$/.test(String(path)))return res.status(400).json({error:'Ungültiger Anmeldepfad.'});
      const url=new URL(path?`/api/auth/${path}`:req.url,`${process.env.NODE_ENV==='development'?'http':'https'}://${req.headers.host}`);
      const method=req.method || 'GET';
      const body=['GET','HEAD'].includes(method)?undefined:typeof req.body==='string'?req.body:JSON.stringify(req.body || {});
      const auth=await deps.getAuth();
      const response=await auth.handler(new Request(url,{method,headers:fromNodeHeaders(req.headers),body}));
      for(const [key,value] of response.headers)if(key!=='set-cookie')res.setHeader(key,value);
      const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
      return res.status(response.status).send(await response.text());
    }catch(error) {
      return res.status(error.status || 503).json({error:'Die zentrale Anmeldung ist noch nicht verfügbar.'});
    }
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
