// Tlačítka na úvodní kartě pro zapnutí přenosu a pro přechod na stránku diváka.
// Obě jen přenačtou stránku s jiným parametrem v adrese (?prenos=ano, ?divak), ostatní parametry zůstanou.
// Dokud nikdo neklikne, aplikace se chová stejně jako bez tlačítek.
import { $ } from '../helpers.js';
import { PARAMS, RELAY_URL } from '../config.js';
import { H } from '../content.js';

function goWith(change){
  const u = new URL(location.href);
  change(u.searchParams);
  location.href = u.toString();
}

function initStreamButtons(){
  try {
    if(!RELAY_URL) return;   // bez prostředníka přenos nejde, tlačítka se neukážou
    const on = PARAMS.get('prenos') === 'ano';
    const bs = $('btnStream'), bv = $('btnViewer');
    bs.textContent = on ? H.prenos.tlacitko_vypnout : H.prenos.tlacitko_vysilat;
    bs.onclick = ()=>goWith((p)=>{ if(on) p.delete('prenos'); else p.set('prenos', 'ano'); });
    bv.textContent = H.prenos.tlacitko_sledovat;
    bv.onclick = ()=>goWith((p)=>{ p.delete('prenos'); p.set('divak', ''); });
    $('streamBtns').hidden = false;

    const back = $('btnViewerBack');
    back.textContent = H.divak.zpet;
    back.onclick = ()=>goWith((p)=>p.delete('divak'));
    back.hidden = false;
  } catch(err){ console.info('přenos: tlačítka', err); }
}

export { initStreamButtons };
