// Zvuky a vibrace ovladačů. Zvuky se generují v kódu (Web Audio), žádné zvukové soubory.
// Vypnutí zvuku: parametr v adrese ?zvuk=ne. Vibrace fungují jen v brýlích (ovladače Questu).
//
// Zjednodušení: pípnutí po zapnutí zazní jen při úspěšném startu (jedno krátké pípnutí = test POST prošel).
// Skutečné desky pípají různě podle výrobce a mnohé reproduktor vůbec nemají; chyby tu ukazují jen LED a monitor.
import { PARAMS } from './config.js';

const SOUND_ON = PARAMS.get('zvuk') !== 'ne';
const VOLUME = 0.5;

let ctx = null, master = null, noiseBuf = null, fan = null;

// Prohlížeč dovolí zvuk až po akci uživatele (klik, stisk spouště), proto se vše vytváří až tady.
function unlock(){
  if(!SOUND_ON) return;
  if(!ctx){
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = VOLUME; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  if(ctx.state === 'suspended') ctx.resume();
}
['pointerdown','keydown','touchstart'].forEach(ev => window.addEventListener(ev, unlock, {capture:true, passive:true}));

const ready = () => ctx && ctx.state === 'running';

// tón: frekvence (Hz), délka (s), hlasitost, tvar vlny, zpoždění (s)
function tone(freq, dur, gain, type='sine', delay=0, freqEnd=null){
  if(!ready()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if(freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
// krátký šum přes pásmový filtr = mechanické cvaknutí
function click(freq, dur, gain, delay=0){
  if(!ready()) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random()*0.5); s.stop(t + dur + 0.02);
}

const sfx = {
  button(){ tone(1600, 0.03, 0.06); },                       // tlačítko na panelu
  grab(){ tone(700, 0.05, 0.08, 'sine', 0, 500); },          // uchopení dílu
  snap(){ click(2400, 0.04, 0.5); tone(150, 0.09, 0.25); },  // díl dosedl na místo
  latch(delay=0){ click(4200, 0.02, 0.45, delay); },        // západka paměti zaklapla
  lever(delay=0){ click(1800, 0.03, 0.4, delay); tone(220, 0.05, 0.12, 'sine', delay); }, // páčka patice
  error(){ tone(190, 0.09, 0.07, 'square'); tone(150, 0.12, 0.07, 'square', 0.12); },  // špatné pořadí
  power(){ click(3000, 0.025, 0.4); },                       // stisk tlačítka napájení
  beep(){ tone(1000, 0.16, 0.05, 'square', 0.6); },          // jedno krátké pípnutí = POST v pořádku
  correct(){ tone(660, 0.1, 0.08); tone(990, 0.16, 0.08, 'sine', 0.09); },
  wrong(){ tone(330, 0.12, 0.07, 'triangle'); tone(247, 0.18, 0.07, 'triangle', 0.1); },
  coin(){ tone(1320, 0.07, 0.06); tone(1760, 0.2, 0.06, 'sine', 0.07); },               // předání a platba
};

// Šum ventilátorů: hlasitost podle toho, jak rychle se točí (0 = stojí, 1 = plné otáčky).
function setFanLevel(level){
  if(!ready()) return;
  if(!fan){
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f).connect(g).connect(master); s.start();
    fan = {g, f};
  }
  const l = Math.max(0, Math.min(1, level));
  fan.g.gain.setTargetAtTime(l * 0.12, ctx.currentTime, 0.1);
  fan.f.frequency.setTargetAtTime(250 + l * 450, ctx.currentTime, 0.1);   // s otáčkami šum „zjasní“
}

// Vibrace ovladače Questu. c = ovladač z interaction.js (jinak se nic nestane, např. myš na počítači).
function haptic(c, intensity, ms){
  const src = c && c.userData && c.userData.input;
  const a = src && src.gamepad && src.gamepad.hapticActuators && src.gamepad.hapticActuators[0];
  if(a && a.pulse) try{ const p = a.pulse(intensity, ms); if(p && p.catch) p.catch(()=>{}); }catch(e){}
}

export { SOUND_ON, unlock, sfx, setFanLevel, haptic };
