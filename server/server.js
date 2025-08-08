
const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const SITE_ROOT = projectRoot;
const DATA_PATH = process.env.DATA_PATH || path.join(SITE_ROOT, 'data', 'videos.json');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(SITE_ROOT, 'assets', 'uploads');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true });
const uploadLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, standardHeaders: true });

app.use('/api', apiLimiter);
app.use(express.json({limit: '5mb'}));

function parseCookies(cookieHeader){
  const out={}; if(!cookieHeader) return out;
  cookieHeader.split(';').forEach(p=>{ const i=p.indexOf('='); if(i>0){ const k=p.slice(0,i).trim(); const v=decodeURIComponent(p.slice(i+1)); out[k]=v; } });
  return out;
}
function adminGate(req,res,next){
  const c = parseCookies(req.headers.cookie||'');
  if(c['admin_session'] && c['admin_session'] === ADMIN_TOKEN){ return next(); }
  if(req.path === '/login.html') return next();
  return res.sendFile(path.join(projectRoot, 'admin', 'login.html'));
}

app.use('/admin', adminGate);
app.use(express.static(SITE_ROOT, { maxAge: '30d', extensions: ['html'] }));
app.use(cors({ origin: false }));

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(()=>{});
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    cb(null, 'thumb-' + ts + ext);
  }
});
const upload = multer({ storage });

function auth(req, res, next){
  if(!ADMIN_TOKEN) return res.status(500).json({error:'ADMIN_TOKEN not set'});
  const hdr = req.headers['authorization'] || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if(token && token === ADMIN_TOKEN) return next();
  return res.status(401).json({error:'Unauthorized'});
}

async function readVideos(){
  try{
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  }catch(e){
    if(e.code === 'ENOENT'){ await fs.mkdir(path.dirname(DATA_PATH), {recursive:true}); await fs.writeFile(DATA_PATH, '[]'); return []; }
    throw e;
  }
}
async function writeVideos(list){
  const tmp = DATA_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(list, null, 2));
  await fs.rename(tmp, DATA_PATH);
}

app.post('/api/login', authLimiter, express.json(), (req,res)=>{
  const token = (req.body && req.body.token) || '';
  if(!ADMIN_TOKEN) return res.status(500).json({error:'ADMIN_TOKEN not set'});
  if(token === ADMIN_TOKEN){
    res.setHeader('Set-Cookie', 'admin_session=' + encodeURIComponent(ADMIN_TOKEN) + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800');
    return res.json({ok:true});
  }
  return res.status(401).json({error:'Invalid token'});
});
app.post('/api/logout', (req,res)=>{
  res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ok:true});
});

app.get('/api/videos', async (req, res) => {
  try{ const list = await readVideos(); const sorted = list.slice().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0) || (b.id||0)-(a.id||0)); res.json(sorted); }
  catch(e){ res.status(500).json({error: 'read failed'}); }
});

app.post('/api/videos', auth, async (req, res) => {
  try{
    const list = await readVideos();
    const nextId = list.length ? Math.max(...list.map(v=>v.id||0))+1 : 1;
    const v = { id: nextId, createdAt: Date.now(), updatedAt: Date.now(), views: 0, ...req.body };
    list.push(v); await writeVideos(list); res.json(v);
  }catch(e){ res.status(500).json({error:'save failed'}); }
});

app.put('/api/videos/:id', auth, async (req, res) => {
  try{
    const id = parseInt(req.params.id, 10);
    const list = await readVideos();
    const idx = list.findIndex(v=>parseInt(v.id,10)===id);
    if(idx<0) return res.status(404).json({error:'not found'});
    list[idx] = { ...list[idx], ...req.body, id, updatedAt: Date.now() };
    await writeVideos(list);
    res.json(list[idx]);
  }catch(e){ res.status(500).json({error:'update failed'}); }
});

app.delete('/api/videos/:id', auth, async (req, res) => {
  try{
    const id = parseInt(req.params.id, 10);
    const list = await readVideos();
    const next = list.filter(v=>parseInt(v.id,10)!==id);
    await writeVideos(next);
    res.json({ok:true});
  }catch(e){ res.status(500).json({error:'delete failed'}); }
});

app.post('/api/upload', auth, uploadLimiter, upload.single('file'), (req, res) => {
  const rel = path.relative(SITE_ROOT, req.file.path).split(path.sep).join('/');
  res.json({ path: '/' + rel });
});

app.post('/api/videos/:id/view', async (req,res)=>{
  try{
    const id = parseInt(req.params.id, 10);
    const list = await readVideos();
    const idx = list.findIndex(v=>parseInt(v.id,10)===id);
    if(idx<0) return res.status(404).json({error:'not found'});
    const v = list[idx];
    v.views = (parseInt(v.views||0,10) || 0) + 1;
    v.lastViewedAt = Date.now();
    list[idx] = v;
    await writeVideos(list);
    res.json({ok:true, views:v.views});
  }catch(e){ res.status(500).json({error:'view failed'}); }
});

app.listen(PORT, () => {
  console.log('Hotmangay18 server running on http://localhost:'+PORT);
});
