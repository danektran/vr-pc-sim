// Postava hráče pro diváka: low-poly hlava s brýlemi a dva ovladače s paprskem.
// Používá se jen ve volné kameře; v pohledu očima hráče je hlava skrytá, ovladače zůstávají vidět.
import { COL, cyl, mat, T } from '../helpers.js';

function makeController(){
  const g = new T.Group();
  const body = new T.Group();
  const b1 = cyl(0.016, 0.1, mat(0x2a2f36, {roughness: 0.5}), 0, 0, 0.02, body, 12); b1.rotation.x = Math.PI / 2.6;
  const r1 = new T.Mesh(new T.TorusGeometry(0.04, 0.006, 6, 16), mat(0x3a4049)); r1.position.set(0, 0.035, -0.035); r1.rotation.x = Math.PI / 3; body.add(r1);
  g.add(body);
  const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(0, 0, -1)]);
  const ray = new T.Line(geo, new T.LineBasicMaterial({color: COL.accent, transparent: true, opacity: 0.8}));
  ray.visible = false; g.add(ray);
  g.visible = false;
  return {group: g, ray};
}

function makeHeadModel(){
  const g = new T.Group();
  const m = mat(COL.accent, {roughness: 0.6});
  const skull = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), m); skull.position.set(0, -0.01, 0.045); skull.scale.set(0.95, 1.05, 1.05); g.add(skull);
  const goggles = new T.Mesh(new T.BoxGeometry(0.2, 0.095, 0.1), mat(0x2a2f36, {roughness: 0.4})); goggles.position.set(0, 0, -0.05); g.add(goggles);
  const lens = new T.Mesh(new T.BoxGeometry(0.17, 0.06, 0.012), mat(0x0d1013, {roughness: 0.2})); lens.position.set(0, 0, -0.101); g.add(lens);
  return g;
}

// head: [x,y,z,qx,qy,qz,qw] nebo null; c0, c1: [...7, rayLen] nebo null (mimo XR).
function makePlayerAvatar(){
  const group = new T.Group();
  const head = makeHeadModel(); group.add(head);
  const ctl = [makeController(), makeController()];
  ctl.forEach(c => group.add(c.group));
  group.visible = false;

  function place(o, a){ o.position.set(a[0], a[1], a[2]); o.quaternion.set(a[3], a[4], a[5], a[6]); }
  function setPose(h, c0, c1){
    head.visible = !!h && !api.hideHead;
    if(h){ place(head, h); }
    group.visible = true;
    [c0, c1].forEach((c, i) => {
      const k = ctl[i];
      k.group.visible = !!c;
      if(c){ place(k.group, c); const len = c[7] || 0; k.ray.visible = len > 0; if(len > 0) k.ray.scale.z = len; }
    });
  }
  const api = {group, hideHead: false, setPose};   // hideHead: v pohledu očima hráče je hlava skrytá
  return api;
}

export { makePlayerAvatar };
