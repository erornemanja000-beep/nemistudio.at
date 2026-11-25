// PROBA „Živa tečnost“ (zivi.html): drugi deo ide skrolom (nizovi kadrova tečnosti)
// U pozadini drugog dela su iste senke lišća kao u deo2.js.
(() => {
  const main = document.querySelector('.kalupi');
  if (!main) return;

  const scena = main.querySelector('.z-scena');
  if (scena) {
    const guss = main.querySelector('.z-guss');
    const slike = [...main.querySelectorAll('.z-niz img')];
    const skrol = () => {
      const r = scena.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
      const k = t * (slike.length - 1);
      slike.forEach((s, i) => { s.style.opacity = Math.max(0, Math.min(1, 1 - Math.abs(k - i) * 1.6)); });
      guss.classList.toggle('stoji', t > 0.92);
    };
    addEventListener('scroll', skrol, { passive: true });
    addEventListener('resize', skrol);
    skrol();
  }

  // ---------- Senke lišća (prepisano iz deo2.js) ----------
  const senke = main.querySelector('.tecnost-senke');
  const staza = document.querySelector('.staza-kupole');
  const gs = senke.getContext('webgl', { alpha: false, antialias: false });
  if (!gs) return;
  const VERTEKS = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  const POZADINA = `precision highp float;varying vec2 vUv;uniform vec2 uRes;uniform float uT,uY;
float hes(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float sum(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(hes(i),hes(i+vec2(1,0)),u.x),mix(hes(i+vec2(0,1)),hes(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*sum(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float lisce(vec2 px,float t){
 vec2 p=px/120.;
 p.x-=t*.07;
 vec2 vetar=vec2(fbm(p*.35+vec2(0.,t*.07)),fbm(p*.35+vec2(5.2,1.3)-t*.06));
 p+=(vetar-.5)*1.4;
 float grozd=mix(.5,1.,smoothstep(.38,.62,fbm(p*.45+9.1)));
 float list=fbm(p*2.2)*.7+sum(p*7.)*.3;
 return mix(smoothstep(.44,.64,list),smoothstep(.5,.56,list),.5)*grozd;
}
void main(){gl_FragColor=vec4(mix(vec3(1.),vec3(.86,.84,.9),lisce(vec2(vUv.x*uRes.x,vUv.y*uRes.y+uY),uT)*.54),1.);}`;
  const sejder = (tip, izvor) => { const sh = gs.createShader(tip); gs.shaderSource(sh, izvor); gs.compileShader(sh); return sh; };
  const p = gs.createProgram();
  gs.attachShader(p, sejder(gs.VERTEX_SHADER, VERTEKS));
  gs.attachShader(p, sejder(gs.FRAGMENT_SHADER, POZADINA));
  gs.linkProgram(p);
  gs.useProgram(p);
  gs.bindBuffer(gs.ARRAY_BUFFER, gs.createBuffer());
  gs.bufferData(gs.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gs.STATIC_DRAW);
  const loc = gs.getAttribLocation(p, 'p');
  gs.enableVertexAttribArray(loc);
  gs.vertexAttribPointer(loc, 2, gs.FLOAT, false, 0, 0);
  const u = { res: gs.getUniformLocation(p, 'uRes'), t: gs.getUniformLocation(p, 'uT'), y: gs.getUniformLocation(p, 'uY') };
  let pre = -1, sw = 0, sh = 0;
  function petlja(ms) {
    const t = ms / 1000, mr = main.getBoundingClientRect();
    if (mr.top < innerHeight && mr.bottom > 0 && t - pre >= 1 / 24) {
      pre = t;
      const w2 = Math.round(senke.clientWidth * 0.5), h2 = Math.round(senke.clientHeight * 0.5);
      if (w2 !== sw || h2 !== sh) { senke.width = sw = w2; senke.height = sh = h2; }
      gs.viewport(0, 0, w2, h2);
      gs.uniform2f(u.res, senke.clientWidth, senke.clientHeight);
      gs.uniform1f(u.t, t);
      // šara se nastavlja tačno iz heroja: heroj je na stazi stajao, pa se staza ne računa
      gs.uniform1f(u.y, senke.getBoundingClientRect().top + scrollY - (staza ? staza.offsetHeight : 0));
      gs.drawArrays(gs.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(petlja);
  }
  requestAnimationFrame(petlja);
})();

// Drugi deo ide skrolom: svaki deo ima niz kadrova tečnosti (media/zivi/niz/<snimak>/NNN.jpg), a položaj
// slike na ekranu bira kadar. Nadole se tečnost uliva i gradi reči; nagore se sve vraća istim putem, i tekstovi
// nestaju. Kadar je gotov kad je slika na sredini ekrana (ili koliko se do kraja stranice može). Tekst sa
// data-pri se vidi kad je poslednji snimak dela bar na tom delu (tada je tečnost sagradila njegovu reč ili
// broj); na kraju deo dobije „stoji“. Bez pokreta (reduced motion): odmah poslednji kadar i svi tekstovi.
(() => {
  const smanjen = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  // telefon dobija laku verziju kadrova (manji JPEG), kao i heroj
  const niz = Math.min(innerWidth, innerHeight) < 700 ? 'niz-t' : 'niz';
  const delovi = [...document.querySelectorAll('.z-snimak')].map(f => {
    const klipovi = f.dataset.niz.split(' ').map(s => { const [ime, n] = s.split(':'); return { ime, n: +n }; });
    const putevi = klipovi.flatMap(k => Array.from({ length: k.n }, (_, i) => `media/zivi/${niz}/${k.ime}/${String(i).padStart(3, '0')}.jpg`));
    const platno = f.querySelector('canvas'), zadnji = klipovi[klipovi.length - 1].n;
    return {
      f, jed: f.closest('.jed'), platno, c: platno.getContext('2d'), putevi, N: putevi.length,
      zadnjiOd: putevi.length - zadnji, zadnjiN: zadnji, tekstovi: [...f.closest('.jed').querySelectorAll('[data-pri]')],
      blobovi: [], bitmape: new Map(), dekodira: 0, prikazan: -1, poz: 0, ucitava: false
    };
  });
  if (!delovi.length) return;

  // Kadrovi se preuzimaju tek kad krene topljenje (da ne otimaju heroju): prvi i poslednji odmah, pa redom
  let pocni = false;
  document.addEventListener('nemi:logo', () => { pocni = true; });
  const ucitaj = D => {
    if (D.ucitava) return;
    D.ucitava = true;
    const red = [0, D.N - 1, ...Array.from({ length: D.N - 2 }, (_, i) => i + 1)];
    let s = 0;
    const radnik = async () => {
      while (s < red.length) {
        const i = red[s++];
        try { const r = await fetch(D.putevi[i]); if (r.ok) D.blobovi[i] = await r.blob(); } catch (e) { /* kadar koji ne stigne zameni susedni */ }
      }
    };
    for (let k = 0; k < 4; k++) radnik();
  };
  const uSliku = b => window.createImageBitmap ? createImageBitmap(b) : new Promise((ok, greska) => {
    const s = new Image();
    s.onload = () => { URL.revokeObjectURL(s.src); ok(s); };
    s.onerror = greska;
    s.src = URL.createObjectURL(b);
  });
  // Dekodira se samo oko kadra na ekranu (najviše 4 odjednom, 14 čuvanih po delu: jedan kadar je 3–4 MB u memoriji)
  const dekodiraj = (D, i) => {
    if (i < 0 || i >= D.N || D.bitmape.has(i) || !D.blobovi[i] || D.dekodira >= 4) return;
    D.bitmape.set(i, null);
    D.dekodira++;
    uSliku(D.blobovi[i]).then(b => {
      D.bitmape.delete(i);
      D.bitmape.set(i, b);
      while (D.bitmape.size > 14) {
        const [k, v] = D.bitmape.entries().next().value;
        D.bitmape.delete(k);
        if (k === D.prikazan) { D.bitmape.set(k, v); continue; }
        if (v && v.close) v.close();
      }
    }, () => D.bitmape.delete(i)).finally(() => { D.dekodira--; });
  };
  // deo daleko od ekrana: dekodirani kadrovi se puste (ostaje samo onaj na platnu), da telefon ne ostane bez memorije
  const oslobodi = D => {
    if (D.bitmape.size <= 1) return;
    for (const [k, v] of D.bitmape) {
      if (k === D.prikazan || !v) continue;
      D.bitmape.delete(k);
      if (v.close) v.close();
    }
  };
  const najblizi = (D, k, ima) => {
    for (let d = 0; d < D.N; d++) {
      if (k + d < D.N && ima(k + d)) return k + d;
      if (k - d >= 0 && ima(k - d)) return k - d;
    }
    return -1;
  };

  // 0 kad je gornja ivica slike na 3/4 visine ekrana, 1 kad je slika na sredini ekrana
  function napredak(D) {
    const r = D.f.getBoundingClientRect(), vh = innerHeight;
    const od = vh * 0.75;
    const naKraju = r.top + scrollY - (html.scrollHeight - vh);   // gornja ivica kad se skroluje do dna
    const doo = Math.min(od - 120, Math.max((vh - r.height) / 2, naKraju + 2));
    return Math.max(0, Math.min(1, (od - r.top) / (od - doo)));
  }

  if (location.search.includes('dbg')) window.__niz = () => delovi.map(D => ({ kadar: D.prikazan, N: D.N, ucitano: D.blobovi.filter(Boolean).length, vidi: D.tekstovi.filter(t => t.classList.contains('vidi')).length, stoji: D.jed.classList.contains('stoji') }));

  let prethodno = 0;
  function petlja(ms) {
    const dt = prethodno ? Math.min(0.05, (ms - prethodno) / 1000) : 0.016;
    prethodno = ms;
    if (!pocni && html.classList.contains('otkljucano')) pocni = true;
    for (const D of delovi) {
      if (!pocni) break;
      const r = D.f.getBoundingClientRect();
      // kadrovi dela se preuzimaju tek kad je deo blizu (ne svi delovi odjednom)
      if (r.top < innerHeight * 2) ucitaj(D);
      if (r.bottom < -innerHeight || r.top > innerHeight * 2) { oslobodi(D); continue; }
      const cilj = (smanjen ? 1 : napredak(D)) * (D.N - 1);
      // kadar prati skrol glatko (točkić skače po stotinu piksela), u oba smera
      D.poz += (cilj - D.poz) * (1 - Math.exp(-dt / 0.06));
      if (Math.abs(cilj - D.poz) < 0.05) D.poz = cilj;
      const k = Math.round(D.poz), smer = cilj >= D.poz ? 1 : -1;
      dekodiraj(D, k);
      for (let d = 1; d <= 6; d++) dekodiraj(D, k + smer * d);
      // dok traženi kadar ne stigne, dekodira se i vidi najbliži koji postoji
      if (!D.blobovi[k]) dekodiraj(D, najblizi(D, k, j => !!D.blobovi[j]));
      const izbor = najblizi(D, k, j => !!D.bitmape.get(j));
      if (izbor >= 0 && izbor !== D.prikazan) {
        D.c.drawImage(D.bitmape.get(izbor), 0, 0, D.platno.width, D.platno.height);
        D.prikazan = izbor;
      }
      const pz = (k - D.zadnjiOd) / (D.zadnjiN - 1);
      D.tekstovi.forEach(t => t.classList.toggle('vidi', pz >= +t.dataset.pri));
      D.jed.classList.toggle('stoji', k >= D.N - 2);
    }
    requestAnimationFrame(petlja);
  }
  requestAnimationFrame(petlja);
})();
