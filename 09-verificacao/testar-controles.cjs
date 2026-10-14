const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
async function test(reduced=false,fail=false){
 const nodes={};function node(k){return nodes[k]||(nodes[k]={classes:new Set(),handlers:{},attrs:{},hidden:true,offsetWidth:960,textContent:'',classList:{add(...s){s.forEach(x=>nodes[k].classes.add(x))},remove(...s){s.forEach(x=>nodes[k].classes.delete(x))},contains(s){return nodes[k].classes.has(s)},toggle(s){const z=nodes[k].classes;z.has(s)?z.delete(s):z.add(s);return z.has(s)}},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.handlers[k]=f}})}
 const mq={matches:reduced,addEventListener(k,f){this.change=f}};const imgs=[{decode:()=>fail?Promise.reject(Error('asset')):Promise.resolve()},{decode:()=>Promise.resolve()}];
 const context={document:{querySelector:node,getElementById:node,querySelectorAll:s=>s==='.glass'?imgs:[],body:node('body')},window:{matchMedia:()=>mq},Promise,console};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../08-estudo/portal.js'),'utf8'),context);await new Promise(r=>setImmediate(r));
 const hero=node('.hero'),controls=node('.motion-controls');
 if(fail){assert(!hero.classes.has('animated'));assert(controls.hidden);return}
 assert(hero.classes.has('animated'));assert.equal(controls.hidden,reduced);assert.equal(hero.classes.has('playing'),!reduced);
 node('pause').handlers.click();assert.equal(hero.classes.has('paused'),!reduced);
 node('replay').handlers.click();assert(!hero.classes.has('paused'));assert.equal(node('pause').attrs['aria-pressed'],'false');
 mq.matches=true;mq.change();assert(controls.hidden);assert(!hero.classes.has('playing'));
}
(async()=>{await test();await test(true);await test(false,true);console.log('PASS: play, pause, replay, reduced motion, failed asset fallback. DOM contract tests, not browser rendering.');})().catch(e=>{console.error(e);process.exit(1)});
