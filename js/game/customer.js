// Zákazník ve hře: low-poly postavička, která přijde k pultu, „mluví“ (pohyb úst, kývání hlavou, gesta),
// po předání opravy zajásá a odejde. Vše generované v kódu, bez modelů a textur.
import { T, box, cyl, mat } from '../helpers.js';
import { scene } from '../scene.js';

// Kde zákazník stojí, odkud přichází a kam se dívá. Stojí naproti studentovi za stolem (mezi stolem a stěnou),
// za skříní mezi panelem a monitorem; přichází zprava podél stěny a odchází doleva (aby se nesrazil s dalším).
const SPOT = new T.Vector3(0.12, 0, -1.1);
const ENTRY = new T.Vector3(2.6, 0, -1.1);
const EXIT = new T.Vector3(-2.6, 0, -1.1);
const LOOK_AT = new T.Vector3(0, 0, 0.25);
const WALK_SPEED = 0.9;   // m/s
const CHEER_TIME = 1.8;   // s

const SKIN = [0xf1c7a5, 0xe0ac85, 0xc68863, 0x8d5a3b, 0xf5d6c0];
const SHIRT = [0x3a6ea5, 0x2f8f5b, 0xb5523b, 0x7a4fa0, 0xd29a2b, 0x2a9d9b, 0x9b3157];
const PANTS = [0x2b3442, 0x3b3f46, 0x4a3b2c, 0x1f2a3a];
const HAIR = [0x2a1d14, 0x5a3a22, 0xa8783e, 0x1a1a1a, 0x8c8c8c, 0x7a2e1c];

const avatars = [];

