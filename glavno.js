// NEMI STUDIO, prvi deo sajta (hero).
// Uvod je kontakt-arak sa modnog snimanja: crne filmske trake uleću preko belog stola, kadrovi
// „okidaju“ jedan za drugim (okret, ruka, lokacije po Beču), lila olovka zaokruži izabrani kadar,
// a on se podigne sa arka ka kameri i postane završni kadar sajta. Posle uvoda ruka prati miš ili
// prst istom brzinom; klik na logo, kad dlan legne na grudi, istopi model u lila tečnost. Pozadina je Contrast
// Motion: senke krošnje sporo klize sleva nadesno preko belog zida (i preko modela).
(() => {
  'use strict';

  // Ruka: mreža pokreta iz pet kratkih snimaka (dlan na grudima, iznad glave, luk desno, levo dole).
  // Svaki kadar je čvor sa položajem šake; veze spajaju susedne kadrove i kadrove skoro iste poze.
  // Šaka klizi po vezama do tačke najbliže pokazivaču. Uvek se vidi jedan ceo snimljeni kadar (bez
  // pretapanja i savijanja), pa je ruka oštra i kad se brzo kreće. Dužine su u širinama kadra.
  const RUKA = {
    kasni: 0.035,     // sekundi: kratko omekšavanje, da se kadrovi smenjuju redom kao u videu
    najbrze: 4,       // najveća brzina šake, u širinama kadra po sekundi
    spusti: 0.35,     // kad pokazivač ode, ruka se mirnije spušta (sekundi)
    spustiNajbrze: 1.4,
    obilazak: 0.12,   // prednost putanji na kojoj je ruka već: u drugi snimak (preko spuštene ruke) prelazi tek kad je pokazivač jasno tamo
    pustiPosle: 0.8,  // sekundi posle podizanja prsta, pa se ruka spušta
    smiri: 0.15,      // sekundi mirnog miša, pa se ruka smiri u oštrom kadru
    smiriKrug: 0.07   // koliko daleko (u kadru) sme da bude oštriji kadar u kom se ruka smiruje
  };
  const LILA = [196 / 255, 169 / 255, 215 / 255];
  // Kontakt-arak, u sekundama od početka uvoda
  const ARAK = {
    zum: 5.2,                 // koliko je kadar na arku manji od nekadašnjeg (užeg) kadra modela
    listKraj: 1.9,            // koliko se arak uveća dok se izabrani kadar podiže ka kameri
    trake: 0.6,               // koliko traje uletanje jedne trake
    snimanjeOd: 0.25, snimanjeDo: 0.85, blesak: 0.18,
    izabrani: 0.95,           // poslednji okidač: izabrani kadar
    lupaOd: 1.05, lupaStaje: 1.75, lupaDo: 2.15,   // lupa pregleda kadrove i zastane na izabranom
    olovkaOd: 2.0, olovkaDo: 2.4,
    uronOd: 2.5, uronDo: 4.1,
    predaja: 0.86             // deo urona posle kog model crta WebGL (i rastu slova)
  };
  // Topljenje posle klika na logo: kadrovi iz AI snimaka (media/topljenje, [kadar | maska] kao kod
  // ruke). Korisnik: „istog trenutka odjednom postane tečnost“, pa pretvaranje u lila „ogrtač“ (kadrovi
  // 0–64) traje samo 0,3 s, a slegne se u baru (64–187) sve sporije, od iste brzine kao na spoju (~210
  // kadrova/s) do brzineBare. Kamera prati tečnost dok bara (dno na 0,964 visine kadra) ne legne na dno
  // ekrana. Na probnoj stranici „Živa tečnost“ (zivi.html) bara posle toga oživi (kadrovi 188–283, AI snimak
  // poravnat na kadar 187): talasa se, niču šiljci, digne se u kupolu i pusti pipke preko donje ivice. Tu
  // više ne ide sat nego skrol (faza „bara“): čim bara legne stranica se otključa, heroj stoji na ekranu dok
  // se skroluje kroz .staza-kupole, a skrol bira kadar; nagore se sve vraća do bare.
  const ZIVA = !!document.querySelector('.zivi');
  const stazaKupole = document.querySelector('.staza-kupole');
  const duzinaStaze = () => stazaKupole ? stazaKupole.offsetHeight : 0;
  const TOPLJENJE = {
    kadrova: ZIVA ? 284 : 188,
    pretvaranje: { do: 64, traje: 0.3 },
    bara: 187, brzinaBare: 30,  // kadrova/s na kraju slivanja
    posleBare: ZIVA ? 0.058 : 0.05,   // sekundi po kadru posle bare (snimak oživljavanja: 96 kadrova ≈ 5,6 s)
    dnoBare: 0.964,
    kameraOd: 60, kameraDo: 175
  };
  const MEKA_IVICA = 0.015;         // širina mekog prelaza na levoj i desnoj ivici kadra modela (pozadina je ionako providna)
  // Sličice u media/arak: 0–17 okret oko modela, 18–28 pokret ruke, 29–37 lokacije i lila zid
  const NIZOVI = [
    Array.from({ length: 18 }, (_, i) => i),
    Array.from({ length: 11 }, (_, i) => 18 + i),
    Array.from({ length: 9 }, (_, i) => 29 + i)
  ];
  const smanjenPokret = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const telo = document.body;
  const hero = document.getElementById('hero');
  const platnoPoz = document.getElementById('pozadina');
  const platnoModel = document.getElementById('model');
  const platnoArak = document.getElementById('arak');
  const platnoOtisak = document.getElementById('otisak');
  const brojac = document.getElementById('procenat');
  const savet = document.querySelector('.savet');
  const poziv = document.querySelector('.poziv');
  // Posle osvežavanja pregledač bi vratio stranicu dole u drugi deo, a tamo se ništa ne dešava dok se
  // model ne istopi (i skrol je zaključan): sajt uvek kreće od heroja
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  // ---------- Jezik ----------
  document.querySelectorAll('[data-jezik]').forEach(dugme => {
    dugme.addEventListener('click', () => {
      const j = dugme.dataset.jezik;
      document.documentElement.lang = j;
      document.querySelectorAll('[data-jezik]').forEach(d => d.setAttribute('aria-pressed', String(d === dugme)));
      document.querySelectorAll('[data-de]').forEach(el => { el.textContent = el.dataset[j]; });
    });
  });

  // ---------- Šejderi ----------
  const VERTEKS = `attribute vec2 p;varying vec2 vUv;
void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;

  const SUM = `
float hes(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float sum(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(hes(i),hes(i+vec2(1,0)),u.x),mix(hes(i+vec2(0,1)),hes(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*sum(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
// Senke krošnje: 1 = senka, 0 = svetlo. Grozdovi lišća klize sleva nadesno i lagano se njišu.
float lisce(vec2 px,float t){
 vec2 p=px/120.;
 p.x-=t*.07;
 vec2 vetar=vec2(fbm(p*.35+vec2(0.,t*.07)),fbm(p*.35+vec2(5.2,1.3)-t*.06));
 p+=(vetar-.5)*1.4;
 // krupni grozdovi krošnje × sitno lišće sa rupama svetla
 float grozd=mix(.5,1.,smoothstep(.38,.62,fbm(p*.45+9.1)));
 float list=fbm(p*2.2)*.7+sum(p*7.)*.3;
 float jezgro=smoothstep(.5,.56,list);
 float polusenka=smoothstep(.44,.64,list);
 return mix(polusenka,jezgro,.5)*grozd;
}`;

  const POZADINA = `precision highp float;varying vec2 vUv;
uniform vec2 uRes;uniform float uT,uSenka;
${SUM}
void main(){
 // Tokom uvoda zid je čisto beo, pa senke ni ne računamo
 if(uSenka<.001){gl_FragColor=vec4(1.);return;}
 vec2 px=vUv*uRes;
 float s=lisce(px,uT);
 vec3 c=mix(vec3(1.),vec3(.86,.84,.9),s*uSenka*.6);
 gl_FragColor=vec4(c,1.);
}`;

  const MODEL = `precision highp float;varying vec2 vUv;
uniform sampler2D uA,uG;uniform float uSnimak,uCeo;uniform vec4 uOkvir;
uniform vec2 uRes;uniform float uDpr;uniform vec4 uRect;uniform vec2 uVelA;
uniform float uT,uSenka;
uniform vec3 uLila;
${SUM}
// Kadar se uvećava bikubično (Catmull-Rom, 9 čitanja uz linearni filter): ivice prstiju, lica i loga ostaju
// oštre i kad je kadar uvećan (telefon), umesto da se razmažu kao kod običnog linearnog uvećanja
vec3 bikubno(sampler2D t,vec2 uv,vec2 vel){
 vec2 p=uv*vel,t1=floor(p-.5)+.5,f=p-t1;
 vec2 w0=f*(-.5+f*(1.-.5*f)),w1=1.+f*f*(-2.5+1.5*f),w2=f*(.5+f*(2.-1.5*f)),w3=f*f*(-.5+.5*f);
 vec2 w12=w1+w2,t0=(t1-1.)/vel,t3=(t1+2.)/vel,t12=(t1+w2/w12)/vel;
 vec3 c=(texture2D(t,vec2(t0.x,t0.y)).rgb*w0.x+texture2D(t,vec2(t12.x,t0.y)).rgb*w12.x+texture2D(t,vec2(t3.x,t0.y)).rgb*w3.x)*w0.y
  +(texture2D(t,vec2(t0.x,t12.y)).rgb*w0.x+texture2D(t,vec2(t12.x,t12.y)).rgb*w12.x+texture2D(t,vec2(t3.x,t12.y)).rgb*w3.x)*w12.y
  +(texture2D(t,vec2(t0.x,t3.y)).rgb*w0.x+texture2D(t,vec2(t12.x,t3.y)).rgb*w12.x+texture2D(t,vec2(t3.x,t3.y)).rgb*w3.x)*w3.y;
 return clamp(c,0.,1.);
}
// Telo, lice i logo su uvek sa oštre glavne slike (uG: slika levo, maska desno). Iz kadra snimka
// uzima se samo deo sa rukom: uA je isečak oko ruke (uOkvir = gde je u kadru), u punoj rezoluciji
// snimka, složen kao [kadar | njegova maska | koliko se uzima iz snimka].
vec4 kadar(vec2 uv){
 uv=clamp(uv,vec2(.002),vec2(.998));
 // Ceo kadar snimka (poravnat, u boji glavne slike, prave oči): [kadar | maska]
 // maska malo stegnuta ka unutra: na ivici bi inače ostao beli zid iz kadra (svetao obrub preko crnih slova)
 if(uCeo>.5)return vec4(bikubno(uA,vec2(uv.x*.5,uv.y),uVelA),smoothstep(.5,.9,texture2D(uA,vec2(.5+uv.x*.5,uv.y)).g));
 vec3 c=texture2D(uG,vec2(uv.x*.5,uv.y)).rgb;
 float m=texture2D(uG,vec2(.5+uv.x*.5,uv.y)).g;
 vec2 o=(uv-uOkvir.xy)/uOkvir.zw;
 if(uSnimak>.5&&o.x>0.&&o.x<1.&&o.y>0.&&o.y<1.){
  o=clamp(o,vec2(.004),vec2(.996));
  float t=texture2D(uA,vec2((2.+o.x)/3.,o.y)).g;
  if(t>.002){
   c=mix(c,texture2D(uA,vec2(o.x/3.,o.y)).rgb,t);
   m=mix(m,texture2D(uA,vec2((1.+o.x)/3.,o.y)).g,t);
  }
 }
 return vec4(c,smoothstep(.3,.7,m));
}
// Snimak je uži od tela: leva i desna ivica kadra se meko utapaju u zid, bez oštre linije
float ivica(float x){return smoothstep(0.,${MEKA_IVICA},x)*(1.-smoothstep(${1 - MEKA_IVICA},1.,x));}
void main(){
 vec2 px=vUv*uRes;
 vec2 uv=(px-uRect.xy)/uRect.zw;
 if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){gl_FragColor=vec4(0.);return;}
 vec4 k=kadar(uv);
 float a=k.a*ivica(uv.x);
 // Iste senke krošnje padaju i preko modela
 vec3 c=k.rgb*(1.-uSenka*.09*lisce(px/uDpr,uT));
 gl_FragColor=vec4(c*a,a);
}`;

  // Arak tokom urona: jednom sačuvana slika araka, samo se uvećava, mutí i bledi (sve na grafičkoj kartici)
  const LIST = `precision highp float;varying vec2 vUv;
uniform sampler2D uOstriji,uMutniji;uniform vec2 uRes,uVel;uniform vec3 uPreslik;uniform float uMesaj,uFilm;
void main(){
 vec2 q=(vUv*uRes-uPreslik.yz)/uPreslik.x/uVel;
 vec3 c=mix(texture2D(uOstriji,q).rgb,texture2D(uMutniji,q).rgb,uMesaj);
 gl_FragColor=vec4(c*uFilm,uFilm);
}`;

  // ---------- WebGL pomoćnici ----------
  function napraviProgram(gl, fragment) {
    // Stariji telefoni nemaju highp u fragment šejderu; tada koristimo mediump
    const visoka = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!visoka || visoka.precision === 0) fragment = fragment.replace('precision highp float;', 'precision mediump float;');
    const senka = (tip, izvor) => {
      const s = gl.createShader(tip);
      gl.shaderSource(s, izvor);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, senka(gl.VERTEX_SHADER, VERTEKS));
    gl.attachShader(p, senka(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    u.program = p;
    return u;
  }

  function napraviTeksturu(gl) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 0]));
    return { t, kljuc: null, koriscen: 0 };
  }

  // ---------- Učitavanje ----------
  const kadroviRuke = [];
  const slicice = [];         // kadrovi sa snimanja za kontakt-arak
  let glavna = null;          // glavna slika u visokoj rezoluciji (slika levo, maska desno)
  let izrezan = null;         // samo model sa glavne slike, bez pozadine (za fotografiju na arku)

  const ime = n => String(n).padStart(3, '0') + '.jpg';
  // dekodiraj = false: slika se samo preuzme; dekodira se tek kad zatreba (kadrovi ruke, kojih je
  // stotine, bi dekodirani zauzeli gigabajte memorije)
  const jednaSlika = (src, dekodiraj = true) => new Promise((ok, greska) => {
    const s = new Image();
    // decode() se ne čeka: u sakrivenom tabu pregledač ga odlaže i učitavanje bi stalo
    s.onload = () => { if (dekodiraj && s.decode) s.decode().catch(() => {}); ok(s); };
    s.onerror = greska;
    s.src = src;
  });
  // Jedan ponovni pokušaj, jer na mobilnoj mreži poneki zahtev zna da pukne
  const ucitajSliku = (src, dekodiraj) => jednaSlika(src, dekodiraj).catch(() => jednaSlika(src + '?ponovo=1', dekodiraj));

  // Uvod treba glavnu sliku i sličice za arak; kadrovi ruke stižu dok uvod traje.
  async function ucitajUvod() {
    const broj = NIZOVI.reduce((n, niz) => n + niz.length, 0);
    let gotovo = 0;
    const javi = s => { gotovo++; brojac.textContent = String(Math.round(gotovo / (broj + 1) * 100)).padStart(2, '0'); return s; };
    const [tekstura] = await Promise.all([
      ucitajSliku('media/glavna-tekstura.jpg').then(javi),
      ...Array.from({ length: broj }, (_, i) =>
        // Sličica koja ne stigne ostaje prazan prozor na filmu; zbog nje sajt ne sme da stane
        ucitajSliku(`media/arak/${String(i).padStart(2, '0')}.jpg`)
          .then(s => window.createImageBitmap ? createImageBitmap(s).catch(() => s) : s)
          .then(s => { slicice[i] = s; }, () => {}).then(javi))
    ]);
    glavna = tekstura;
    izrezan = izreziModel(tekstura);
    if (window.createImageBitmap) izrezan = await createImageBitmap(izrezan).catch(() => izrezan);
    // Svaka slika se nacrta jednom unapred, da prvo pravo crtanje u uvodu ne čeka na nju
    const proba = document.createElement('canvas');
    proba.width = proba.height = 256;
    const pc = proba.getContext('2d');
    for (const sl of [...slicice, izrezan]) if (sl) pc.drawImage(sl, 0, 0, 8, 8);
  }

  // Ista maska kao u šejderu, da fotografija na arku i model u WebGL-u izgledaju potpuno isto
  function izreziModel(tekstura) {
    const w = tekstura.width / 2, h = tekstura.height;
    const pl = document.createElement('canvas');
    pl.width = w;
    pl.height = h;
    const c = pl.getContext('2d', { willReadFrequently: true });
    c.drawImage(tekstura, w, 0, w, h, 0, 0, w, h);
    const maska = c.getImageData(0, 0, w, h).data;
    c.drawImage(tekstura, 0, 0, w, h, 0, 0, w, h);
    const slika = c.getImageData(0, 0, w, h);
    const glatkoIzmedju = (a, b, x) => { const q = Math.min(1, Math.max(0, (x - a) / (b - a))); return q * q * (3 - 2 * q); };
    for (let i = 0; i < maska.length; i += 4) {
      const x = ((i >> 2) % w + 0.5) / w;
      const ivica = glatkoIzmedju(0, MEKA_IVICA, x) * glatkoIzmedju(1, 1 - MEKA_IVICA, x);
      slika.data[i + 3] = 255 * glatkoIzmedju(0.3, 0.7, maska[i + 1] / 255) * ivica;
    }
    c.putImageData(slika, 0, 0);
    return pl;
  }

  // Ako kadrovi ruke ne stignu, sajt ostaje na mirnoj glavnoj slici (i dalje izgleda kako treba)
  let rukaKrenula = false;
  function pokreniRuku() {
    if (rukaKrenula) return;
    rukaKrenula = true;
    ucitajKadrove().catch(greska => console.warn('kadrovi ruke ili topljenja nisu učitani', greska));
  }

  const preuzmi = put => fetch(put).then(r => { if (!r.ok) throw new Error(put); return r.blob(); });
  const telefon = () => Math.min(W, H) < 700;
  // Telefon dobija laku verziju kadrova (manji i lakši JPEG: media/ruka-t, media/topljenje-t), da se sajt
  // pokrene brzo i preko mobilnog interneta; laptop pune (ruka 1080 × 1440).
  // Redosled: mir, dlan na grudima i svaki četvrti kadar svakog snimka (ruka tada već prati prst, malo grublje),
  // pa svi kadrovi topljenja do bare (da topljenje nikad ne čeka). Dok traje ruka: ostatak ruke, pa oživljavanje
  // bare. Kad krene topljenje ruka više ne treba, pa prvo oživljavanje bare (skrol ga čeka), a ostatak ruke tek
  // ako se uvod pusti ponovo (dopuniKadrove). Kadrovi topljenja su u istom nizu posle ruke (od indeksa mreza.n).
  let dopuniKadrove = () => {};
  async function ucitajKadrove() {
    const lako = telefon() ? '-t' : '', n = mreza.n, T = TOPLJENJE;
    const putRuke = i => {
      const [klip, kadar] = mreza.cvorovi[i];
      return i === 0 ? `media/ruka${lako}/mir/000.jpg` : `media/ruka${lako}/${klip}/${ime(kadar)}`;
    };
    const osnovni = [], ostatakRuke = [], kupola = [], vec = new Set();
    const u = (niz, i) => { if (!vec.has(i)) { vec.add(i); niz.push(i); } };
    u(osnovni, 0); u(osnovni, mreza.grudi);
    for (let i = 1; i < n; i += 4) u(osnovni, i);
    const prvi = new Set(osnovni);
    for (let j = 0; j <= T.bara; j++) u(osnovni, n + j);
    for (let i = 1; i < n; i++) u(ostatakRuke, i);
    // kupola na preskok (svaki četvrti, pa poslednji, pa ostali): skrol je odmah grubo pokreće, pa se dopuni
    for (let j = T.bara + 1; j < T.kadrova; j += 4) u(kupola, n + j);
    u(kupola, n + T.kadrova - 1);
    for (let j = T.bara + 1; j < T.kadrova; j++) u(kupola, n + j);
    let sledeci = 0, radnika = 0;
    const sledeciKadar = () => {
      if (sledeci < osnovni.length) return osnovni[sledeci++];
      if (faza === 'uvod' || faza === 'ruka') return ostatakRuke.length ? ostatakRuke.shift() : kupola.shift();
      return kupola.shift();
    };
    const radnik = async () => {
      radnika++;
      for (let i = sledeciKadar(); i !== undefined; i = sledeciKadar()) {
        const put = i < n ? putRuke(i) : `media/topljenje${lako}/${ime(i - n)}`;
        kadroviRuke[i] = await preuzmi(put).catch(() => preuzmi(put + '?ponovo=1')).catch(() => undefined);
        if (prvi.delete(i) && prvi.size === 0) {
          rukaSpremna = true;
          telo.classList.remove('ruka-ceka');
          dekodiraj(0);
        }
      }
      radnika--;
    };
    dopuniKadrove = () => { for (let k = radnika; k < 6; k++) radnik(); };
    await Promise.all(Array.from({ length: 6 }, radnik));
  }

  // Kada počinje svaki kadar topljenja (sekundi od klika): pretvaranje ravnomerno, slijanje sa brzinom
  // koja ravnomerno opada (k = v0·t + (v1 − v0)·t²/2T, ovde obrnuto: t za dati kadar)
  const pocetciTopljenja = (() => {
    const T = TOPLJENJE, a = T.pretvaranje, n = T.bara - a.do;
    const v0 = a.do / a.traje, v1 = T.brzinaBare, slijanje = 2 * n / (v0 + v1), b = (v1 - v0) / (2 * slijanje);
    return Array.from({ length: T.kadrova + 1 }, (_, k) => k <= a.do ? k / a.do * a.traje
      : k <= T.bara ? a.traje + (-v0 + Math.sqrt(Math.max(0, v0 * v0 + 4 * b * (k - a.do)))) / (2 * b)
      : a.traje + slijanje + T.posleBare * (k - T.bara));
  })();
  // Prvi kadrovi topljenja se dekodiraju čim je dlan na logu (ili posetilac hoće dalje), da topljenje
  // krene istog trenutka
  function pripremiTopljenje() {
    if (!mreza || !kadroviRuke[mreza.n]) return;
    for (let k = 0; k <= 20; k++) dekodiraj(mreza.n + kadarTopljenja(k / 60));
  }
  function kadarTopljenja(s) {
    let k = 0;
    while (k < TOPLJENJE.kadrova - 1 && pocetciTopljenja[k + 1] <= s) k++;
    return k;
  }
  const vremeKadra = k => pocetciTopljenja[k];

  // ---------- Mreža pokreta: najkraći putevi i izbor cilja ----------
  // Čvor 0 je oštra glavna slika (mir); ostali su kadrovi snimaka ruke. Dužina veze je koliko šaka
  // pređe, pa je najkraći put ujedno i najmanji pokret ruke.
  const VISINA = 4 / 3;   // kadar je 3:4, pa se uspravna razlika množi da bi rastojanja bila prava
  function pripremiMrezu(m) {
    const n = m.cvorovi.length;
    const x = Float32Array.from(m.cvorovi, c => c[2]), y = Float32Array.from(m.cvorovi, c => c[3]);
    const duz = (a, b) => Math.hypot(x[a] - x[b], (y[a] - y[b]) * VISINA) + 0.002;
    const susedi = Array.from({ length: n }, () => []);
    const veze = [];
    for (const [a, b] of m.veze) {
      if (a === b) continue;
      susedi[a].push(b);
      susedi[b].push(a);
      veze.push([a, b, duz(a, b)]);
    }
    // D[c·n + i]: dužina puta od čvora i do čvora c; K[c·n + i]: kojim susedom se ide ka c (Dijkstra)
    const D = new Float32Array(n * n).fill(Infinity), K = new Int16Array(n * n).fill(-1);
    for (let c = 0; c < n; c++) {
      const d = D.subarray(c * n, c * n + n), k = K.subarray(c * n, c * n + n), gotov = new Uint8Array(n);
      d[c] = 0;
      for (;;) {
        let a = -1;
        for (let i = 0; i < n; i++) if (!gotov[i] && d[i] < Infinity && (a < 0 || d[i] < d[a])) a = i;
        if (a < 0) break;
        gotov[a] = 1;
        for (const b of susedi[a]) {
          const p = d[a] + duz(a, b);
          if (p < d[b]) { d[b] = p; k[b] = a; }
        }
      }
    }
    const sused = susedi.map(s => s[0] ?? 0);
    // oštrina šake u svakom kadru (AI snimak je u brzom pokretu zamućen)
    const ostrina = Float32Array.from(m.cvorovi, c => c[5] ?? 6);
    return { n, cvorovi: m.cvorovi, x, y, veze, D, K, duz, sused, ostrina, logo: m.logo, grudi: m.grudi, ceo: !!m.ceo };
  }

  // Cilj je tačka na vezi a→b (t = deo puta od a); ceo čvor je cilj sa t = 0
  const cvorKaoCilj = i => ({ a: i, b: mreza.sused[i], t: 0, l: mreza.duz(i, mreza.sused[i]) });
  const putDo = (i, c) => mreza.D[c * mreza.n + i];
  const doCilja = (i, C) => Math.min(putDo(i, C.a) + C.t * C.l, putDo(i, C.b) + (1 - C.t) * C.l);

  // Koliko šaka još ima da pređe od trenutnog položaja do cilja
  function preostalo(C) {
    const { a, b, t } = poz;
    if (a === b) return doCilja(a, C);
    const l = mreza.duz(a, b);
    if (a === C.a && b === C.b) return Math.abs(C.t - t) * l;
    if (a === C.b && b === C.a) return Math.abs(1 - C.t - t) * l;
    return Math.min(t * l + doCilja(a, C), (1 - t) * l + doCilja(b, C));
  }

  // Tačka na mreži najbliža pokazivaču (u, v su koordinate u kadru), uz prednost putanji na kojoj
  // je ruka već, da ne skače između dve poze kad je pokazivač podjednako daleko od obe
  function ciljZaTacku(u, v) {
    const { x, y } = mreza;
    let naj = null, min = Infinity;
    for (const [a, b, l] of mreza.veze) {
      const ex = x[b] - x[a], ey = (y[b] - y[a]) * VISINA;
      const px = u - x[a], py = (v - y[a]) * VISINA;
      const t = Math.max(0, Math.min(1, (px * ex + py * ey) / (ex * ex + ey * ey + 1e-9)));
      const blizu = Math.hypot(px - ex * t, py - ey * t);
      if (blizu >= min) continue;
      const C = { a, b, t, l };
      const cena = blizu + RUKA.obilazak * preostalo(C);
      if (cena < min) { min = cena; naj = C; }
    }
    return naj;
  }

  // Najoštriji kadar blizu tačke (u, v), do kog je kratak put; null ako nema boljeg od najbližeg
  function najostrijiBlizu(u, v) {
    const { x, y, ostrina } = mreza;
    let dn = Infinity;
    for (let i = 0; i < mreza.n; i++) dn = Math.min(dn, Math.hypot(x[i] - u, (y[i] - v) * VISINA));
    let naj = null, min = Infinity;
    for (let i = 0; i < mreza.n; i++) {
      const d = Math.hypot(x[i] - u, (y[i] - v) * VISINA);
      if (d > dn + RUKA.smiriKrug) continue;
      const C = cvorKaoCilj(i);
      if (preostalo(C) > 0.25) continue;
      const cena = d * 30 - ostrina[i];
      if (cena < min) { min = cena; naj = i; }
    }
    return naj;
  }

  // Pomera šaku po mreži ka cilju C za dužinu korak
  function idiKa(C, korak) {
    for (let i = 0; i < 400 && korak > 1e-7; i++) {
      let { a, b, t } = poz;
      if (a !== b && t <= 0) { poz.b = b = a; t = 0; }
      if (a !== b && t >= 1) { poz.a = a = b; poz.t = t = 0; }
      if (a !== b) {
        const l = mreza.duz(a, b);
        // Na istoj vezi kao cilj: samo klizi do njega
        const ct = a === C.a && b === C.b ? C.t : a === C.b && b === C.a ? 1 - C.t : -1;
        if (ct >= 0) {
          const razlika = (ct - t) * l;
          poz.t = Math.abs(razlika) <= korak ? ct : t + Math.sign(razlika) * korak / l;
          return;
        }
        // Ako je do cilja kraće nazad, ruka se okrene usred veze
        if (t * l + doCilja(a, C) < (1 - t) * l + doCilja(b, C)) [a, b, t] = [b, a, 1 - t];
        const ostalo = (1 - t) * l;
        if (korak < ostalo) { poz.a = a; poz.b = b; poz.t = t + korak / l; return; }
        korak -= ostalo;
        poz.a = poz.b = b; poz.t = 0;
        continue;
      }
      // U čvoru: ako je cilj na susednoj vezi, stupi na nju i stani na cilju
      if (a === C.a || a === C.b) {
        const ct = a === C.a ? C.t : 1 - C.t;
        poz.b = a === C.a ? C.b : C.a;
        poz.t = Math.min(ct, korak / C.l);
        return;
      }
      // Inače sledeća veza najkraćeg puta
      const ulaz = putDo(a, C.a) + C.t * C.l <= putDo(a, C.b) + (1 - C.t) * C.l ? C.a : C.b;
      const dalje = mreza.K[ulaz * mreza.n + a];
      if (dalje < 0) return;
      const l = mreza.duz(a, dalje);
      if (korak < l) { poz.b = dalje; poz.t = korak / l; return; }
      korak -= l;
      poz.a = poz.b = dalje; poz.t = 0;
    }
  }

  const lerpNiz = (niz, f) => {
    const i = Math.floor(f), j = Math.min(niz.length - 1, i + 1);
    return niz[i] + (niz[j] - niz[i]) * (f - i);
  };

  // ---------- Raspored: završni kadar i kontakt-arak oko izabranog kadra ----------
  let glP, uP, gl, u, uL, c2, c3, slotovi, listTeksture;
  let W = 0, H = 0, dpr = 1, dprM = 1;
  let R = null;      // završni pravougaonik modela
  let arak = null;   // trake, polja i natpisi kontakt-arka (koordinate od središta izabranog kadra)

  // Kadar je širi od osobe (vide se cele ruke). Na računaru je kapuljača pri vrhu, a dole se vidi
  // do stomaka; na telefonu je osoba sa rukama široka skoro koliko ekran.
  function pravougaonik() {
    let w, h, y;
    if (W / H < 0.8) { w = W * 1.6; h = w / 0.75; y = H * 0.3 - h * 0.09; }
    else { h = H / 0.8; w = h * 0.75; y = -0.04 * h; }
    return { x: (W - w) / 2, y, w, h };
  }

  // Uvek isti „slučajni“ brojevi, da arak izgleda isto pri svakom učitavanju
  function nasumicno(seme) {
    return () => {
      seme = (seme + 0x6D2B79F5) | 0;
      let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const mod = (a, n) => ((a % n) + n) % n;

  function rasporedArka() {
    // Kadrovi na arku ostaju veličine kao ranije, merilo je nekadašnji uži kadar modela
    const cw = (W / H < 0.8 ? Math.min(W * 1.18, H * 0.585) : H * 0.7275) / ARAK.zum, ch = cw * 4 / 3;
    const zum = R.w / cw;
    const g = cw * 0.07;          // film između kadrova
    const e = cw * 0.17;          // ivica trake sa natpisima
    const pg = cw * 0.15;         // papir između traka
    const sg = cw * 0.22;         // razmak između dva komada filma u istom redu
    const korakX = cw + g, korakY = ch + 2 * e + pg;
    const Rc = { x: R.x + R.w / 2, y: R.y + R.h / 2 };
    const P0 = { x: Rc.x, y: H / 2 };
    const nc = Math.ceil((W / 2 + Math.abs(P0.x - W / 2)) / (korakX * 0.95)) + 1;
    const nr = Math.ceil((H / 2 + Math.abs(P0.y - H / 2)) / (korakY * 0.95)) + 1;
    const rnd = nasumicno(11);
    const trake = [], polja = [], redovi = [];

    for (let r = -nr; r <= nr; r++) {
      const y = r === 0 ? 0 : r * korakY + (rnd() - 0.5) * pg * 0.5;
      const ox = r === 0 ? 0 : (rnd() - 0.5) * korakX;
      // Film se seče na komade od po 6 kadrova; izabrani kadar je treći u svom komadu
      const pocetak = r === 0 ? -2 : Math.floor(rnd() * 6);
      const granica = c => mod(c - pocetak, 6) === 0;
      const niz = NIZOVI[mod(r + 1, 3)];
      const pomak = Math.floor(rnd() * niz.length);
      const xs = { 0: ox };
      for (let c = 1; c <= nc; c++) xs[c] = xs[c - 1] + korakX + (granica(c) ? sg : 0);
      for (let c = -1; c >= -nc; c--) xs[c] = xs[c + 1] - korakX - (granica(c + 1) ? sg : 0);
      redovi.push({ r, smer: mod(r, 2) ? 1 : -1, kasni: 0.035 * Math.abs(r) + (r < 0 ? 0.02 : 0) });
      const red = redovi.length - 1;

      let komad = null, broj = 0;
      for (let c = -nc; c <= nc; c++) {
        if (!komad || granica(c)) {
          komad = { red, x0: xs[c] - cw / 2 - g, x1: 0, y, h: ch + 2 * e };
          trake.push(komad);
          broj = 1 + Math.floor(rnd() * 28);
        }
        komad.x1 = xs[c] + cw / 2 + g;
        polja.push({
          red, x: xs[c], y,
          slika: r === 0 && c === 0 ? -1 : niz[mod(c + pomak, niz.length)],
          broj: broj++, izabrano: r === 0 && c === 0, snimak: ARAK.snimanjeOd
        });
      }
    }

    // Redosled okidanja: kao na pravom snimanju, red po red, sleva nadesno (samo ono što se vidi)
    const vidljiva = polja.filter(p => !p.izabrano &&
      Math.abs(P0.x + p.x - W / 2) < W / 2 + cw && Math.abs(P0.y + p.y - H / 2) < H / 2 + ch);
    vidljiva.sort((a, b) => a.y - b.y || a.x - b.x);
    vidljiva.forEach((p, i) => {
      p.snimak = ARAK.snimanjeOd + (ARAK.snimanjeDo - ARAK.snimanjeOd) * i / Math.max(1, vidljiva.length - 1);
    });
    const izabrano = polja.find(p => p.izabrano);
    izabrano.snimak = ARAK.izabrani;

    // Lila olovka: ručno povučen krug oko izabranog kadra, malo preko početka
    const olovka = [];
    for (let i = 0; i <= 140; i++) {
      const q = i / 140, fi = -2.1 + q * Math.PI * 2 * 1.12;
      const rr = 1 + 0.035 * Math.sin(3 * fi + 1.3) + 0.02 * Math.sin(5 * fi + 0.4) + 0.08 * q;
      const ex = Math.cos(fi) * cw * 0.78 * rr, ey = Math.sin(fi) * ch * 0.66 * rr;
      olovka.push([ex * Math.cos(-0.14) - ey * Math.sin(-0.14) + cw * 0.03, ex * Math.sin(-0.14) + ey * Math.cos(-0.14) - ch * 0.02]);
    }

    // Put lupe: od kadra gore levo, preko gornjeg reda, do lica na izabranom kadru
    const putLupe = [[-2.1 * korakX, -1.05 * korakY], [-0.5 * korakX, -1.5 * korakY], [1.0 * korakX, -0.55 * korakY], [0, -ch * 0.3]];

    arak = { cw, ch, zum, g, e, trake, polja, redovi, izabrano, olovka, putLupe, P0, Rc };
    snimakArka = null;
  }

  function raspored() {
    R = pravougaonik();
    rasporedArka();
    // Gde bara legne posle topljenja. Dugme heroja se pri topljenju skloni, pa na telefonu bara legne na samo
    // dno: donja ivica kadra je tačno na dnu heroja, da se nit iz kupole nastavi pravo u drugi deo
    const m = Math.min(1, W * 0.94 / (R.w * 0.96));
    dnoTopljenja = telefon() ? H - (1 - TOPLJENJE.dnoBare) * R.h * m : H * 0.975;
  }

  function velicina() {
    W = hero.clientWidth;
    H = hero.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Model se crta u punoj oštrini ekrana i na laptopu i na telefonu (kadrovi ruke su 1080 × 1440): u
    // manjoj bi se zamutio dvaput, pa bi ruka u pokretu bila mekša od mirne slike
    dprM = dpr;
    platnoModel.width = Math.round(W * dprM);
    platnoModel.height = Math.round(H * dprM);
    platnoArak.width = platnoOtisak.width = Math.round(W * dpr);
    platnoArak.height = platnoOtisak.height = Math.round(H * dpr);
    // Pozadina je mekana, pa je crtamo u pola rezolucije
    platnoPoz.width = Math.round(W * 0.5);
    platnoPoz.height = Math.round(H * 0.5);
    raspored();
    // Stari položaj miša više ne važi za novu veličinu; ruka čeka sledeći pokret
    pokazivac = null;
    // Promena veličine briše platna (pozadina bez providnosti postane crna), pa se oba crtaju ODMAH, a ne tek
    // u sledećem krugu: kad se posle topljenja pojavi traka za skrol, heroj se suzi i inače bi blesnulo crno
    pozadinaU = modelU = -1e9;
    senkaNacrtana = -1;
    if (faza !== 'ucitavanje') { bezPetlje = true; petlja(performance.now()); bezPetlje = false; }
  }

  // Kadrovi na putu ka cilju se dekodiraju unapred (van glavne niti), pa slanje na grafičku karticu ne
  // trza; čuva se ograničen broj, najstariji se oslobađa
  // Kadrovi ruke se čuvaju kao preuzeti JPEG (mali), a dekodiraju se van glavne niti tek kad im ruka
  // ide u susret; najviše 6 odjednom, da se dekodiranje ne nagomila. Dekodirani kadrovi se čuvaju
  // ograničeno, najstariji se oslobađa.
  const bitmape = new Map();
  // kadrovi ruke su 1080 × 1440 (12 MB dekodirani), pa se čuva malo manje nego ranije, da telefon ne ostane bez memorije
  const najviseBitmapa = () => telefon() ? 16 : 36;
  let dekodiraSe = 0;
  function dekodiraj(i) {
    if (bitmape.has(i) || !kadroviRuke[i] || dekodiraSe >= 6) return;
    bitmape.set(i, null);
    dekodiraSe++;
    // Stariji pregledači bez createImageBitmap: obična slika iz Blob-a, dekodirana unapred
    const dekoder = window.createImageBitmap ? createImageBitmap(kadroviRuke[i]) : new Promise((ok, greska) => {
      const s = new Image();
      s.onload = () => { URL.revokeObjectURL(s.src); (s.decode ? s.decode() : Promise.resolve()).then(() => ok(s), () => ok(s)); };
      s.onerror = greska;
      s.src = URL.createObjectURL(kadroviRuke[i]);
    });
    dekoder.then(b => {
      bitmape.delete(i);
      bitmape.set(i, b);
      while (bitmape.size > najviseBitmapa()) {
        const [k, v] = bitmape.entries().next().value;
        if (k === prikazano) { bitmape.delete(k); bitmape.set(k, v); continue; }
        bitmape.delete(k);
        if (v && v.close) v.close();
      }
    }, () => bitmape.delete(i)).finally(() => { dekodiraSe--; });
  }
  function unapred(C) {
    // trenutni čvor, pa najkraćim putem ka cilju; već dekodirani kadrovi na putu se osvežavaju, da ih
    // ne izbaci neki kadar van puta (put je kraći od ograničenja, pa se uvek izbacuje nešto sa strane)
    let i = poz.t < 0.5 ? poz.a : poz.b;
    const cilj = C.t < 0.5 ? C.a : C.b;
    for (let k = 0; k < Math.min(30, najviseBitmapa() - 6) && i >= 0; k++) {
      const b = bitmape.get(i);
      if (b) { bitmape.delete(i); bitmape.set(i, b); } else dekodiraj(i);
      if (i === cilj) break;
      i = mreza.K[cilj * mreza.n + i];
    }
  }

  // Na grafičkoj kartici ostaje nekoliko poslednjih kadrova snimka, pa se pri pokretu napred-nazad
  // ne šalju ponovo; novi kadar zauzme mesto onog koji najduže nije korišćen. Glavna slika ima svoju
  // stalnu teksturu na jedinici 1.
  let koriscenje = 0;
  function vezi(kljuc, slika) {
    gl.activeTexture(gl.TEXTURE0);
    let s = slotovi.find(x => x.kljuc === kljuc);
    if (!s) {
      s = slotovi.reduce((m, x) => x.koriscen < m.koriscen ? x : m);
      gl.bindTexture(gl.TEXTURE_2D, s.t);
      // RGB je četvrtina manje podataka od RGBA (providnost je u maski, ne u kanalu)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, slika);
      s.kljuc = kljuc;
    }
    s.koriscen = ++koriscenje;
    gl.bindTexture(gl.TEXTURE_2D, s.t);
  }

  // ---------- Stanje ----------
  let mreza = null, rukaSpremna = false;
  const poz = { a: 0, b: 0, t: 0 };   // šaka je na vezi a→b, deo puta t (u čvoru je a === b)
  let nadjeno = false;                // dlan je na logu i pokazivač je na njemu
  let faza = 'ucitavanje', pocetakFaze = 0, prethodno = 0;
  let senka = 0;
  let topSat = 0, topKadar = 0;       // vreme topljenja (stoji dok sledeći kadar nije dekodiran) i kadar na ekranu
  let kupola = 0;                     // faza „bara“: kadar koji skrol traži, glatko (sa decimalama)
  let dnoTopljenja = 0;               // gde je dno bare na ekranu kad se topljenje završi
  let zeliTopljenje = false;          // posetilac hoće dalje (skrol, meni, dugme): dlan na grudi, pa topljenje
  let ciljSkrola = null;              // sekcija u koju se ide posle topljenja (iz menija ili dugmeta)
  let otkljucano = false;             // model je istopljen i stranica se skroluje
  let pozadinaU = -1e9, senkaNacrtana = -1, modelU = -1e9, nacrtanoStanje = null;   // šta je poslednje nacrtano
  let pokazivac = null, pustenoU = null, prviPokret = null;
  let prikazano = 0, smenaU = -1e9;   // kadar ruke koji je sada na ekranu i kada je postavljen
  let pokretU = -1e9, smirenCilj = null;   // poslednji pokret miša; kadar u kom se ruka smiruje

  function promeniFazu(nova, t) { faza = nova; pocetakFaze = t; }

  // Jedva primetno „disanje“ kadra
  function disanje(t) {
    const zum = 1 + 0.004 * Math.sin(t * 1.2);
    return { x: R.x - R.w * (zum - 1) / 2, y: R.y - R.h * (zum - 1), w: R.w * zum, h: R.h * zum };
  }

  function zapocniTopljenje(t) {
    promeniFazu('topljenje', t);
    telo.classList.add('topi');
    zeliTopljenje = false;
    topSat = 0; topKadar = 0;
    nadjeno = false;
    hero.style.cursor = '';
    savet.classList.add('sakrij');
    document.dispatchEvent(new CustomEvent('nemi:logo'));
  }

  const izlaz = p => 1 - Math.pow(1 - p, 3);
  const izlazJako = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
  const glatko = p => p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2;
  const deo = (x, od, do_) => Math.max(0, Math.min(1, (x - od) / (do_ - od)));

  // ?sporo u adresi usporava sve 4 puta, a ?kadar=1.5 zaustavlja uvod u tom trenutku (za proveru)
  const parametri = new URLSearchParams(location.search);
  const BRZINA = parametri.has('sporo') ? 0.25 : 1;
  const STANI = parametri.has('kadar') ? parseFloat(parametri.get('kadar')) : null;
  // ?topi pušta topljenje odmah (bez uvoda), a ?topi=0.4 ga zaustavi u tom trenutku (za proveru);
  // posle se trenutak menja kroz #0.6 u adresi
  let TOPI = parametri.has('topi') ? parseFloat(parametri.get('topi')) : null;
  if (TOPI !== null) addEventListener('hashchange', () => { TOPI = parseFloat(location.hash.slice(1)); });
  const sad = () => performance.now() / 1000 * BRZINA;

  // Kamera nad arkom u trenutku t: arak se blago primiče i ispravlja, pa se izabrani kadar podiže
  function kameraArka(t) {
    const A = arak;
    const pU = deo(t, ARAK.uronOd, ARAK.uronDo);
    const eU = glatko(pU);
    const prilaz = izlaz(deo(t, 0, ARAK.uronOd));
    const baza = 0.965 + 0.035 * prilaz;
    const nagib = (-1.8 + 1.1 * prilaz) * Math.PI / 180;
    // Kadar se ispravi i podigne (uz mali trzaj ruke) pre nego što ga preuzme WebGL
    const podizanje = Math.min(1, pU / 0.75);
    return {
      pU, podizanje,
      x: A.P0.x + (A.Rc.x - A.P0.x) * eU,
      y: A.P0.y + (A.Rc.y - A.P0.y) * eU,
      sL: baza * Math.pow(ARAK.listKraj, eU),
      sP: baza * Math.pow(A.zum, eU),
      nagib,
      nagibP: nagib * (1 - glatko(podizanje)) + 0.022 * Math.sin(Math.PI * podizanje),
      film: 1 - glatko(deo(pU, 0.3, 0.78)),
      // Arak ispod fotografije izlazi iz fokusa, kao kod prave kamere (0 oštro, 1 sasvim mutno)
      fokus: glatko(deo(pU, 0.04, 0.6)),
      senkaP: Math.sin(Math.PI * Math.min(1, pU / ARAK.predaja))
    };
  }

  // Ista kamera, ali uvećana oko tačke L (pogled kroz lupu)
  const krozLupu = (k, L, m) => ({ ...k, x: L.x + (k.x - L.x) * m, y: L.y + (k.y - L.y) * m, sL: k.sL * m, sP: k.sP * m });

  // Lupa se spusti na arak, pređe preko nekoliko kadrova, zastane na licu izabranog i digne se
  function lupa(t, k) {
    if (t <= ARAK.lupaOd || t >= ARAK.lupaDo) return null;
    const A = arak;
    const spustena = izlaz(deo(t, ARAK.lupaOd, ARAK.lupaOd + 0.2));
    const dignuta = glatko(deo(t, ARAK.lupaDo - 0.24, ARAK.lupaDo));
    const p = glatko(deo(t, ARAK.lupaOd + 0.04, ARAK.lupaStaje));
    const [a, b, c, d] = A.putLupe, q = 1 - p;
    const bez = i => q * q * q * a[i] + 3 * q * q * p * b[i] + 3 * q * p * p * c[i] + p * p * p * d[i];
    const x = bez(0), y = bez(1);
    const cs = Math.cos(k.nagib) * k.sL, sn = Math.sin(k.nagib) * k.sL;
    return {
      x: k.x + cs * x - sn * y, y: k.y + sn * x + cs * y,
      r: A.cw * 0.68 * k.sL * (1 + 0.22 * (1 - spustena) + 0.18 * dignuta),
      vid: spustena * (1 - dignuta)
    };
  }

  // Za uron se arak jednom „fotografiše“ (oštro i dve mutne verzije) i pošalje grafičkoj kartici;
  // tokom urona WebGL ga samo uvećava, mutí i bledi
  let snimakArka = null;
  const platnaSnimka = [];
  function napraviSnimakArka(k, t) {
    const w = platnoArak.width, h = platnoArak.height;
    if (!platnaSnimka.length) for (let i = 0; i < 5; i++) platnaSnimka.push(document.createElement('canvas'));
    platnaSnimka.forEach((pl, i) => {
      const pw = Math.max(1, w >> i), ph = Math.max(1, h >> i);
      if (pl.width !== pw || pl.height !== ph) { pl.width = pw; pl.height = ph; }
    });
    const o = platnaSnimka[0].getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.globalAlpha = 1;
    o.fillStyle = '#fff';
    o.fillRect(0, 0, w, h);
    o.imageSmoothingQuality = 'high';
    crtajList(o, k, t);
    // Uzastopno prepolovljavanje daje meko zamućenje bez skupih filtera
    for (let i = 1; i < 5; i++) {
      const mc = platnaSnimka[i].getContext('2d');
      mc.drawImage(platnaSnimka[i - 1], 0, 0, platnaSnimka[i].width, platnaSnimka[i].height);
    }
    [platnaSnimka[0], platnaSnimka[2], platnaSnimka[4]].forEach((pl, i) => {
      gl.activeTexture(gl.TEXTURE2 + i);
      gl.bindTexture(gl.TEXTURE_2D, listTeksture[i].t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pl);
    });
    snimakArka = { x: k.x, y: k.y, s: k.sL, w, h };
  }

  // Meka senka fotografije, nacrtana jednom (senka uživo je skupa na velikoj površini)
  let senkaFoto = null;
  function napraviSenku() {
    const pl = document.createElement('canvas');
    pl.width = 200;
    pl.height = 240;
    const c = pl.getContext('2d');
    c.shadowColor = '#000';
    c.shadowBlur = 26;
    c.shadowOffsetX = 1000;
    c.fillRect(50 - 1000, 160 / 3, 100, 400 / 3);   // pravougaonik 100 × 133 u sredini
    return pl;
  }

  // Trake, kadrovi, natpisi i olovka, za datu kameru
  function crtajList(c, k, t) {
    const A = arak;
    const cs = Math.cos(k.nagib) * k.sL, sn = Math.sin(k.nagib) * k.sL;
    c.setTransform(cs * dpr, sn * dpr, -sn * dpr, cs * dpr, k.x * dpr, k.y * dpr);
    // Trake uleću naizmenično sleva i zdesna
    const dx = A.redovi.map(red => red.smer * (1 - izlazJako(deo(t, red.kasni, red.kasni + ARAK.trake))) * W * 1.4 / k.sL);
    // Šta je na ekranu (u koordinatama arka), da ne crtamo nevidljivo
    const vidi = (x, y, rx, ry) => {
      const sx = k.x + cs * x - sn * y, sy = k.y + sn * x + cs * y;
      return Math.abs(sx - W / 2) < W / 2 + rx * k.sL && Math.abs(sy - H / 2) < H / 2 + ry * k.sL;
    };

    c.globalAlpha = k.film;
    c.fillStyle = '#0c0b0d';
    for (const tr of A.trake) {
      const x0 = tr.x0 + dx[tr.red], x1 = tr.x1 + dx[tr.red];
      if (!vidi((x0 + x1) / 2, tr.y, (x1 - x0) / 2, tr.h / 2)) continue;
      c.fillRect(x0, tr.y - tr.h / 2, x1 - x0, tr.h);
    }

    // Natpisi na ivici filma, kao na pravom filmu (samo u lila boji)
    c.font = `600 ${A.e * 0.42}px Archivo, sans-serif`;
    if ('fontStretch' in c) c.fontStretch = 'condensed';
    c.textBaseline = 'middle';
    for (const p of A.polja) {
      const x = p.x + dx[p.red];
      if (!vidi(x, p.y, A.cw, A.ch)) continue;
      // Prozor kadra: pre okidanja tamno siv, pa blesak i slika
      const q = deo(t, p.snimak, p.snimak + ARAK.blesak * (p.izabrano ? 1.6 : 1));
      // Izabrani kadar se posle okidanja crta kao fotografija, a do tada je prazan prozor kao i ostali
      if (!p.izabrano || q <= 0) {
        c.globalAlpha = k.film;
        if (q <= 0 || !slicice[p.slika]) {
          c.fillStyle = '#1a181c';
          c.fillRect(x - A.cw / 2, p.y - A.ch / 2, A.cw, A.ch);
        } else {
          c.globalAlpha = k.film * Math.min(1, q * 3);
          c.drawImage(slicice[p.slika], x - A.cw / 2, p.y - A.ch / 2, A.cw, A.ch);
          if (q < 1) {
            c.globalAlpha = k.film * (1 - q) * (1 - q);
            c.fillStyle = '#fff';
            c.fillRect(x - A.cw / 2, p.y - A.ch / 2, A.cw, A.ch);
          }
        }
      }
      c.globalAlpha = k.film * 0.85;
      c.fillStyle = '#c4a9d7';
      const dole = p.y + A.ch / 2 + A.e * 0.55;
      c.fillText(String(p.broj), x - A.cw / 2, dole);
      c.fillText(`▸ ${p.broj}A`, x + A.cw * 0.12, dole);
    }
    for (const tr of A.trake) {
      const x0 = tr.x0 + dx[tr.red];
      if (!vidi((x0 + tr.x1 + dx[tr.red]) / 2, tr.y, (tr.x1 - tr.x0) / 2, tr.h / 2)) continue;
      const gore = tr.y - tr.h / 2 + A.e * 0.5;
      c.fillText('NEMI STUDIO 400', x0 + A.g * 1.6, gore);
      c.fillText('WIEN · 2026', x0 + (tr.x1 - tr.x0) * 0.55, gore);
    }

    // Lila olovka oko izabranog kadra
    const pO = izlaz(deo(t, ARAK.olovkaOd, ARAK.olovkaDo));
    if (pO > 0) {
      const n = Math.max(2, Math.round(pO * (A.olovka.length - 1)) + 1);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = '#a77ddf';
      for (const [sirina, alfa, pomak] of [[0.055, 0.95, 0], [0.022, 0.5, 0.014]]) {
        c.globalAlpha = k.film * alfa;
        c.lineWidth = A.cw * sirina;
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const [ox, oy] = A.olovka[i];
          if (i === 0) c.moveTo(ox + A.cw * pomak, oy - A.cw * pomak);
          else c.lineTo(ox + A.cw * pomak, oy - A.cw * pomak);
        }
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  }

  // Izabrani kadar kao fotografija: čisto beo papir (isti kao zid sajta) i na njemu izrezan model
  function crtajFotografiju(c, k, t) {
    const A = arak, p = A.izabrano;
    const q = deo(t, p.snimak, p.snimak + ARAK.blesak * 1.6);
    if (q <= 0 || k.pU >= ARAK.predaja) return;
    const cs = Math.cos(k.nagibP) * k.sP, sn = Math.sin(k.nagibP) * k.sP;
    c.setTransform(cs * dpr, sn * dpr, -sn * dpr, cs * dpr, k.x * dpr, k.y * dpr);
    if (k.senkaP > 0.001) {
      // Što je fotografija više podignuta, senka je veća i dalje ispod nje (središte senke = središte kadra)
      const v = 1 + 0.14 * k.senkaP, w = 2 * A.cw * v, h = 2.4 * A.cw * v;
      c.globalAlpha = 0.34 * k.senkaP;
      c.drawImage(senkaFoto, -w / 2, -h / 2 + A.ch * 0.09 * k.senkaP, w, h);
    }
    c.globalAlpha = Math.min(1, q * 3);
    c.fillStyle = '#fff';
    c.fillRect(-A.cw / 2, -A.ch / 2, A.cw, A.ch);
    c.drawImage(izrezan, -A.cw / 2, -A.ch / 2, A.cw, A.ch);
    if (q < 1) {
      c.globalAlpha = (1 - q) * (1 - q);
      c.fillRect(-A.cw / 2, -A.ch / 2, A.cw, A.ch);
    }
    c.globalAlpha = 1;
  }

  let poslednjiNagib = '';
  function crtajArak(t, k) {
    for (const x of [c2, c3]) {
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, platnoArak.width, platnoArak.height);
      x.globalAlpha = 1;
      // Promena veličine platna vraća podešavanja, pa ih postavljamo svaki put
      x.imageSmoothingQuality = 'high';
    }

    if (t < ARAK.olovkaDo) snimakArka = null;
    // Arak se „fotografiše“ čim olovka završi: tada sve miruje, pa se kratak rad ne primećuje
    if (!snimakArka && t >= ARAK.olovkaDo + 0.03 && k.film > 0.003) napraviSnimakArka(kameraArka(ARAK.uronOd), t);
    if (k.pU <= 0) crtajList(c2, k, t);

    // Fotografija je na svom platnu: zamućenje arka je ne dodiruje, a dok se podiže blago se nagne
    // u prostoru, kao kad se uzme sa stola
    crtajFotografiju(c3, k, t);
    const nagib = k.podizanje > 0 && k.podizanje < 1
      ? `perspective(${Math.round(H * 1.6)}px) rotateX(${(7 * Math.sin(Math.PI * k.podizanje)).toFixed(2)}deg) rotateY(${(-4 * Math.sin(Math.PI * k.podizanje)).toFixed(2)}deg)`
      : '';
    if (nagib !== poslednjiNagib) {
      platnoOtisak.style.transformOrigin = `${k.x}px ${k.y}px`;
      platnoOtisak.style.transform = nagib;
      poslednjiNagib = nagib;
    }

    // Lupa: kroz staklo se vidi uvećan arak (nacrtan ponovo, da bude oštar), sa crnim obodom
    const L = lupa(t, k);
    if (L && L.vid > 0.01) {
      const c = c3, kL = { ...krozLupu(k, L, 2.2), film: k.film * L.vid };
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 0.32 * L.vid;
      const senka = c.createRadialGradient(L.x + L.r * 0.16, L.y + L.r * 0.22, L.r * 0.6, L.x + L.r * 0.16, L.y + L.r * 0.22, L.r * 1.4);
      senka.addColorStop(0, '#000');
      senka.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = senka;
      c.fillRect(L.x - L.r * 1.6, L.y - L.r * 1.6, L.r * 3.4, L.r * 3.4);

      c.save();
      c.globalAlpha = L.vid;
      c.beginPath();
      c.arc(L.x, L.y, L.r, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = '#fff';
      c.fill();
      crtajList(c, kL, t);
      crtajFotografiju(c, kL, t);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Staklo: blaga tama ka obodu i odsjaj gore levo
      const staklo = c.createRadialGradient(L.x, L.y, L.r * 0.55, L.x, L.y, L.r);
      staklo.addColorStop(0, 'rgba(0,0,0,0)');
      staklo.addColorStop(1, 'rgba(0,0,0,0.22)');
      c.globalAlpha = L.vid;
      c.fillStyle = staklo;
      c.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      c.restore();

      c.globalAlpha = L.vid;
      c.lineWidth = L.r * 0.13;
      c.strokeStyle = '#0d0c0e';
      c.beginPath();
      c.arc(L.x, L.y, L.r + c.lineWidth / 2, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = Math.max(1, L.r * 0.012);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.beginPath();
      c.arc(L.x, L.y, L.r * 1.115, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = L.r * 0.035;
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      c.beginPath();
      c.arc(L.x, L.y, L.r * 0.86, Math.PI * 1.08, Math.PI * 1.36);
      c.stroke();
      c.globalAlpha = 1;
    }
  }

  // velicina() crta odmah (bez zakazivanja sledećeg kruga), pa obrisana platna ne ostanu prazna ni jedan kadar
  let bezPetlje = false;
  const dalje = () => { if (!bezPetlje) requestAnimationFrame(petlja); };
  function petlja(ms) {
    // Kad je heroj odskrolovan van ekrana (posle topljenja), ništa se ne crta
    if (otkljucano && scrollY > H + duzinaStaze() + 40) {
      // heroj je van ekrana: dekodirani kadrovi se puste (osim onog na ekranu), nazad se dekodiraju po potrebi
      if (bitmape.size > 1) for (const [k, v] of bitmape) { if (k !== prikazano && v) { bitmape.delete(k); if (v.close) v.close(); } }
      prethodno = 0; dalje(); return;
    }
    const t = ms / 1000 * BRZINA;
    const dt = Math.min(0.05, prethodno ? t - prethodno : 0.016);
    prethodno = t;
    let proteklo = t - pocetakFaze;

    let rect = R, modelVid = true, listK = null;
    let kA = 'g', slA = glavna, okvir = [0, 0, 1, 1], ceo = 0;

    if (faza === 'uvod') {
      if (STANI !== null) proteklo = STANI;
      const k = kameraArka(proteklo);
      crtajArak(proteklo, k);
      if (k.pU > 0 && k.film > 0.003 && snimakArka) listK = k;
      // Kadrovi ruke se preuzimaju već tokom uvoda (preuzimanje ne otima snagu crtanju; dekodiraju se tek kad trebaju)
      if (proteklo >= 1) pokreniRuku();
      if (k.pU < ARAK.predaja) {
        modelVid = false;
      } else {
        // Model sada crta WebGL, tačno preko mesta gde je bila fotografija
        rect = { x: k.x - k.sP * arak.cw / 2, y: k.y - k.sP * arak.ch / 2, w: k.sP * arak.cw, h: k.sP * arak.ch };
        telo.classList.add('slova');
      }
      const krajUrona = ARAK.uronDo;
      const predajaU = ARAK.uronOd + ARAK.predaja * (ARAK.uronDo - ARAK.uronOd);
      senka = izlaz(deo(proteklo, predajaU, krajUrona + 0.6));
      if (proteklo > krajUrona - 0.15) telo.classList.add('spremno');
      // Ruka kreće tek kad stignu njeni kadrovi; do tada stoji mirna glavna slika
      if (proteklo >= krajUrona + 0.6 && STANI === null) {
        promeniFazu('ruka', t);
        // Platna araka su sada prazna; sakrivena, pregledač ne mora da ih slaže preko ekrana
        platnoArak.style.visibility = platnoOtisak.style.visibility = 'hidden';
      }
    } else if (faza === 'ruka' && rukaSpremna) {
      senka = 1;
      if (TOPI !== null) {
        // Provera topljenja: dlan odmah na grudi, pa topljenje čim se taj kadar dekodira
        poz.a = poz.b = mreza.grudi; poz.t = 0;
        dekodiraj(mreza.grudi);
        if (bitmape.get(mreza.grudi)) { prikazano = mreza.grudi; zapocniTopljenje(t); }
      }
      // Cilj: tačka mreže najbliža pokazivaču. Kad je pokazivač na logu na jakni, ruka savije
      // dlan na grudi (to je skriveno mesto za klik; nigde se ne naglašava).
      const aktivan = pokazivac !== null && (pustenoU === null || t - pustenoU < RUKA.pustiPosle);
      let C, naLogu = false;
      if (aktivan) {
        const pu = (pokazivac.x - R.x) / R.w, pv = (pokazivac.y - R.y) / R.h;
        const [lx, ly, lw, lh] = mreza.logo;
        naLogu = Math.abs(pu - lx) < lw * 0.75 && Math.abs(pv - ly) < lh * 1.8;
        C = naLogu ? cvorKaoCilj(mreza.grudi) : ciljZaTacku(pu, pv);
        // Miš stoji: ruka se smiri u najoštrijem obližnjem kadru (kao kad čovek zastane, šaka je
        // mirna i oštra, a ne zamućena usred pokreta)
        if (!naLogu && t - pokretU > RUKA.smiri) {
          if (smirenCilj === null) smirenCilj = najostrijiBlizu(pu, pv);
          if (smirenCilj !== null) C = cvorKaoCilj(smirenCilj);
        }
      } else {
        C = cvorKaoCilj(0);
      }
      if (zeliTopljenje) C = cvorKaoCilj(mreza.grudi);
      // Šaka stiže za pokazivačem gotovo odmah: koliko brzo pomeriš miš, toliko brzo ide i ruka
      const ostalo = preostalo(C);
      const korak = aktivan || zeliTopljenje
        ? Math.min(RUKA.najbrze * dt, ostalo * (1 - Math.exp(-dt / RUKA.kasni)) + 0.02 * dt)
        : Math.min(RUKA.spustiNajbrze * dt, ostalo * (1 - Math.exp(-dt / RUKA.spusti)) + 0.02 * dt);
      idiKa(C, korak);

      // Vidi se kadar čvora kojem je šaka bliža (čvor 0 je oštra glavna slika)
      let prikaz = poz.a === poz.b || poz.t < 0.5 ? poz.a : poz.b;
      // u prvim sekundama (telefon) nisu stigli svi kadrovi: vidi se drugi kraj veze ili ostaje prethodni
      if (!kadroviRuke[prikaz]) prikaz = kadroviRuke[prikaz === poz.a ? poz.b : poz.a] ? (prikaz === poz.a ? poz.b : poz.a) : prikazano;
      // Novi kadar najviše jednom po slici ekrana.
      // Celi kadrovi se menjaju tek kad su dekodirani; do tada ostaje prethodni.
      if (prikaz !== prikazano) {
        const spreman = !mreza.ceo || bitmape.get(prikaz);
        if (spreman && t - smenaU >= 1 / 61) { prikazano = prikaz; smenaU = t; } else prikaz = prikazano;
      }
      // Kadar u kojem je ruka na istom mestu kao na glavnoj slici nema isečak: tada samo glavna slika
      // (stara mreza.json iz keša nema okvir: tada isto samo glavna slika, umesto da animacija stane)
      const okv = prikaz > 0 ? mreza.cvorovi[prikaz][4] : null;
      if (mreza.ceo) {
        // Ceo kadar snimka, i za mirnu pozu; dok se kadar ne učita, ostaje glavna slika
        const bm = bitmape.get(prikaz);
        if (bm) { kA = 'n' + prikaz; slA = bm; ceo = 1; }
        unapred(C);
      } else if (okv && okv[2] > 0) { kA = 'n' + prikaz; slA = kadroviRuke[prikaz]; okvir = okv; }
      // Dlan je stigao na grudi: topljenje kreće iz tog kadra (prvi kadar topljenja je isti)
      if (zeliTopljenje && prikazano === mreza.grudi && preostalo(C) < 0.01) zapocniTopljenje(t);

      // Skriveno mesto: dlan je na grudima, a pokazivač na logu
      const sadaNadjeno = naLogu && preostalo(C) < 0.01;
      if (naLogu || zeliTopljenje) pripremiTopljenje();
      if (sadaNadjeno !== nadjeno) { nadjeno = sadaNadjeno; hero.style.cursor = nadjeno ? 'pointer' : ''; }

      rect = disanje(t);
      if (prviPokret !== null && t - prviPokret > 1.5) savet.classList.add('sakrij');
    } else if (faza === 'topljenje') {
      senka = 1;
      const T = TOPLJENJE, n0 = mreza.n, poslednji = T.kadrova - 1;
      if (TOPI !== null && !isNaN(TOPI)) topSat = vremeKadra(Math.round(TOPI * poslednji)) + 1e-4;
      else if (smanjenPokret) topSat = vremeKadra(poslednji);
      // Sat topljenja ide samo kad je sledeći kadar spreman, da topljenje nikad ne preskoči kadar
      else if (bitmape.get(n0 + kadarTopljenja(topSat + dt))) topSat += dt;
      topKadar = kadarTopljenja(topSat);
      // Unapred se dekodiraju samo kadrovi koji će stvarno biti na ekranu (topljenje je brže od 60 sl/s,
      // pa se neki kadrovi preskaču)
      dekodiraj(n0 + topKadar);
      for (let k = 1; k <= 12; k++) dekodiraj(n0 + kadarTopljenja(topSat + k / 60));
      // Dok prvi kadar topljenja ne stigne, ostaje kadar u kom je dlan dodirnuo logo (isti je)
      if (bitmape.get(n0 + topKadar)) prikazano = n0 + topKadar;
      const bm = mreza.ceo && bitmape.get(prikazano);
      if (bm) { kA = 'n' + prikazano; slA = bm; ceo = 1; }
      // Kamera prati tečnost nadole, dok bara ne legne na dno ekrana (na telefonu iznad dugmeta, a
      // kamera se i udalji, da cela bara stane na uski ekran)
      const kam = glatko(deo(topSat, vremeKadra(T.kameraOd), vremeKadra(T.kameraDo)));
      const r0 = disanje(t), m = Math.min(1, W * 0.94 / (R.w * 0.96));
      const kw = R.w * m, kh = R.h * m;
      const dno = T.dnoBare;
      rect = {
        x: r0.x + ((W - kw) / 2 - r0.x) * kam,
        y: r0.y + (dnoTopljenja - dno * kh - r0.y) * kam,
        w: r0.w + (kw - r0.w) * kam,
        h: r0.h + (kh - r0.h) * kam
      };
      // Kad se bara slegne, stranica sama pređe u drugi deo (bara ostaje na dnu heroja). Na „Živoj
      // tečnosti“ se stranica samo otključa, a dalje vodi skrol (osim ako je posetilac tražio neki deo).
      if (ZIVA && topKadar >= T.bara) {
        if (!otkljucano) otkljucaj(!!ciljSkrola);
        kupola = T.bara;
        promeniFazu('bara', t);
      } else if (topKadar >= poslednji && !otkljucano) otkljucaj(true);
    } else if (faza === 'bara') {
      senka = 1;
      const T = TOPLJENJE, n0 = mreza.n, poslednji = T.kadrova - 1, staza = duzinaStaze();
      const p = staza > 0 ? Math.max(0, Math.min(1, scrollY / staza)) : 1;
      const cilj = T.bara + p * (poslednji - T.bara);
      // Kadar prati skrol glatko (točkić skače po stotinu piksela), oba smera
      kupola += (cilj - kupola) * (1 - Math.exp(-dt / 0.07));
      if (Math.abs(cilj - kupola) < 0.02) kupola = cilj;
      const k = Math.round(kupola), smer = cilj >= kupola ? 1 : -1;
      dekodiraj(n0 + k);
      for (let d = 1; d <= 8; d++) {
        const j = k + smer * d;
        if (j >= T.bara && j <= poslednji) dekodiraj(n0 + j);
      }
      // Vidi se traženi kadar, a dok se ne dekodira najbliži koji je spreman
      for (let d = 0; d <= 8; d++) {
        const j = [k + d, k - d].find(j => j >= T.bara && j <= poslednji && bitmape.get(n0 + j));
        if (j !== undefined) { prikazano = n0 + j; break; }
      }
      const bm = bitmape.get(prikazano);
      if (bm) { kA = 'n' + prikazano; slA = bm; ceo = 1; }
      // Kamera ostaje tamo gde je stala na kraju topljenja
      const m = Math.min(1, W * 0.94 / (R.w * 0.96)), kw = R.w * m, kh = R.h * m;
      rect = { x: (W - kw) / 2, y: dnoTopljenja - T.dnoBare * kh, w: kw, h: kh };
    } else {
      senka = 1;
    }

    // Senke krošnje klize sporo, pa im je dovoljno 24 slike u sekundi. Platno koje se ne nacrta
    // ostaje kakvo je bilo, a grafička kartica ne slaže ponovo ceo ekran bez potrebe.
    const ZA_SENKE = 1 / 24;
    if (Math.abs(senka - senkaNacrtana) > 1e-3 || (senka > 0 && t - pozadinaU >= ZA_SENKE)) {
      glP.viewport(0, 0, platnoPoz.width, platnoPoz.height);
      glP.uniform2f(uP.uRes, W, H);
      glP.uniform1f(uP.uT, smanjenPokret ? t * 0.3 : t);
      glP.uniform1f(uP.uSenka, senka * 0.9);
      glP.drawArrays(glP.TRIANGLES, 0, 3);
      pozadinaU = t;
      senkaNacrtana = senka;
    }

    // Model: odmah čim se ruka pomeri (i stalno tokom uvoda); kad ruka miruje, samo zbog senki
    const stanje = faza === 'uvod' ? null : kA;
    const topiSe = faza === 'topljenje' && topKadar < TOPLJENJE.kadrova - 1;
    if (stanje !== null && stanje === nacrtanoStanje && !topiSe && t - modelU < ZA_SENKE) {
      dalje();
      return;
    }
    modelU = t;
    nacrtanoStanje = stanje;
    gl.viewport(0, 0, platnoModel.width, platnoModel.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (listK) {
      const S = snimakArka, r = listK.sL / S.s;
      // Oštar → srednje mutan → sasvim mutan
      const f = listK.fokus * 2, i = Math.min(1, Math.floor(f));
      gl.useProgram(uL.program);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, listTeksture[i].t);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, listTeksture[i + 1].t);
      gl.uniform2f(uL.uRes, platnoModel.width, platnoModel.height);
      gl.uniform2f(uL.uVel, S.w, S.h);
      gl.uniform3f(uL.uPreslik, r * dprM / dpr, dprM * (listK.x - r * S.x), dprM * (listK.y - r * S.y));
      gl.uniform1f(uL.uMesaj, f - i);
      gl.uniform1f(uL.uFilm, listK.film);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.useProgram(u.program);
    }
    if (modelVid) {
      // Čvor 0 je sama glavna slika; inače se uz nju čita i kadar snimka
      if (kA !== 'g') { vezi(kA, slA); gl.uniform2f(u.uVelA, slA.width, slA.height); }
      gl.uniform1f(u.uSnimak, kA !== 'g' ? 1 : 0);
      gl.uniform1f(u.uCeo, ceo);
      gl.uniform4f(u.uOkvir, okvir[0], okvir[1], okvir[2], okvir[3]);
      gl.uniform4f(u.uRect, rect.x * dprM, rect.y * dprM, rect.w * dprM, rect.h * dprM);
      gl.uniform2f(u.uRes, platnoModel.width, platnoModel.height);
      gl.uniform1f(u.uDpr, dprM);
      gl.uniform1f(u.uT, smanjenPokret ? t * 0.3 : t);
      gl.uniform1f(u.uSenka, senka);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    dalje();
  }

  // ---------- Pokazivač (miš, prst, strelice) ----------
  // Pokazivač se pamti u pikselima heroja (x i y)
  // Ruka ostaje gde je miš stao; spušta se tek kad miš izađe iz heroja ili kad se prst podigne.
  const pomeri = (x, y) => {
    pokazivac = { x: Math.max(0, Math.min(W, x)), y: Math.max(0, Math.min(H, y)) };
    pustenoU = null;
    pokretU = sad();
    smirenCilj = null;
    if (faza === 'ruka' && prviPokret === null) prviPokret = sad();
  };
  const uHeroju = e => {
    const r = hero.getBoundingClientRect();
    pomeri(e.clientX - r.left, e.clientY - r.top);
  };
  hero.addEventListener('pointermove', uHeroju);
  hero.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') pokazivac = null;
    else pustenoU = sad();
  });
  hero.addEventListener('pointerdown', e => {
    uHeroju(e);
    if (e.pointerType !== 'mouse') potez = { y: e.clientY, t: performance.now() };
    if (faza !== 'ruka' || !nadjeno) return;
    // Posetilac je sam našao skriveno mesto: model se topi, odavde kreće drugi deo sajta
    zapocniTopljenje(sad());
  });
  // Na telefonu brz i dug potez prstom nagore znači „dalje“ (kao skrol), ne pokret ruke
  let potez = null;
  hero.addEventListener('pointerup', e => {
    if (!potez || otkljucano) return;
    const dy = e.clientY - potez.y, trajanje = performance.now() - potez.t;
    potez = null;
    if (dy < -H * 0.4 && trajanje < 400) trazimTopljenje(null);
  });

  // ---------- Prelaz u drugi deo ----------
  // Do topljenja se stranica ne skroluje. Točkić ili taster nadole, meni i dugmad prvo vode dlan na
  // grudi i istope model, pa se skroluje dalje.
  function trazimTopljenje(cilj) {
    if (otkljucano) {
      if (cilj) scrollTo({ top: cilj.getBoundingClientRect().top + scrollY, behavior: smanjenPokret ? 'auto' : 'smooth' });
      return;
    }
    ciljSkrola = cilj;
    if (faza !== 'topljenje') zeliTopljenje = true;
  }
  // Posle topljenja stranica se otključa i sama pređe u drugi deo (ili do mesta koje je posetilac
  // tražio); tamo tečnost kroz cevi krene u slova
  function otkljucaj(skroluj) {
    otkljucano = true;
    telo.classList.add('istopljen');
    document.documentElement.classList.add('otkljucano');
    document.dispatchEvent(new CustomEvent('nemi:istopljen'));
    if (!skroluj) return;
    const cilj = ciljSkrola;
    ciljSkrola = null;
    setTimeout(() => {
      const drugi = document.querySelector('.kalupi');
      const y = (cilj || drugi).getBoundingClientRect().top + scrollY;
      scrollTo({ top: y, behavior: smanjenPokret ? 'auto' : 'smooth' });
    }, smanjenPokret ? 0 : 120);
  }
  addEventListener('wheel', e => { if (!otkljucano && e.deltaY > 0) trazimTopljenje(null); }, { passive: true });
  addEventListener('keydown', e => {
    if (!otkljucano && (e.key === 'PageDown' || e.key === ' ' || e.key === 'End')) trazimTopljenje(null);
  });
  document.querySelectorAll('a[href^="#"]:not(.logo)').forEach(a => {
    const cilj = a.getAttribute('href').length > 1 ? document.querySelector(a.getAttribute('href')) : null;
    if (!cilj) return;
    a.addEventListener('click', e => { e.preventDefault(); trazimTopljenje(cilj); });
  });
  addEventListener('keydown', e => {
    const smer = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!smer) return;
    const p = pokazivac ?? { x: W / 2, y: H / 2 };
    pomeri(p.x + smer[0] * W * 0.06, p.y + smer[1] * H * 0.06);
  });

  // Uvod kreće tek kad je stranica na ekranu, da se ne odvrti u sakrivenom tabu.
  const cekajVidljivost = () => document.visibilityState === 'visible' ? Promise.resolve() : new Promise(ok => {
    const slusaj = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', slusaj);
      ok();
    };
    document.addEventListener('visibilitychange', slusaj);
  });

  // Klik na logo pušta uvod ponovo (zgodno kad se sajt pokazuje mušteriji).
  function ponoviUvod() {
    if (faza === 'ucitavanje' || smanjenPokret) return;
    // Slova i meni se vraćaju odmah, bez animacije
    telo.classList.add('resetuj');
    telo.classList.remove('spremno', 'slova');
    savet.classList.remove('sakrij');
    void telo.offsetWidth;
    telo.classList.remove('resetuj');
    senka = 0;
    telo.classList.remove('istopljen', 'topi');
    otkljucano = false; zeliTopljenje = false; ciljSkrola = null;
    dopuniKadrove();   // ostatak kadrova ruke, ako je preskočen posle topljenja
    document.documentElement.classList.remove('otkljucano');
    scrollTo(0, 0);
    poz.a = poz.b = 0; poz.t = 0; prikazano = 0; smenaU = -1e9;
    nadjeno = false; hero.style.cursor = '';
    pokazivac = null; pustenoU = null; prviPokret = null;
    snimakArka = null;
    platnoArak.style.visibility = platnoOtisak.style.visibility = '';
    promeniFazu('uvod', sad());
  }
  document.querySelector('.logo').addEventListener('click', e => {
    e.preventDefault();
    ponoviUvod();
  });

  // Rezerva za heroja na stazi kupole: ako ga pregledač ne drži (sticky), JS ga drži — fixed dok traje
  // staza, pa absolute na njenom kraju; mesto heroja u stranici čuva padding omotača
  let jsDrzi = false;
  function drziHeroja() {
    if (!stazaKupole || !otkljucano) return;
    const staza = duzinaStaze(), y = scrollY;
    if (!jsDrzi) {
      if (!(y > 4 && y < staza - 4 && hero.getBoundingClientRect().top < -2)) return;
      jsDrzi = true;
      hero.parentElement.style.paddingTop = hero.offsetHeight + 'px';
      hero.style.left = hero.style.right = '0';
    }
    hero.style.position = y < staza ? 'fixed' : 'absolute';
    hero.style.top = y < staza ? '0' : staza + 'px';
  }
  addEventListener('scroll', drziHeroja, { passive: true });

  // ?dbg: stanje ruke i topljenja za automatsku proveru (window.__stanje())
  if (parametri.has('dbg')) window.__stanje = () => ({ faza, rukaSpremna, prikazano, a: poz.a, b: poz.b, t: poz.t, smirenCilj,
    pokazivac, R, n: mreza && mreza.n, topKadar, otkljucano, jsDrzi });

  // ---------- Pokretanje ----------
  async function pokreni() {
    telo.classList.add('ruka-ceka');
    try {
      glP = platnoPoz.getContext('webgl', { alpha: false, antialias: false });
      gl = platnoModel.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
      c2 = platnoArak.getContext('2d');
      c3 = platnoOtisak.getContext('2d');
      if (!glP || !gl || !c2 || !c3) throw new Error('nema WebGL');
      uP = napraviProgram(glP, POZADINA);
      u = napraviProgram(gl, MODEL);
      gl.uniform1i(u.uA, 0);
      gl.uniform1i(u.uG, 1);
      gl.uniform3f(u.uLila, LILA[0], LILA[1], LILA[2]);
      slotovi = Array.from({ length: 8 }, () => napraviTeksturu(gl));
      uL = napraviProgram(gl, LIST);
      gl.uniform1i(uL.uOstriji, 2);
      gl.uniform1i(uL.uMutniji, 3);
      listTeksture = [napraviTeksturu(gl), napraviTeksturu(gl), napraviTeksturu(gl)];
      gl.useProgram(u.program);
    } catch (greska) {
      console.warn(greska);
      telo.classList.remove('ucitavanje');
      telo.classList.add('bez-gl', 'spremno', 'slova');
      telo.classList.remove('ruka-ceka');
      otkljucaj(false);
      return;
    }

    velicina();
    addEventListener('resize', velicina);
    // Širina heroja se menja i bez promene prozora (posle topljenja se pojavi traka za skrol): tada
    // se meri ponovo, da se šara lišća poklopi sa drugim delom bez šava
    if (window.ResizeObserver) {
      let sirina = hero.clientWidth;
      new ResizeObserver(() => { if (hero.clientWidth !== sirina) { sirina = hero.clientWidth; velicina(); } }).observe(hero);
    }

    // Natpisi na filmu su u Archivo fontu; ne čekamo ga duže od sekunde
    const font = document.fonts ? Promise.race([
      document.fonts.load('600 12px Archivo').catch(() => {}),
      new Promise(ok => setTimeout(ok, 1000))
    ]) : Promise.resolve();
    const [podaci] = await Promise.all([
      fetch('media/ruka/mreza.json').then(r => r.json()),
      ucitajUvod(),
      font
    ]);
    mreza = pripremiMrezu(podaci);
    senkaFoto = napraviSenku();
    // Glavna slika ide na grafičku karticu odmah, a ne usred urona (inače bi tu zakočilo), i tu ostaje
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, napraviTeksturu(gl).t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glavna);
    gl.uniform1f(u.uSnimak, 0);
    gl.uniform4f(u.uRect, -10, -10, 1, 1);
    gl.uniform2f(u.uRes, platnoModel.width, platnoModel.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.clear(gl.COLOR_BUFFER_BIT);

    await cekajVidljivost();
    telo.classList.remove('ucitavanje');
    if (smanjenPokret || TOPI !== null) {
      pokreniRuku();
      senka = 1;
      telo.classList.add('spremno', 'slova');
      promeniFazu('ruka', sad());
    } else {
      promeniFazu('uvod', sad());
    }
    requestAnimationFrame(petlja);
  }

  pokreni();
})();
