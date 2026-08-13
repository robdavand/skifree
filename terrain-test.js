// The mountain is supposed to have a shape: open and jump-happy up top, a forest by the time you
// are a couple of kilometres down, and the same shape for every player so leaderboard rows can be
// compared. None of that is visible from reading one frame - it only exists across thousands of
// cells - so it is asserted here rather than eyeballed.
//
//   node terrain-test.js        (no dependencies, nothing to install)
//
// Like storage-test.js, this reads the real script out of index.html and stubs only the DOM around
// it, never the game's own code, so it goes stale the moment index.html does.
const fs=require('fs'), path=require('path');
const js=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').split('<script>')[1].split('</script>')[0];

const ctxStub=()=>new Proxy({},{get:(t,p)=>{
  if(p==='createImageData') return (w,h)=>({data:new Uint8Array(w*h*4)});
  if(p==='measureText')     return ()=>({width:10});
  if(p==='createLinearGradient') return ()=>({addColorStop(){}});
  return ()=>{};
},set:()=>true});
const el=()=>({width:0,height:0,style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},
  addEventListener(){},getContext:ctxStub,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})});

function boot(){
  const store={getItem:()=>null,setItem(){},removeItem(){}};
  const win={devicePixelRatio:1,innerWidth:800,innerHeight:600,localStorage:store,
    addEventListener(){},matchMedia:()=>({matches:false}),requestAnimationFrame(){},
    performance:{now:()=>0},visualViewport:null,AudioContext:function(){}};
  const fn=new Function('window','document','localStorage','requestAnimationFrame','performance',
    'addEventListener','matchMedia','navigator',
    js+`;return {spawnCell,reset,regionAt,getObstacles:()=>obstacles,
                 T_TOP,T_DEEP,T_FULL_AT,T_MAX_DENS,T_KINDS,CELL,PX_PER_M};`);
  return fn(win,{createElement:el,getElementById:el,addEventListener(){}},store,()=>{},
            win.performance,()=>{},win.matchMedia,{maxTouchPoints:0});
}
const api=boot();
const M_PER_CELL=api.CELL/api.PX_PER_M;                 // one cell of depth, in metres
const cyAt=m=>Math.round(m/M_PER_CELL);

// Spawns every cell in a band and reports what grew there. One obstacle per cell at most, so the
// occupied fraction is the density the curve is aiming for.
function sample(a,fromM,toM,halfWidth){
  a.reset();
  let tried=0;
  for(let cy=cyAt(fromM);cy<=cyAt(toM);cy++)
    for(let cx=-halfWidth;cx<=halfWidth;cx++){ a.spawnCell(cx,cy); tried++; }
  const obs=a.getObstacles(), by={};
  for(const o of obs) by[o.type]=(by[o.type]||0)+1;
  return {tried, n:obs.length, dens:obs.length/tried, by,
          share:t=>(by[t]||0)/Math.max(1,obs.length), obs};
}
const pct=x=>(x*100).toFixed(1)+'%';

let fails=0;
const ok=(name,cond,extra)=>{ console.log((cond?'  PASS  ':'  FAIL  ')+name+(cond?'':'   <- '+JSON.stringify(extra))); if(!cond) fails++; };

const top =sample(api,60,400,60);      // just below the start line
const deep=sample(api,2700,3040,60);   // past where the curve tops out
const far =sample(api,20000,20340,60); // absurdly far down

console.log('\n1. the hill gets harder as you descend');
console.log('   near the top:  '+pct(top.dens)+' of cells occupied   ('+top.n+' of '+top.tried+')');
console.log('   deep:          '+pct(deep.dens)+' of cells occupied   ('+deep.n+' of '+deep.tried+')');
ok('deep terrain is denser than the top', deep.dens>top.dens*1.4, {top:top.dens,deep:deep.dens});
ok('the top is genuinely open (under 40%)', top.dens<0.40, top.dens);
ok('deep is genuinely crowded (over 50%)', deep.dens>0.50, deep.dens);

console.log('\n2. and what grows on it changes');
console.log('   trees:  '+pct(top.share('tree'))+' -> '+pct(deep.share('tree')));
console.log('   ramps:  '+pct(top.share('ramp'))+' -> '+pct(deep.share('ramp')));
ok('trees take over with depth', deep.share('tree')>top.share('tree')*1.3, [top.share('tree'),deep.share('tree')]);
ok('ramps get scarce with depth', top.share('ramp')>deep.share('ramp')*2.5, [top.share('ramp'),deep.share('ramp')]);
ok('ramps never vanish entirely', deep.share('ramp')>0.02, deep.share('ramp'));
api.T_KINDS.forEach(t=>{
  ok('  '+t+' appears at both ends', top.share(t)>0&&deep.share(t)>0, [top.share(t),deep.share(t)]);
});

console.log('\n3. the curve tops out instead of running away');
ok('never exceeds the ceiling', far.dens<=api.T_MAX_DENS, far.dens);
ok('20 km down is no worse than 3 km down', Math.abs(far.dens-deep.dens)<0.05, {deep:deep.dens,far:far.dens});