// Stejné jméno = stejný vzhled (jednoduchý hash ze jména).
function hashName(name){ let h = 2166136261; for(const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

function buildAvatar(name){
  let h = hashName(name);
  const pick = arr => { const v = arr[h % arr.length]; h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; return v; };
  const skinCol = pick(SKIN);
  // trochu vlastního svitu, aby spodní polovina obličeje nebyla ve stínu příliš tmavá
  const skin = mat(skinCol, {emissive:skinCol, emissiveIntensity:0.25}), shirt = mat(pick(SHIRT)), pants = mat(pick(PANTS)), hair = mat(pick(HAIR), {roughness:0.9});
  const longHair = pick([false, true, false]);
  const dark = mat(0x1a1c1f);

  const root = new T.Group();
  const body = new T.Group(); root.add(body);   // poskakuje při chůzi a jásání

  const legs = [-0.07, 0.07].map(x => {
    const hip = new T.Group(); hip.position.set(x, 0.82, 0); body.add(hip);
    box(0.11, 0.78, 0.13, pants, 0, -0.39, 0, hip);
    box(0.12, 0.06, 0.2, dark, 0, -0.79, 0.03, hip);   // bota
    return hip;
  });
  const torso = new T.Mesh(new T.CylinderGeometry(0.2, 0.16, 0.56, 12), shirt);   // trup, mírně zúžený k pasu
  torso.scale.z = 0.62; torso.position.y = 1.1; body.add(torso);
  const arms = [-1, 1].map(s => {
    const sh = new T.Group(); sh.position.set(s*0.215, 1.33, 0); body.add(sh);
    cyl(0.045, 0.52, shirt, 0, -0.26, 0, sh, 10);
    const hand = new T.Mesh(new T.SphereGeometry(0.048, 10, 8), skin); hand.position.y = -0.55; sh.add(hand);
    return sh;
  });
  cyl(0.045, 0.08, skin, 0, 1.41, 0, body, 10);         // krk
  const head = new T.Group(); head.position.set(0, 1.45, 0); body.add(head);
  const skull = new T.Mesh(new T.SphereGeometry(0.11, 16, 12), skin); skull.scale.y = 1.12; skull.position.y = 0.1; head.add(skull);
  const cap = new T.Mesh(new T.SphereGeometry(0.117, 16, 8, 0, Math.PI*2, 0, Math.PI*0.55), hair); cap.position.y = 0.115; cap.rotation.x = -0.25; head.add(cap);
  if(longHair) box(0.2, 0.2, 0.06, hair, 0, 0.04, -0.07, head);
  for(const x of [-0.04, 0.04]){ const e = new T.Mesh(new T.SphereGeometry(0.014, 8, 6), dark); e.position.set(x, 0.12, 0.1); head.add(e); }
  const mouth = box(0.05, 0.012, 0.01, mat(0x5a1e1e), 0, 0.055, 0.108, head);

  return {root, body, legs, arms, head, mouth};
}

function faceTowards(obj, target){ obj.rotation.y = Math.atan2(target.x - obj.position.x, target.z - obj.position.z); }

// Přijde nový zákazník k pultu a pak „mluví“ (talkSecs = jak dlouho, podle délky citace).
function arriveCustomer(name, talkSecs){
  const a = buildAvatar(name);
  a.root.position.copy(ENTRY); faceTowards(a.root, SPOT);
  a.state = 'walkIn'; a.t = 0; a.talk = talkSecs; a.phase = 0;
  scene.add(a.root); avatars.push(a);
}
// Po předání opravy: aktuální zákazník zajásá a odejde.
function cheerAndLeave(){
  const a = avatars.find(x => x.state !== 'cheer' && x.state !== 'walkOut');
  if(a){ a.state = 'cheer'; a.t = 0; }
}
// Okamžitě odstraní všechny zákazníky (návrat na úvod).
function clearCustomers(){ while(avatars.length) removeAvatar(avatars[0]); }

function removeAvatar(a){
  scene.remove(a.root);
  a.root.traverse(m => { if(m.isMesh){ m.geometry.dispose(); m.material.dispose(); } });
  avatars.splice(avatars.indexOf(a), 1);
}

function pose(a, walk, dt){
  // chůze: střídání nohou a rukou, mírné pohupování
  if(walk){ a.phase += dt * 7.5; } else a.phase *= 0.85;
  const s = Math.sin(a.phase) * (walk ? 0.55 : 0);
  a.legs[0].rotation.x = s; a.legs[1].rotation.x = -s;
  a.arms[0].rotation.x = -s * 0.7; a.arms[1].rotation.x = s * 0.7;
  a.arms[0].rotation.z = 0; a.arms[1].rotation.z = 0;
  a.body.position.y = walk ? Math.abs(Math.cos(a.phase)) * 0.025 : 0;
}

function updateTalk(a, t){
  // ústa se otvírají nepravidelně, hlava kývá, pravá ruka gestikuluje
  a.mouth.scale.y = 1 + 3.2 * Math.abs(Math.sin(t * 13) * Math.sin(t * 4.1 + 1));
  a.head.rotation.x = Math.sin(t * 3.1) * 0.07;
  a.head.rotation.y = Math.sin(t * 1.3) * 0.12;
  a.arms[1].rotation.x = -0.5 + Math.sin(t * 2.6) * 0.3;
  a.arms[1].rotation.z = 0.15;
}
function relax(a){ a.mouth.scale.set(1, 1, 1); a.head.rotation.set(0, 0, 0); }

function updateCustomers(dt){
  for(const a of avatars.slice()){
    a.t += dt;
    if(a.state === 'walkIn' || a.state === 'walkOut'){
      const goal = a.state === 'walkIn' ? SPOT : EXIT;
      const d = goal.clone().sub(a.root.position); d.y = 0;
      const step = WALK_SPEED * dt;
      pose(a, true, dt);
      if(d.length() <= step){
        a.root.position.copy(goal);
        if(a.state === 'walkOut'){ removeAvatar(a); continue; }
        a.state = 'talk'; a.t = 0; faceTowards(a.root, LOOK_AT);
      } else { a.root.position.addScaledVector(d.normalize(), step); faceTowards(a.root, goal); }
    } else if(a.state === 'talk'){
      pose(a, false, dt);
      if(a.t < a.talk) updateTalk(a, a.t); else { relax(a); a.state = 'idle'; }
    } else if(a.state === 'idle'){
      pose(a, false, dt);
      a.head.rotation.y = Math.sin(a.t * 0.6) * 0.15;   // občas se rozhlédne
      a.body.position.y = Math.sin(a.t * 1.8) * 0.003;  // dýchání
    } else if(a.state === 'cheer'){
      // dva radostné výskoky s rukama nad hlavou a širokým úsměvem
      const k = Math.min(1, a.t / 0.25);
      a.legs[0].rotation.x = a.legs[1].rotation.x = 0;
      a.arms[0].rotation.set(0, 0, -2.7 * k); a.arms[1].rotation.set(0, 0, 2.7 * k);
      a.body.position.y = Math.abs(Math.sin(a.t * Math.PI * 1.4)) * 0.14;
      a.mouth.scale.set(1.6, 3, 1); a.head.rotation.set(-0.15, 0, 0);
      if(a.t >= CHEER_TIME){ relax(a); a.state = 'walkOut'; a.t = 0; }
    }
  }
}

export { arriveCustomer, cheerAndLeave, clearCustomers, updateCustomers, avatars, SPOT };
