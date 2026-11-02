'use client';
import React from 'react';

// Original simplified movement illustrations for FITPLAN. These are visual cues,
// not a substitute for the step-by-step instructions or linked technique videos.
type Pt=[number,number];
type Kind='stand'|'bench'|'incline'|'squat'|'hinge'|'lunge'|'seated'|'pullup'|'plank'|'floor'|'bridge'|'legpress';
type Arm='down'|'press'|'curl'|'lateral'|'fly'|'front'|'row'|'wide'|'cable'|'hold'|'push'|'reach';
type Gear='bar'|'dumbbell'|'machine'|'cable'|'pullup'|'none'|'ez'|'roller'|'plate';
type Diagram={kind:Kind;arm:Arm;gear:Gear;detail?:string};
const diagrams:Record<string,Diagram>={
 'bench-press':{kind:'bench',arm:'press',gear:'bar'},
 'incline-dumbbell-press':{kind:'incline',arm:'press',gear:'dumbbell'},
 'push-up':{kind:'plank',arm:'push',gear:'none'},
 'machine-chest-press':{kind:'seated',arm:'front',gear:'machine'},
 'cable-fly':{kind:'stand',arm:'fly',gear:'cable'},
 'lat-pulldown':{kind:'seated',arm:'wide',gear:'cable'},
 'bent-over-row':{kind:'hinge',arm:'down',gear:'bar'},
 'seated-row':{kind:'seated',arm:'row',gear:'cable'},
 'pull-up':{kind:'pullup',arm:'wide',gear:'pullup'},
 'single-arm-row':{kind:'hinge',arm:'row',gear:'dumbbell'},
 'back-squat':{kind:'squat',arm:'hold',gear:'bar'},
 'leg-press':{kind:'legpress',arm:'down',gear:'machine'},
 'romanian-deadlift':{kind:'hinge',arm:'down',gear:'bar'},
 'walking-lunge':{kind:'lunge',arm:'down',gear:'dumbbell'},
 'leg-extension':{kind:'seated',arm:'down',gear:'roller',detail:'extension'},
 'seated-leg-curl':{kind:'seated',arm:'down',gear:'roller',detail:'curl'},
 'hip-thrust':{kind:'bridge',arm:'hold',gear:'bar'},
 'overhead-press':{kind:'stand',arm:'press',gear:'bar'},
 'lateral-raise':{kind:'stand',arm:'lateral',gear:'dumbbell'},
 'face-pull':{kind:'stand',arm:'wide',gear:'cable'},
 'arnold-press':{kind:'seated',arm:'press',gear:'dumbbell'},
 'rear-delt-fly':{kind:'hinge',arm:'lateral',gear:'dumbbell'},
 'dumbbell-curl':{kind:'stand',arm:'curl',gear:'dumbbell'},
 'rope-pushdown':{kind:'stand',arm:'down',gear:'cable'},
 'hammer-curl':{kind:'stand',arm:'curl',gear:'dumbbell',detail:'hammer'},
 'skull-crusher':{kind:'bench',arm:'reach',gear:'ez'},
 'plank':{kind:'plank',arm:'hold',gear:'none'},
 'dead-bug':{kind:'floor',arm:'reach',gear:'none',detail:'deadbug'},
 'crunch':{kind:'floor',arm:'hold',gear:'none'},
 'hanging-knee-raise':{kind:'pullup',arm:'wide',gear:'pullup',detail:'knees'}
};
const palette:Record<string,[string,string]>={
 '가슴':['#e9f5dc','#d4e9c2'],'등':['#e3f2ee','#cbe4dc'],'하체':['#f0f0d9','#e3e8bf'],
 '어깨':['#e8f1f7','#d3e5f2'],'팔':['#f1eafa','#dfd1ef'],'코어':['#f8efe4','#f1dbc2']
};
const groups:Record<string,string>={
 'bench-press':'가슴','incline-dumbbell-press':'가슴','push-up':'가슴','machine-chest-press':'가슴','cable-fly':'가슴',
 'lat-pulldown':'등','bent-over-row':'등','seated-row':'등','pull-up':'등','single-arm-row':'등',
 'back-squat':'하체','leg-press':'하체','romanian-deadlift':'하체','walking-lunge':'하체','leg-extension':'하체','seated-leg-curl':'하체','hip-thrust':'하체',
 'overhead-press':'어깨','lateral-raise':'어깨','face-pull':'어깨','arnold-press':'어깨','rear-delt-fly':'어깨',
 'dumbbell-curl':'팔','rope-pushdown':'팔','hammer-curl':'팔','skull-crusher':'팔',
 'plank':'코어','dead-bug':'코어','crunch':'코어','hanging-knee-raise':'코어'
};
const L=(a:Pt,b:Pt,color:string,width:number,key?:string)=><line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>;
const dumbbell=(point:Pt,key:string)=> <g key={key} transform={`translate(${point[0]} ${point[1]}) rotate(-5)`}>
 <path d="M-13 0H13" stroke="#435764" strokeWidth="5" strokeLinecap="round"/>
 <rect x="-16" y="-10" width="8" height="20" rx="3" fill="#2b404f"/><rect x="8" y="-10" width="8" height="20" rx="3" fill="#2b404f"/>
 <path d="M-12 -7V7M12 -7V7" stroke="#8eabb5" strokeWidth="2"/></g>;
