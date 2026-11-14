/* ============================================================================
   A ESCOLHA (depois do flash no farol), toda em vídeo
   ----------------------------------------------------------------------------
   Herói: um vídeo em loop dos dois veículos (hero-loop.mp4), sem imagem parada.
   Escolher > a câmera se aproxima do veículo (zoom no próprio vídeo) > o vídeo
   dele toca até o perfil lateral com o brilho > a página desce para os serviços.
   Voltar > o vídeo toca ao contrário (carro-rev / moto-rev), a câmera se afasta
   e o herói volta, pronto para uma nova escolha.

   Carro e moto vão para o mesmo lugar (#destaques, os cards que sobem, e depois a grade de
   serviços). O que muda é o CONTEÚDO: body[data-veiculo] liga as versões da moto (veiculo.css).
   "Trocar veículo" (barra do topo) e "Voltar" refazem a escolha a qualquer momento.

   ACELERAR: um clique, a rolagem, o toque, uma tecla ou o botão durante a
   transição aceleram tudo (2x, 3x, 4x): o vídeo, o zoom e as pausas.

   À prova de falha (nada aqui pode prender a pessoa na página):
   - a trava de rolagem só existe enquanto a escolha está pendente e só bloqueia
     a descida; "Ver todos os serviços" a desliga;
   - vídeo que não carrega, não toca ou trava leva direto aos serviços, sem
     travar a tela; na volta, o herói reaparece na hora;
   - "reduzir movimento", economia de dados e 2G pulam os vídeos;
   - qualquer erro na inicialização esconde a seção e libera a página inteira.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('escolha');
  if (!root) return;
  var destaques = document.getElementById('destaques');

  try {

  // fatia do herói que o 1º quadro de cada vídeo cobre, em frações 0..1 do quadro 1920x1080.
  // carro: recorte 1100x619 em (690,350). moto: recorte 810x600 em (0,400), esticado em 1,8x
  // e completado com a parede espelhada até 1920 de largura.
  var RECT = {
    carro: { x: 690 / 1920, y: 350 / 1080, w: 1100 / 1920, h: 619 / 1080 },
    moto:  { x: 0,          y: 400 / 1080, w: (1920 / 1.8) / 1920, h: 600 / 1080 }
  };
  var TARGET = { carro: 'destaques', moto: 'destaques' };
  var LABEL = { carro: 'carro', moto: 'moto' };
  var IDENT = 'translate(0px,0px) scale(1)';
  var EASE = 'cubic-bezier(0.62, 0.02, 0.18, 1)';

  var ZOOM_MS = 1250;      // duração da aproximação (e do afastamento), a 1x
  var XFADE_AT = 0.72;     // o vídeo do veículo entra quando o zoom chega a esta fração
  var HOLD_MS = 700;       // pausa no perfil antes de ir para os serviços
  var ZOOM_LEAD_MS = 450;  // na volta, o afastamento começa quando faltam estes ms de vídeo
  var STALL_MS = 4000;     // sem o vídeo ficar pronto/tocar neste tempo, segue sem ele
  var MAX_RATE = 4;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var lite = !!(conn.saveData || /2g$/.test(conn.effectiveType || ''));
  var smallScreen = matchMedia('(max-width: 860px)').matches;   // telas pequenas recebem os vídeos de 720p (data-src-s)

  var cam = root.querySelector('[data-esc-cam]');
  var hero = root.querySelector('[data-esc-hero]');
  var vids = {
    carro: { fwd: root.querySelector('[data-esc-vid="carro"]'), rev: root.querySelector('[data-esc-vid="carro-rev"]') },
    moto:  { fwd: root.querySelector('[data-esc-vid="moto"]'),  rev: root.querySelector('[data-esc-vid="moto-rev"]') }
  };
  var picks = root.querySelectorAll('[data-esc-pick]');
  var skipAllBtn = root.querySelector('[data-esc-skip]');
  var boostBtn = root.querySelector('[data-esc-skipnow]');
  var againBtn = root.querySelector('[data-esc-again]');
  var statusEl = root.querySelector('[data-esc-status]');
  var switchBtn = document.querySelector('[data-esc-switch]');       // "Trocar veículo", na barra do topo
  var finVideo = document.querySelector('[data-fin-video]');         // fundo em vídeo dos cards que sobem
  var canAnimate = typeof cam.animate === 'function';
  var noVideo = reduce || lite || !canAnimate;

  // idle: escolha pendente | approach: zoom | playing: vídeo do veículo | hold: pausa no perfil
  // done: nos serviços | rewind: voltando (vídeo ao contrário e afastamento)
  var state = 'idle';
  var BUSY = { approach: 1, playing: 1, hold: 1, rewind: 1 };
  var chosen = null;
  var armed = false;       // trava de rolagem ligada
  var lockedAll = false;   // durante a transição: rolagem e toque aceleram em vez de rolar
  var snapping = false;
  var pinY = 0;
  var rate = 1;
  var zoom = null;
  var timers = [];

  /* ---------- utilidades ---------- */
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  // a barra do topo oferece "Trocar veículo" enquanto a pessoa está nos serviços (depois de escolher ou de pular)
  function updateSwitch() {
    if (!switchBtn) return;
    switchBtn.hidden = state !== 'done';
    switchBtn.textContent = chosen ? 'Trocar veículo' : 'Escolher veículo';
  }
  function setState(s) { state = s; root.setAttribute('data-state', s); updateSwitch(); }
  function say(t) { if (statusEl) statusEl.textContent = t; }
  function absTop(el) { return el.getBoundingClientRect().top + window.pageYOffset; }
  function safePlay(v) {
    if (!v) return;
    try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function safePause(v) { try { v.pause(); } catch (e) {} }
  function relayout() {
    var sc = window.ScrollCraft, inst = sc && sc.instances && sc.instances[0];
    if (inst && inst.layout) inst.layout();
  }
  function goTo(el) {
    if (!el) return;
    window.scrollTo({ top: absTop(el), behavior: reduce ? 'auto' : 'smooth' });
    el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (e) {}
  }
  // o conteúdo de cada veículo é trocado pelo CSS (body[data-veiculo], veiculo.css); aqui só se refazem as medidas
  // da página, porque a grade de serviços muda de tamanho
  function showTargets() { relayout(); }

  // os cards de destaque sobem sozinhos, no tempo (sem rolagem), com o mesmo efeito de antes: cada peça lê
  // --sc-p (0 a 1) da seção, e agora é este laço que o conduz. Sem JS (ou com movimento reduzido), --sc-p = 1: tudo montado.
  var RISE_MS = 3400;
  var riseDone = false, riseRaf = 0;
  function setRise(p) { if (destaques) destaques.style.setProperty('--sc-p', p.toFixed(4)); }
  function resetRise() { cancelAnimationFrame(riseRaf); riseDone = false; if (!reduce) setRise(0); }
  function playRise() {
    if (riseDone || !destaques) return;
    riseDone = true;
    if (reduce) { setRise(1); return; }
    var t0 = performance.now();
    (function step(now) {
      var k = Math.min((now - t0) / RISE_MS, 1);
      setRise(k);
      if (k < 1) riseRaf = requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- a câmera: transform que leva a fatia do herói a preencher o palco ---------- */
  function camTransform(kind) {
    var r = RECT[kind];
    var sw = root.clientWidth, sh = root.clientHeight;
    var cw = cam.offsetWidth, ch = cam.offsetHeight;
    var bx = cam.offsetLeft, by = cam.offsetTop;
    var contain = matchMedia('(max-aspect-ratio: 8/5)').matches;   // a mesma media query do CSS: a câmera cabe na largura
    var coverW = contain ? sw : Math.max(sw, sh * 16 / 9);
    var s = coverW / (r.w * cw);
    var px = (r.x + r.w / 2) * cw, py = (r.y + r.h / 2) * ch;
    var tx = sw / 2 - bx - s * px, ty = sh / 2 - by - s * py;
    return 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s.toFixed(5) + ')';
  }
  function stopZoom() {
    if (!zoom) return;
    zoom.onfinish = null;
    try { zoom.cancel(); } catch (e) {}
    zoom = null;
  }
  // anima a câmera (Web Animations: dá para mudar a velocidade no meio, e é o que a aceleração usa)
  function runZoom(from, to, done) {
    stopZoom();
    var a = cam.animate([{ transform: from }, { transform: to }], { duration: ZOOM_MS, easing: EASE, fill: 'both' });
    zoom = a;
    try { a.updatePlaybackRate(rate); } catch (e) {}
    a.onfinish = function () {
      if (zoom === a) zoom = null;
      cam.style.transform = to === IDENT ? '' : to;      // grava o estado final e só então solta a animação
      a.cancel();
      if (done) done();
    };
  }

  /* ---------- aceleração ---------- */
  function applyRate() {
    if (zoom) { try { zoom.updatePlaybackRate(rate); } catch (e) {} }
    if (chosen) { vids[chosen].fwd.playbackRate = rate; vids[chosen].rev.playbackRate = rate; }
    if (boostBtn) boostBtn.textContent = rate > 1 ? 'Acelerar ▸▸ ' + rate + '×' : 'Acelerar ▸▸';
  }
  var lastBoost = 0;
  function boost(max) {
    if (!BUSY[state]) return;
    var now = performance.now();
    if (!max && now - lastBoost < 160) return;           // a roda e o toque disparam muitos eventos: um degrau por vez
    lastBoost = now;
    rate = max ? MAX_RATE : Math.min(rate + 1, MAX_RATE);
    applyRate();
  }

  /* ---------- trava de rolagem ---------- */
  var touchY = 0;
  var DOWN_KEYS = { ArrowDown: 1, PageDown: 1, End: 1, ' ': 1, Spacebar: 1 };
  var UP_KEYS = { ArrowUp: 1, PageUp: 1, Home: 1 };
  function block(e) { if (e.cancelable) e.preventDefault(); }
  function onWheel(e) {
    if (lockedAll) { boost(); block(e); }
    else if (e.deltaY > 0) block(e);
    else disarm();
  }
  function onTouchStart(e) { if (e.touches && e.touches[0]) touchY = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (!e.touches || !e.touches[0]) return;
    var dy = touchY - e.touches[0].clientY;              // > 0: o dedo sobe, a página desce
    if (lockedAll) { boost(); block(e); }
    else if (dy > 0) block(e);
    else if (dy < -6) disarm();
  }
  function onKey(e) {
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.key === 'Escape' && lockedAll) { e.preventDefault(); boost(true); return; }
    if (e.key === ' ' && ((t && (t.tagName === 'BUTTON' || t.tagName === 'A')) || e.shiftKey)) return;
    if (DOWN_KEYS[e.key] || UP_KEYS[e.key]) {
      if (lockedAll) { boost(); block(e); }
      else if (DOWN_KEYS[e.key]) block(e);
      else disarm();
    }
  }
  function onScroll() {
    if (armed && !snapping && Math.abs(window.pageYOffset - pinY) > 2) window.scrollTo({ top: pinY, behavior: 'instant' });
  }
  function arm() {
    if (armed) return;
    armed = true; pinY = absTop(root);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    snapping = true;                                     // deixa o encaixe suave terminar antes de fixar
    window.scrollTo({ top: pinY, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () { snapping = false; }, 900);
    prime();
  }
  function disarm() {
    if (!armed) return;
    armed = false;
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onScroll);
  }

  // baixa os vídeos de ida enquanto a pessoa lê a pergunta (a menos que economize dados)
  var primed = false;
  // os vídeos não têm src no HTML (para não baixar nada na abertura): o endereço vem de data-src,
  // ou de data-src-s (720p) em telas pequenas
  function load(v) {
    if (!v) return;
    if (!v.src) {
      var u = (smallScreen && v.getAttribute('data-src-s')) || v.getAttribute('data-src');
      if (!u) return;
      v.src = u;
    }
    if (v.preload !== 'auto') { v.preload = 'auto'; try { v.load(); } catch (e) {} }
  }
  function prime() {
    if (primed || noVideo) return;
    primed = true;
    load(vids.carro.fwd); load(vids.moto.fwd);
  }

  /* ---------- ida: escolher, aproximar, tocar, seguir para os serviços ---------- */
  function choose(kind) {
    if (state !== 'idle' || !RECT[kind]) return;
    chosen = kind; rate = 1;
    resetRise();                                         // a próxima chegada em #destaques repete a subida dos cards
    setState('approach'); lockedAll = true;
    root.setAttribute('data-v', kind);
    document.body.setAttribute('data-veiculo', kind);
    arm();
    showTargets();
    applyRate();
    say('Aproximando do ' + LABEL[kind] + '.');
    if (noVideo) { later(handoff, 250); setState('hold'); return; }   // sem vídeo: direto para os serviços
    load(vids[kind].fwd);
    runZoom(IDENT, camTransform(kind));
    watchApproach(kind);
  }

  function watchApproach(kind) {
    var f = vids[kind].fwd, t0 = performance.now();
    (function tick() {
      if (state !== 'approach') return;
      var prog = zoom ? (zoom.currentTime || 0) / ZOOM_MS : 1;
      if (prog >= XFADE_AT) {
        if (f.readyState >= 3) { startFwd(kind); return; }
        if (performance.now() - t0 > ZOOM_MS / rate + STALL_MS) { failForward(); return; }
      }
      requestAnimationFrame(tick);
    })();
  }

  function startFwd(kind) {
    var f = vids[kind].fwd, r = vids[kind].rev, played = false, t0 = performance.now();
    setState('playing'); say('Reproduzindo o vídeo do ' + LABEL[kind] + '.');
    try { f.currentTime = 0; } catch (e) {}
    f.playbackRate = rate;
    f.classList.add('is-on');
    f.addEventListener('playing', function () { played = true; }, { once: true });
    var p;
    try { p = f.play(); } catch (e) { failForward(); return; }
    if (p && p.catch) p.catch(function () { if (state === 'playing') failForward(); });
    later(function () { hero.classList.add('is-off'); safePause(hero); }, 450);   // depois do fade para o vídeo do veículo
    load(r);                                                                       // a volta já fica baixando
    (function watch() {
      if (state !== 'playing') return;
      var spent = performance.now() - t0;
      if (f.ended || f.currentTime >= f.duration - 0.04) { endFwd(); return; }
      if (!played && spent > STALL_MS) { failForward(); return; }
      if (spent > 15000 / rate) { endFwd(); return; }
      if (played && f.paused && document.visibilityState === 'visible') safePlay(f);
      requestAnimationFrame(watch);
    })();
  }

  function endFwd() {
    if (state !== 'playing') return;
    setState('hold'); say('Perfil do ' + LABEL[chosen] + '.');
    later(handoff, HOLD_MS / rate);
  }

  // o vídeo não carregou, não tocou ou travou: segue para os serviços sem ele
  function failForward() {
    if (state !== 'approach' && state !== 'playing') return;
    clearTimers();
    safePause(vids[chosen].fwd);
    setState('hold');
    later(handoff, 200);
  }

  function handoff() {
    if (state !== 'hold') return;
    setState('done');
    lockedAll = false; rate = 1; applyRate(); disarm();
    if (againBtn) againBtn.textContent = 'Voltar';
    say('Serviços para ' + LABEL[chosen] + '. Use Voltar para escolher de novo.');
    goTo(document.getElementById(TARGET[chosen]));
  }

  // "Ver todos os serviços": sem escolha, as duas seções aparecem
  function skipAll() {
    if (state !== 'idle') return;
    chosen = null;
    setState('done'); lockedAll = false; disarm();
    if (againBtn) againBtn.textContent = 'Escolher o veículo';
    showTargets();
    say('Todos os serviços.');
    goTo(destaques || root.nextElementSibling);
  }

  /* ---------- volta: o vídeo toca ao contrário, a câmera se afasta, o herói volta ---------- */
  function resetInstant() {
    clearTimers(); stopZoom(); cam.style.transform = '';
    ['carro', 'moto'].forEach(function (k) {
      ['fwd', 'rev'].forEach(function (w) {
        var v = vids[k][w];
        safePause(v); try { v.currentTime = 0; } catch (e) {}
        v.classList.remove('is-on'); v.classList.remove('is-snap');
      });
    });
    hero.classList.remove('is-off'); safePlay(hero);
    root.removeAttribute('data-v'); document.body.removeAttribute('data-veiculo');
    chosen = null; rate = 1; lockedAll = false;
    applyRate();
    setState('idle');
    showTargets();
    resetRise();
    say('Escolha o veículo.');
    arm();
  }

  function rewind() {
    if (state !== 'done') return;
    if (!chosen || noVideo) { resetInstant(); return; }
    var k = chosen, f = vids[k].fwd, r = vids[k].rev, t0 = performance.now();
    clearTimers(); rate = 1; lockedAll = true;
    setState('rewind'); say('Voltando.');
    arm();                                               // encaixa na escolha e liga a trava
    applyRate();
    load(r);
    (function waitReady() {
      if (state !== 'rewind') return;
      // vindo de longe (o botão da barra): espera a rolagem chegar na escolha antes de tocar o vídeo
      var atPin = Math.abs(window.pageYOffset - pinY) <= 4 || performance.now() - t0 > 3500;
      if (r.readyState >= 3 && atPin) { go(); return; }
      if (r.readyState < 3 && performance.now() - t0 > STALL_MS) { resetInstant(); return; }
      requestAnimationFrame(waitReady);
    })();

    function go() {
      var zoomedOut = false;
      try { r.currentTime = 0; } catch (e) {}
      r.playbackRate = rate;
      // o 1º quadro do reverso é o último do vídeo de ida: a troca é no mesmo quadro, sem fade
      r.classList.add('is-snap'); r.classList.add('is-on');
      f.classList.add('is-snap'); f.classList.remove('is-on');
      safePlay(r);
      var started = performance.now();
      (function tick() {
        if (state !== 'rewind') return;
        var left = ((r.duration || 4.25) - r.currentTime) * 1000 / rate;
        var ended = r.ended || r.currentTime >= (r.duration || 4.25) - 0.04;
        if (!zoomedOut && (left <= ZOOM_LEAD_MS || ended)) { zoomedOut = true; zoomOut(); }
        if (!zoomedOut && performance.now() - started > 15000 / rate) { resetInstant(); return; }
        if (!ended && r.paused && document.visibilityState === 'visible') safePlay(r);
        if (!zoomedOut || zoom) requestAnimationFrame(tick);
      })();
    }

    function zoomOut() {
      hero.classList.remove('is-off'); safePlay(hero);   // o herói reaparece por baixo, em movimento
      r.classList.remove('is-snap'); r.classList.remove('is-on');   // e o vídeo do veículo some em fade
      f.classList.remove('is-snap');
      runZoom(camTransform(k), IDENT, function () {
        safePause(r); try { r.currentTime = 0; } catch (e) {}
        try { f.currentTime = 0; } catch (e) {}
        root.removeAttribute('data-v'); document.body.removeAttribute('data-veiculo');
        chosen = null; rate = 1; lockedAll = false;
        applyRate();
        setState('idle');
        showTargets();
        resetRise();
        say('Escolha o veículo.');
      });
    }
  }

  /* ---------- ligações ---------- */
  Array.prototype.forEach.call(picks, function (el) {
    el.addEventListener('click', function () { choose(el.getAttribute('data-esc-pick')); });
    el.addEventListener('pointerenter', prime, { passive: true });
    el.addEventListener('focus', prime);
  });
  if (skipAllBtn) skipAllBtn.addEventListener('click', skipAll);
  if (boostBtn) boostBtn.addEventListener('click', function () { boost(); });
  if (againBtn) againBtn.addEventListener('click', rewind);
  if (switchBtn) switchBtn.addEventListener('click', rewind);
  // um clique em qualquer lugar do palco, durante a transição, acelera
  root.addEventListener('click', function (e) {
    if (!BUSY[state]) return;
    if (e.target.closest && e.target.closest('button, a')) return;
    boost();
  });

  // o herói só é baixado quando a seção está a uma tela de distância e só roda enquanto está perto da tela
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) load(hero);
        var heroLive = state === 'idle' || state === 'approach' || state === 'rewind' || (state === 'done' && !chosen);
        if (!heroLive || hero.classList.contains('is-off')) return;
        if (e.isIntersecting) safePlay(hero); else safePause(hero);
      });
    }, { rootMargin: '100% 0px' }).observe(root);
  } else {
    load(hero); safePlay(hero);
  }

  // liga a trava quando a escolha ocupa a tela, só na descida; solta se sair sem escolher
  var lastY = window.pageYOffset, goingDown = true;
  window.addEventListener('scroll', function () {
    var y = window.pageYOffset; goingDown = y >= lastY; lastY = y;
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    var visible = 0, rewindTimer = 0;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        visible = e.isIntersecting ? e.intersectionRatio : 0;
        if (e.isIntersecting && e.intersectionRatio >= 0.55 && state === 'idle' && goingDown) arm();
        else if (!e.isIntersecting && armed && state === 'idle') disarm();
        // voltou rolando para cima e parou na escolha: o vídeo volta sozinho (passar direto não dispara)
        clearTimeout(rewindTimer);
        if (state === 'done' && chosen && visible >= 0.6 && !goingDown) {
          rewindTimer = setTimeout(function () { if (state === 'done' && visible >= 0.6) rewind(); }, 600);
        }
      });
    }, { threshold: [0, 0.25, 0.55, 0.6, 0.75, 1] }).observe(root);
  }

  // a câmera acompanha o tamanho da janela depois da escolha
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (chosen && !zoom && (state === 'playing' || state === 'hold' || state === 'done')) cam.style.transform = camTransform(chosen);
      if (armed) pinY = absTop(root);
    }, 120);
  }, { passive: true });

  // o fundo dos cards que sobem é um vídeo em loop (um para tela larga, outro vertical para o celular):
  // só é baixado e só roda quando a seção está perto da tela
  if (finVideo && destaques) {
    var finSrc = (matchMedia('(max-width: 860px)').matches && finVideo.getAttribute('data-src-mobile')) || finVideo.getAttribute('data-src');
    var finLoaded = false;
    var finStart = function () {
      if (!finLoaded) { finLoaded = true; finVideo.src = finSrc; finVideo.preload = 'auto'; }
      if (!reduce && !lite) safePlay(finVideo);                 // com movimento reduzido ou economia de dados fica no 1º quadro
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) finStart(); else safePause(finVideo); });
      }, { rootMargin: '60% 0px' }).observe(destaques);
    } else { finStart(); }
  }

  // os cards de destaque: começam fora da tela e sobem sozinhos quando a seção chega (a subida não depende da rolagem)
  if (destaques && 'IntersectionObserver' in window) {
    if (!reduce) setRise(0);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio >= 0.5) playRise(); });
    }, { threshold: [0, 0.5, 1] }).observe(destaques);
  }

  // gancho para testes e para a próxima etapa
  window.DGEscolha = { choose: choose, rewind: rewind, skipAll: skipAll, boost: boost, state: function () { return state; } };

  } catch (err) {
    // qualquer falha na inicialização: a experiência some e a página inteira fica liberada
    // (a trava de rolagem só é armada depois da inicialização, então aqui não há o que soltar)
    if (window.console) console.error('[escolha] desativada:', err);
    root.hidden = true;
  }
})();
