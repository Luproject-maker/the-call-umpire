const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, 'dist');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let name;
  try { name = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}).end(data);});
}).listen(Number(process.env.PORT||4186),'127.0.0.1',function(){
  const url='http://127.0.0.1:'+this.address().port;
  console.log('Local: '+url);
  if(process.argv.includes('--open')){
    const {execFile}=require('node:child_process');
    execFile('cmd.exe',['/c','start','',url],{windowsHide:true},()=>{});
  }
}).on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 4186 is already in use. Open http://127.0.0.1:4186 or close the previous game window.':error.message);process.exitCode=1;});
