/**
 * Opt-in FITPLAN real browser QA against deployed app.
 * RUN_LIVE_QA=1 SITE_URL=https://sdy-fitplan.vercel.app node scripts/qa-browser.mjs
 *
 * Requires playwright and @sparticuz/chromium installed locally in the QA
 * runtime. Synthetic QA users created; never run as a production build step.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import chromiumBinary from '@sparticuz/chromium';
import {chromium} from 'playwright';

if(process.env.RUN_LIVE_QA!=='1')throw Error('RUN_LIVE_QA=1 required');
const site=(process.env.SITE_URL||'https://sdy-fitplan.vercel.app').replace(/\/$/,'');
const trace=[];
const errors=[];
const stamp=Date.now().toString(36)+'-'+randomUUID().slice(0,5);
const accounts=[
 {email:'qa-ui-fitplan-a-'+stamp+'@example.com',password:'QA-Browser-'+randomUUID()+'$A'},
 {email:'qa-ui-fitplan-b-'+stamp+'@example.com',password:'QA-Browser-'+randomUUID()+'$B'}
];
const pass=(label)=>{trace.push(label);console.log('PASS',label)};
const b=await chromium.launch({
 executablePath:await chromiumBinary.executablePath(),
 args:chromiumBinary.args,headless:true
});
async function context(viewport={width:1440,height:900}){
 const ctx=await b.newContext({viewport,timezoneId:'Asia/Seoul',locale:'ko-KR'});
 const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 return {ctx,page};
}
async function registerAndLogin(page,person,redirect){
 await page.goto(site+(redirect||'/login'),{waitUntil:'domcontentloaded',timeout:30000});
 if(redirect){
  await page.getByRole('button',{name:'로그인하고 복사하기'}).click();
  await page.waitForURL(/\/login/);
 }
 await page.getByRole('button',{name:'회원가입',exact:true}).click();
 await page.getByLabel('이메일').fill(person.email);
 await page.getByLabel('비밀번호', {exact:true}).fill(person.password);
 await page.getByLabel('비밀번호 확인').fill(person.password);
 await page.getByRole('button',{name:'회원가입하기'}).click();
 await page.getByRole('status').getByText('회원가입이 완료됐습니다.',{exact:false}).waitFor({timeout:20000});
 pass('Browser registration + manual login step');
 await page.getByLabel('비밀번호',{exact:true}).fill(person.password);
 await page.getByRole('button',{name:'로그인하기'}).click();
 await page.waitForURL(/\/(dashboard|share\/)/,{timeout:25000});
 pass('Browser login and authenticated redirect');
}
const A=await context();
const B=await context({width:390,height:844});
try{
 await registerAndLogin(A.page,accounts[0]);
 await A.page.goto(site+'/routines/new');
 await A.page.getByLabel('루틴 이름').fill('QA 브라우저 운동 '+stamp);
 await A.page.getByLabel('루틴 설명 (선택)').fill('QA 2차 검증 - 실제 사용 데이터 아님');
 for(const idx of [1,4,5]){
  await A.page.locator('.weekday-tab').nth(idx).click();
  await A.page.getByRole('button',{name:'운동 추가'}).click();
 }
 await A.page.getByRole('button',{name:'루틴 저장하기'}).click();
 await A.page.waitForURL(/\/routines\/[0-9a-f-]{36}$/,{timeout:25000});
 const routinePath=new URL(A.page.url()).pathname;
 pass('Browser routine create + redirect');
 await A.page.getByRole('button',{name:'이 루틴으로 시작',exact:true}).click();
 await A.page.waitForURL(/\/planner$/,{timeout:25000});
 await A.page.getByText('진행 중',{exact:true}).waitFor();
 pass('Browser activate routine on weekly planner');
 await A.page.getByRole('link',{name:'이번 주만 수정'}).click();
 await A.page.waitForURL(/\/planner\/edit/,{timeout:20000});
 await A.page.locator('.weekday-tab').nth(4).click();
 const before=await A.page.locator('.item-editor').count();
 assert.equal(before,1);
 await A.page.getByRole('button',{name:'운동 추가'}).click();
 assert.equal(await A.page.locator('.item-editor').count(),2);
 await A.page.locator('.item-editor').last().locator('select').selectOption('dumbbell-curl');
 await A.page.getByRole('button',{name:'이번 주 계획 저장하기'}).click();
 await A.page.waitForURL(/\/planner$/,{timeout:25000});
 pass('Browser add exercise for current week only');
 await A.page.goto(site+routinePath);
 await A.page.getByText('목요일 운동').waitFor({timeout:15000});
 const routineItems=await A.page.locator('.workout-summary').filter({hasText:'목요일'}).locator('.list-row').count();
 assert.equal(routineItems,1);
 pass('Base routine remains unchanged after temporary edit');
 await A.page.goto(site+'/planner');
 await A.page.locator('.planner-day').nth(3).click();
 await A.page.getByRole('link',{name:'운동 시작'}).click();
 await A.page.waitForURL(/\/workouts\/new/,{timeout:25000});
 await A.page.locator('.workout-entry').first().waitFor();
 assert.equal(await A.page.locator('.workout-entry').count(),2);
 assert.equal(await A.page.locator('.set-done-check input:checked').count(),0);
 await A.page.locator('.set-done-check input').first().check();
 assert.equal(await A.page.locator('.set-done-check input:checked').count(),1);
 await A.page.getByRole('button',{name:'운동 기록 저장하기'}).click();
 await A.page.waitForURL(/\/planner$/,{timeout:25000});
 await A.page.getByText('일부 완료').first().waitFor({timeout:16000});
 pass('Browser save only checked set; weekly partial completion');
 await A.page.goto(site+'/workouts');
 await A.page.locator('.list-row').first().waitFor({timeout:18000});
 pass('Browser workout appears in history');
 await A.page.goto(site+routinePath);
 await A.page.getByRole('button',{name:'공유 링크 만들기'}).click();
 await A.page.locator('.share-url').waitFor({timeout:15000});
 const shareURL=(await A.page.locator('.share-url').textContent())?.trim();
 assert.ok(shareURL?.startsWith(site+'/share/'),shareURL);
 pass('Create public share link');
 await B.page.goto(shareURL);
 await B.page.getByText('읽기 전용').waitFor({timeout:15000});
 pass('Anonymous browser opens read-only shared routine');
 await registerAndLogin(B.page,accounts[1],new URL(shareURL).pathname);
 await B.page.getByRole('button',{name:'내 루틴으로 복사'}).click();
 await B.page.getByText('내 루틴에 복사했어요!').waitFor({timeout:25000});
 pass('Browser copy shared routine into separate account');
 await B.page.getByRole('link',{name:/운동 추가.*삭제하고 나만의 루틴 만들기/}).click();
 await B.page.waitForURL(/\/routines\/[0-9a-f-]{36}\/edit/,{timeout:25000});
 const clonePath=new URL(B.page.url()).pathname.replace(/\/edit$/,'');
 await B.page.getByLabel('루틴 이름').fill('QA 내 전용 복사본 '+stamp);
 await B.page.locator('.weekday-tab').nth(4).click();
 await B.page.getByRole('button',{name:'운동 추가'}).click();
 await B.page.getByRole('button',{name:'루틴 저장하기'}).click();
 await B.page.waitForURL(/\/routines\/[0-9a-f-]{36}$/,{timeout:25000});
 pass('Browser personalize own copied routine');
 await B.page.goto(site+routinePath);
 await B.page.getByText('루틴을 찾을 수 없어요').waitFor({timeout:15000});
 pass('Other account cannot open private original routine');
 await A.page.goto(site+routinePath);
 await A.page.getByText('QA 브라우저 운동').first().waitFor();
 pass('Original routine unaffected by shared copy editing');
 await B.page.setViewportSize({width:390,height:844});
 await B.page.goto(site+'/planner');
 await B.page.locator('.planner-panel').waitFor({timeout:17000});
 const isHorizontal=await B.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 assert.equal(isHorizontal,false,'Unexpected horizontal scroll on mobile planner');
 pass('Mobile 390px planner no horizontal overflow');
 await A.page.goto(site+'/planner');
 await A.page.screenshot({path:'/tmp/fitplan-qa-desktop.png',fullPage:true});
 await B.page.screenshot({path:'/tmp/fitplan-qa-mobile.png',fullPage:true});
 console.log('QA_BROWSER_RESULT '+JSON.stringify({passed:trace.length,errors,checks:trace}));
 console.log('QA_BROWSER_IDENTITIES '+JSON.stringify(accounts.map(x=>({email:x.email}))));
}catch(e){
 console.error('QA_BROWSER_FAILED',e?.stack||e);
 console.error('QA_PAGE_URL',A.page.url());
 console.error('QA_PAGE_TEXT',(await A.page.locator('body').innerText().catch(()=>'' )).slice(0,1700));
 console.log('QA_BROWSER_IDENTITIES '+JSON.stringify(accounts.map(x=>({email:x.email}))));
 console.log('QA_BROWSER_COMPLETED '+JSON.stringify(trace));
 await A.page.screenshot({path:'/tmp/fitplan-qa-error.png',fullPage:true}).catch(()=>{});
 process.exitCode=1;
}finally{
 await A.ctx.close().catch(()=>{});
 await B.ctx.close().catch(()=>{});
 await b.close().catch(()=>{});
}
