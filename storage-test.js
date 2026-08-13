// Everything the game remembers between visits - the leaderboard, your key bindings, your
// character - lives in localStorage, and a typo in a key name or a shape that does not survive
// JSON.parse would silently lose someone's scores. This runs the real script out of index.html
// in node, against a mock localStorage, and checks what it writes and what it reads back.
//
//   node storage-test.js        (no dependencies, nothing to install)
//
// The game's own code is never stubbed or copied - only the DOM around it, just far enough that
// the page will boot headlessly. That means these tests go stale the moment index.html does,
// which is the point of reading it rather than a fixture.
const fs=require('fs'), path=require('path');
const FILE=path.join(__dirname,'index.html');
const js=fs.readFileSync(FILE,'utf8').split('<script>')[1].split('</script>')[0];

function makeStore(seed){
  const m=Object.assign({},seed||{});
  return {map:m,
    getItem:k=>(k in m?m[k]:null),
    setItem:(k,v)=>{ m[k]=String(v); },
    removeItem:k=>{ delete m[k]; }};
}
const ctxStub=()=>new Proxy({},{get:(t,p)=>{
  if(p==='createImageData') return (w,h)=>({data:new Uint8Array(w*h*4)});
  if(p==='measureText')     return ()=>({width:10});
  if(p==='createLinearGradient') return ()=>({addColorStop(){}});
  return ()=>{};
},set:()=>true});
function el(){ return {width:0,height:0,style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
  addEventListener(){},getContext:ctxStub,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})}; }

// Boots the page once against the given storage, and hands back the internals worth poking.
function boot(seed){
  const store=makeStore(seed);
  const win={devicePixelRatio:1,innerWidth:800,innerHeight:600,localStorage:store,
    addEventListener(){},matchMedia:()=>({matches:false}),requestAnimationFrame(){},
    performance:{now:()=>0},visualViewport:null,AudioContext:function(){}};
  const doc={createElement:el,getElementById:el,addEventListener(){}};
  const fn=new Function('window','document','localStorage','requestAnimationFrame','performance',
    'addEventListener','matchMedia','navigator','JSON','Math','Date','Object','Array','String','Number','Set',
    js+`;return {store:null,binds,board,best,equip,record,bindKey,setPreset,setChar,
                 checkBest,checkBestHunt,menuActivate,GAME:window.GAME};`);
  const api=fn(win,doc,store,()=>{},win.performance,()=>{},win.matchMedia,{maxTouchPoints:0},
              JSON,Math,Date,Object,Array,String,Number,Set);
  api.store=store;
  return api;
}

let fails=0;
const ok=(name,cond,extra)=>{ console.log((cond?'  PASS  ':'  FAIL  ')+name+(cond?'':'   <- '+JSON.stringify(extra))); if(!cond) fails++; };

console.log('\n1. cold start, nothing stored');
{
  const a=boot({});
  ok('binds default to arrows', a.binds.left==='arrowleft'&&a.binds.turbo==='f', a.binds);
  ok('board starts empty', a.board.run.length===0&&a.board.hunt.length===0, a.board);
  ok('equip defaults to ski', a.equip==='ski', a.equip);
  ok('nothing written on load', Object.keys(a.store.map).length===0, a.store.map);
}

console.log('\n2. migration from the pre-leaderboard best{}');
{
  const a=boot({skifree_best:JSON.stringify({dist:1234,style:5678,eaten:4})});
  ok('run board seeded from best.dist', a.board.run.length===1&&a.board.run[0].d===1234, a.board.run);
  ok('seeded row carries style', a.board.run[0].s===5678, a.board.run[0]);
  ok('seeded row is dateless', a.board.run[0].t===0, a.board.run[0]);
  ok('hunt board seeded from best.eaten', a.board.hunt.length===1&&a.board.hunt[0].n===4, a.board.hunt);
}

console.log('\n3. a finished run writes, and reloads identically');
{
  const a=boot({});
  a.checkBest(820,1500);            // the yeti got you at 820 m
  a.checkBestHunt(6);               // and a six-skier hunt
  const written=a.store.map;
  ok('board key written', typeof written.skifree_board==='string', Object.keys(written));
  ok('best key written', typeof written.skifree_best==='string', Object.keys(written));
  const b=boot(written);            // fresh page load off exactly what was saved
  ok('run row survives the round trip', b.board.run.length===1&&b.board.run[0].d===820, b.board.run);
  ok('style survives', b.board.run[0].s===1500, b.board.run[0]);
  ok('date survives', b.board.run[0].t>0, b.board.run[0]);
  ok('hunt row survives', b.board.hunt.length===1&&b.board.hunt[0].n===6, b.board.hunt);
  ok('best survives', b.best.dist===820&&b.best.eaten===6, b.best);
  ok('no double-seeding from best on reload', b.board.run.length===1, b.board.run);
}