type Figure={head:Pt;shoulders:[Pt,Pt];hips:[Pt,Pt];knees:[Pt,Pt];feet:[Pt,Pt];arms:[Pt,Pt,Pt,Pt]};
const basic:Figure={head:[180,54],shoulders:[[160,87],[201,87]],hips:[[170,145],[196,145]],knees:[[163,183],[205,183]],feet:[[151,221],[215,221]],arms:[[151,121],[215,121],[145,152],[222,152]]};
function figureFor(d:Diagram):Figure{
 const copy:Figure={head:[...basic.head],shoulders:basic.shoulders.map(p=>[...p]) as [Pt,Pt],hips:basic.hips.map(p=>[...p]) as [Pt,Pt],knees:basic.knees.map(p=>[...p]) as [Pt,Pt],feet:basic.feet.map(p=>[...p]) as [Pt,Pt],arms:basic.arms.map(p=>[...p]) as [Pt,Pt,Pt,Pt]};
 switch(d.kind){
 case 'bench':
  copy.head=[89,131];copy.shoulders=[[116,130],[128,114]];copy.hips=[[197,129],[207,137]];
  copy.knees=[[248,153],[259,155]];copy.feet=[[242,211],[271,211]];copy.arms=[[138,78],[166,75],[144,46],[184,46]];break;
 case 'incline':
  copy.head=[103,92];copy.shoulders=[[125,113],[143,108]];copy.hips=[[190,151],[206,153]];
  copy.knees=[[242,157],[248,162]];copy.feet=[[238,212],[266,212]];copy.arms=[[130,77],[169,76],[137,40],[188,40]];break;
 case 'squat':
  copy.head=[180,65];copy.shoulders=[[163,94],[200,94]];copy.hips=[[170,149],[193,149]];
  copy.knees=[[136,180],[225,179]];copy.feet=[[111,216],[245,216]];copy.arms=[[154,109],[209,109],[136,98],[229,98]];break;
 case 'hinge':
  copy.head=[130,71];copy.shoulders=[[153,93],[160,110]];copy.hips=[[229,130],[225,145]];
  copy.knees=[[242,177],[199,177]];copy.feet=[[242,219],[191,219]];copy.arms=[[182,135],[199,145],[194,175],[225,175]];break;
 case 'lunge':
  copy.head=[180,54];copy.shoulders=[[160,84],[199,84]];copy.hips=[[173,148],[197,148]];
  copy.knees=[[134,186],[244,180]];copy.feet=[[110,217],[269,218]];copy.arms=[[152,124],[212,124],[147,173],[216,172]];break;
 case 'seated':
  copy.head=[156,64];copy.shoulders=[[138,93],[179,93]];copy.hips=[[146,150],[181,150]];
  copy.knees=[[215,156],[223,163]];copy.feet=[[238,215],[266,215]];copy.arms=[[132,132],[193,131],[136,155],[205,153]];break;
 case 'pullup':
  copy.head=[177,79];copy.shoulders=[[155,109],[199,109]];copy.hips=[[163,173],[194,173]];
  copy.knees=[[167,206],[199,203]];copy.feet=[[154,230],[204,232]];copy.arms=[[134,65],[218,65],[124,29],[230,29]];break;
 case 'plank':
  copy.head=[89,132];copy.shoulders=[[120,133],[130,124]];copy.hips=[[221,136],[224,142]];
  copy.knees=[[260,143],[266,143]];copy.feet=[[317,180],[322,174]];copy.arms=[[119,158],[141,155],[125,186],[146,185]];break;
 case 'floor':
  copy.head=[83,179];copy.shoulders=[[111,170],[126,165]];copy.hips=[[199,166],[200,180]];
  copy.knees=[[238,146],[240,150]];copy.feet=[[270,190],[279,196]];copy.arms=[[127,135],[146,128],[157,112],[168,118]];break;
 case 'bridge':
  copy.head=[92,144];copy.shoulders=[[124,151],[135,138]];copy.hips=[[211,117],[209,133]];
  copy.knees=[[260,150],[260,153]];copy.feet=[[262,215],[282,215]];copy.arms=[[152,131],[167,129],[173,112],[184,114]];break;
 case 'legpress':
  copy.head=[98,140];copy.shoulders=[[113,150],[125,138]];copy.hips=[[178,171],[186,170]];
  copy.knees=[[231,133],[239,133]];copy.feet=[[267,83],[286,89]];copy.arms=[[136,160],[149,160],[151,177],[165,180]];break;
 }
 if(d.kind==='stand'||d.kind==='squat'||d.kind==='seated'){
  if(d.arm==='press') copy.arms=[[144,65],[219,65],[147,26],[215,26]];
  if(d.arm==='curl') copy.arms=[[151,121],[213,121],[146,93],[218,93]];
  if(d.arm==='lateral') copy.arms=[[131,97],[233,97],[101,98],[267,98]];
  if(d.arm==='fly') copy.arms=[[134,104],[225,104],[163,119],[196,119]];
  if(d.arm==='wide') copy.arms=[[125,81],[236,81],[118,51],[247,51]];
  if(d.arm==='row') copy.arms=[[146,128],[204,127],[209,116],[238,119]];
  if(d.arm==='front') copy.arms=[[135,113],[205,111],[233,111],[252,113]];
  if(d.arm==='hold') copy.arms=[[150,106],[215,106],[133,99],[232,99]];
  if(d.arm==='down') copy.arms=[[155,118],[210,118],[157,149],[210,148]];
 }
 if(d.kind==='hinge'){
  if(d.arm==='lateral')copy.arms=[[156,99],[196,106],[119,112],[230,94]];
  if(d.arm==='row')copy.arms=[[177,135],[198,147],[184,116],[228,147]];
 }
 if(d.kind==='bench'&&d.arm==='reach')copy.arms=[[142,85],[159,78],[117,71],[153,54]];
 if(d.kind==='plank'&&d.arm==='push')copy.arms=[[123,146],[144,143],[114,198],[144,198]];
 if(d.kind==='floor'&&d.detail==='deadbug'){copy.knees=[[234,102],[221,110]];copy.feet=[[283,99],[272,159]];copy.arms=[[132,126],[154,122],[161,69],[176,71]];}
 if(d.kind==='pullup'&&d.detail==='knees'){copy.knees=[[207,180],[224,190]];copy.feet=[[221,214],[235,214]];}
 if(d.kind==='seated'&&d.detail==='extension'){copy.knees=[[224,152],[230,158]];copy.feet=[[296,155],[305,165]];}
 if(d.kind==='seated'&&d.detail==='curl'){copy.knees=[[226,157],[235,158]];copy.feet=[[219,204],[231,211]];}
 return copy;
}
function equipment(d:Diagram,f:Figure){
 const x=180;
 const bed=(d.kind==='bench'||d.kind==='incline'||d.kind==='bridge')? <g stroke="#435965" strokeWidth="8" strokeLinecap="round">
  {d.kind==='incline'?<path d="M108 136L202 177"/>:d.kind==='bridge'?<path d="M93 171H146"/>:<path d="M93 154H220"/>}
  <path d="M113 161V217M202 163V217" strokeWidth="6" stroke="#71868e"/>
 </g>:null;
 const chair=(d.kind==='seated'||d.kind==='legpress')?<g stroke="#758b93" strokeWidth="8" strokeLinecap="round"><path d="M122 160H203M129 160V219M195 160V219"/><path d="M122 161L109 104" strokeWidth="7"/></g>:null;
 const rack=d.gear==='pullup'? <g><path d="M94 28H266M103 27V234M257 27V234" stroke="#647e87" strokeWidth="7" strokeLinecap="round"/><path d="M101 32H258" stroke="#2d4652" strokeWidth="9" strokeLinecap="round"/></g>:null;
 const cable=d.gear==='cable'?<g fill="none" stroke="#71838d" strokeLinecap="round"><path d={d.arm==='fly'?'M55 208V29H304V208':'M305 209V27H275'} strokeWidth="7"/><path d={d.arm==='fly'?'M55 39L141 119M305 39L205 119':d.arm==='wide'?'M275 36L116 49M275 36L250 49':'M276 67L210 147'} strokeWidth="2.5" stroke="#a0b2b4"/><rect x={d.arm==='fly'?47:278} y="148" width="13" height="54" rx="4" stroke="none" fill="#9cb2b3"/></g>:null;
 const machine=d.gear==='machine'||d.gear==='roller'?<g fill="none" stroke="#84969b" strokeWidth="7" strokeLinecap="round"><path d={d.kind==='legpress'?'M84 198L296 45M283 37L310 66':'M285 216V52H247'} /><rect x="286" y="115" width="11" height="68" rx="3" stroke="none" fill="#647b84"/></g>:null;
 const floor=(d.kind==='floor'||d.kind==='plank')?<path d="M48 220H325" stroke="#a6b6af" strokeWidth="4" strokeLinecap="round"/>:null;
 return <>{floor}{rack}{cable}{machine}{bed}{chair}</>;
}
function foreground(d:Diagram,f:Figure){
 const hands:[Pt,Pt]=[f.arms[2],f.arms[3]];
 if(d.gear==='bar'||d.gear==='ez'){
  const y=d.kind==='bench'?(d.arm==='reach'?49:46):d.kind==='bridge'?115:d.kind==='squat'?99:d.kind==='hinge'?177:26;
  return <g><path d={d.gear==='ez'?`M${hands[0][0]-36} ${y}h23l8 -4l8 4h23`:`M${Math.min(hands[0][0],hands[1][0])-39} ${y}H${Math.max(hands[0][0],hands[1][0])+39}`} stroke="#334955" strokeWidth="6" strokeLinecap="round"/>
  {[Math.min(hands[0][0],hands[1][0])-26,Math.max(hands[0][0],hands[1][0])+26].map((v,i)=><g key={i}><rect x={v-5} y={y-17} width="10" height="34" rx="4" fill="#334b58"/><rect x={v-2} y={y-13} width="4" height="26" rx="2" fill="#91b5bd"/></g>)}</g>;
 }
 if(d.gear==='dumbbell')return <>{hands.map((p,i)=>dumbbell(p,String(i)))}</>;
 if(d.gear==='roller')return <g><rect x={d.detail==='curl'?216:280} y={d.detail==='curl'?201:143} width="25" height="16" rx="7" fill="#708b94"/></g>;
 return null;
}
export default function ExerciseIllustration({id,className='',label}:{id:string;className?:string;label?:string}){
 const d=diagrams[id]??diagrams['bench-press'],f=figureFor(d),group=groups[id]??'가슴';
 const [light,dark]=palette[group];
 return <svg className={`exercise-illustration ${className}`} viewBox="0 0 360 240" role="img" aria-label={label?`${label} 동작을 단순화한 일러스트`:'운동 동작을 단순화한 일러스트'} xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={light}/><stop offset="1" stopColor={dark}/></linearGradient></defs>
  <rect width="360" height="240" fill={`url(#bg-${id})`}/>
  <circle cx="284" cy="105" r="110" fill="#fff" opacity=".22"/><circle cx="84" cy="214" r="98" fill="#fff" opacity=".15"/>
  <ellipse cx="185" cy="228" rx="111" ry="6" fill="#51745e" opacity=".13"/>
  {equipment(d,f)}
  {L(f.hips[0],f.knees[0],'#263e4d',16,'legA')}{L(f.knees[0],f.feet[0],'#263e4d',13,'shinA')}
  {L(f.hips[1],f.knees[1],'#364e5b',16,'legB')}{L(f.knees[1],f.feet[1],'#364e5b',13,'shinB')}
  <path d={`M ${f.shoulders[0][0]} ${f.shoulders[0][1]} L ${f.shoulders[1][0]} ${f.shoulders[1][1]} L ${f.hips[1][0]} ${f.hips[1][1]} L ${f.hips[0][0]} ${f.hips[0][1]} Z`} fill="#5ca16f" stroke="#376d59" strokeWidth="2" strokeLinejoin="round"/>
  <path d={`M ${f.shoulders[0][0]+4} ${f.shoulders[0][1]+5}L ${f.hips[0][0]+4} ${f.hips[0][1]-4}`} stroke="#a1e5a1" strokeWidth="4" opacity=".65" strokeLinecap="round"/>
  {L(f.shoulders[0],f.arms[0],'#ecb28a',13,'armA1')}{L(f.arms[0],f.arms[2],'#efbb98',11,'armA2')}
  {L(f.shoulders[1],f.arms[1],'#e7a883',13,'armB1')}{L(f.arms[1],f.arms[3],'#efbb98',11,'armB2')}
  <circle cx={f.head[0]} cy={f.head[1]} r="15" fill="#efbb98" stroke="#c7906b" strokeWidth="1.5"/>
  <path d={`M ${f.head[0]-12} ${f.head[1]-5}q7 -16 22 -7`} fill="none" stroke="#263e4d" strokeWidth="6" strokeLinecap="round"/>
  {foreground(d,f)}
  <path d="M24 220h29" stroke="#4d8068" strokeWidth="4" strokeLinecap="round" opacity=".45"/>
 </svg>;
}