console.log('\n4. regions give it local texture');
{
  api.reset();
  const tally={glade:{n:0,c:0},thicket:{n:0,c:0},open:{n:0,c:0}};
  for(let cy=cyAt(1200);cy<=cyAt(1600);cy++) for(let cx=-60;cx<=60;cx++){
    const r=api.regionAt(cx,cy); tally[r].c++;
  }
  for(let cy=cyAt(1200);cy<=cyAt(1600);cy++) for(let cx=-60;cx<=60;cx++) api.spawnCell(cx,cy);
  for(const o of api.getObstacles()) tally[api.regionAt(Math.floor(o.x/api.CELL),Math.floor(o.y/api.CELL))].n++;
  const d=r=>tally[r].n/Math.max(1,tally[r].c);
  console.log('   glade '+pct(d('glade'))+'   open '+pct(d('open'))+'   thicket '+pct(d('thicket')));
  ok('all three regions occur', tally.glade.c>0&&tally.thicket.c>0&&tally.open.c>0, tally);
  ok('glades are clearly sparser than thickets', d('glade')<d('thicket')*0.5, [d('glade'),d('thicket')]);
  ok('open ground sits between the two', d('glade')<d('open')&&d('open')<d('thicket'), [d('glade'),d('open'),d('thicket')]);
}

console.log('\n5. the same mountain for everyone');
{
  const a=boot(), b=boot();
  const grab=x=>{ const s=sample(x,300,700,25); return s.obs.map(o=>[o.x.toFixed(4),o.y.toFixed(4),o.type,o.v].join(':')); };
  const A=grab(a), B=grab(b);
  ok('two fresh sessions grow identical terrain', A.length>0&&A.join()===B.join(), {a:A.length,b:B.length});
  // a second run in the SAME session must also match: reset() clears the world, not the seed
  const again=grab(a);
  ok('and so does a second run after reset', again.join()===A.join(), {first:A.length,again:again.length});
  ok('the sample was big enough to mean something', A.length>200, A.length);
}

console.log('\n6. the start line is clear');
{
  const s=sample(api,-200,400,20);
  let min=Infinity;
  for(const o of s.obs) min=Math.min(min,Math.hypot(o.x,o.y));
  ok('nothing spawns within 70 units of the gate', min>=70, min);
}

// Two ways of asking "is it harder down there", because the obvious one is misleading. Obstacles
// are small against a screen-wide corridor, so raising density does NOT close the hill off - there
// is always a lane. What it raises is how often you have to commit to one.
function lanes(fromM,toM,corridor){
  api.reset();
  for(let cy=cyAt(fromM);cy<=cyAt(toM);cy++)
    for(let cx=-Math.ceil(corridor/2/api.CELL);cx<=Math.ceil(corridor/2/api.CELL);cx++) api.spawnCell(cx,cy);
  const obs=api.getObstacles().filter(o=>o.type!=='ramp');    // a ramp is a reward, not a wall
  let worst=Infinity;
  for(let y=fromM*api.PX_PER_M;y<toM*api.PX_PER_M;y+=8){
    const blockers=obs.filter(o=>o.y>y-6&&o.y<y+10)
      .map(o=>{ const hw=({tree:4,deadtree:3,rock:5,stump:3}[o.type]||4)+5; return [o.x-hw,o.x+hw]; })
      .sort((a,b)=>a[0]-b[0]);
    let edge=-corridor/2, best=0;
    for(const b of blockers){ if(b[0]>edge) best=Math.max(best,b[0]-edge); edge=Math.max(edge,b[1]); }
    worst=Math.min(worst,Math.max(best,corridor/2-edge));
  }
  return worst;
}
// How many things you must dodge per 100 m if you hold a lane roughly your own width.
function dodges(fromM,toM){
  const s=sample(api,fromM,toM,3);
  const inLane=s.obs.filter(o=>Math.abs(o.x)<30&&o.type!=='ramp').length;
  return inLane/((toM-fromM)/100);
}

console.log('\n7. it never walls you off');
{
  const l=[['start',60,400],['1 km',1000,1400],['3 km',3000,3400],['10 km',10000,10400]]
    .map(d=>[d[0],lanes(d[1],d[2],400)]);
  console.log('   narrowest lane anywhere:  '+l.map(x=>x[0]+' '+x[1].toFixed(0)).join('   '));
  l.forEach(x=>ok('  a skier still fits at '+x[0], x[1]>30, x[1]));
}

console.log('\n8. but you have to work harder for it');
{
  const a=dodges(60,400), b=dodges(3000,3400);
  console.log('   obstacles to dodge per 100 m in your own lane:  '+a.toFixed(1)+' -> '+b.toFixed(1));
  ok('the deep hill demands clearly more of you', b>a*1.4, {top:a,deep:b});
}

console.log(fails?'\n'+fails+' FAILING\n':'\nall green\n');
process.exit(fails?1:0);