console.log('\n4. the board sorts and caps at five');
{
  const a=boot({});
  [100,900,400,1500,50,700,1200].forEach((d,i)=>a.checkBest(d,i));
  ok('capped at 5 rows', a.board.run.length===5, a.board.run.length);
  ok('sorted high to low', a.board.run.map(r=>r.d).join()==='1500,1200,900,700,400', a.board.run.map(r=>r.d));
  const b=boot(a.store.map);
  ok('cap and order survive a reload', b.board.run.map(r=>r.d).join()==='1500,1200,900,700,400', b.board.run.map(r=>r.d));
}

console.log('\n5. rebinding writes, and reloads');
{
  const a=boot({});
  a.setPreset('wasd');
  ok('preset written', a.store.map.skifree_keys!=null, a.store.map);
  let b=boot(a.store.map);
  ok('wasd survives reload', b.binds.left==='a'&&b.binds.turbo==='shift', b.binds);
  b.bindKey('turbo',' ');
  ok('single rebind takes', b.binds.turbo===' ', b.binds);
  const c=boot(b.store.map);
  ok('space survives reload', c.binds.turbo===' ', c.binds);
  ok('the rest of wasd is intact', c.binds.left==='a'&&c.binds.down==='s', c.binds);
  // a clash must swap rather than leave an action stranded on nothing
  c.bindKey('right','a');
  ok('clash swaps both ways', c.binds.right==='a'&&c.binds.left==='d', c.binds);
  const d=boot(c.store.map);
  ok('the swap survives reload', d.binds.right==='a'&&d.binds.left==='d', d.binds);
}

console.log('\n6. character choice');
{
  const a=boot({});
  a.setChar('yeti');
  ok('equip written', a.store.map.skifree_equip==='yeti', a.store.map);
  ok('reloads as yeti', boot(a.store.map).equip==='yeti');
  a.setChar('dragon');              // not a character
  ok('junk value rejected', a.store.map.skifree_equip==='yeti', a.store.map);
  ok('junk in storage falls back to ski', boot({skifree_equip:'dragon'}).equip==='ski');
}

console.log('\n7. corrupt storage must not take the page down');
{
  const junk=[{skifree_board:'not json at all'},
              {skifree_board:'null'},
              {skifree_board:'{"run":"nope","hunt":42}'},
              {skifree_keys:'[]'},
              {skifree_keys:'{"left":99,"turbo":null}'},
              {skifree_best:'{{{'},
              {skifree_board:'{"run":[{"d":"abc"}]}'}];
  junk.forEach((j,i)=>{
    let a=null,err=null;
    try{ a=boot(j); }catch(e){ err=e.message; }
    ok('survives corrupt case '+(i+1)+' '+JSON.stringify(j).slice(0,42), !err, err);
    if(a){
      ok('  ...and still has usable binds', typeof a.binds.left==='string'&&a.binds.left.length>0, a.binds);
      ok('  ...and usable board arrays', Array.isArray(a.board.run)&&Array.isArray(a.board.hunt), a.board);
    }
  });
}

console.log('\n8. storage that refuses to work at all (Safari private mode, data: URLs)');
{
  const hostile={map:{},getItem(){ throw new Error('SecurityError: storage disabled'); },
                        setItem(){ throw new Error('SecurityError: storage disabled'); }};
  const win={devicePixelRatio:1,innerWidth:800,innerHeight:600,localStorage:hostile,
    addEventListener(){},matchMedia:()=>({matches:false}),requestAnimationFrame(){},
    performance:{now:()=>0},visualViewport:null,AudioContext:function(){}};
  let a=null,err=null;
  try{
    const fn=new Function('window','document','localStorage','requestAnimationFrame','performance',
      'addEventListener','matchMedia','navigator',
      js+`;return {binds,board,best,equip,checkBest,setPreset,setChar};`);
    a=fn(win,{createElement:el,getElementById:el,addEventListener(){}},hostile,()=>{},win.performance,
         ()=>{},win.matchMedia,{maxTouchPoints:0});
  }catch(e){ err=e.message; }
  ok('the page still boots', !err, err);
  if(a){
    ok('binds usable', a.binds.left==='arrowleft', a.binds);
    let e2=null;
    try{ a.setPreset('wasd'); a.setChar('yeti'); a.checkBest(500,10); }catch(e){ e2=e.message; }
    ok('saving throws nothing at the caller', !e2, e2);
    ok('and the run still counts in memory', a.board.run.length===1&&a.binds.left==='a', [a.board.run,a.binds]);
  }
}

console.log(fails?'\n'+fails+' FAILING\n':'\nall green\n');
process.exit(fails?1:0);
