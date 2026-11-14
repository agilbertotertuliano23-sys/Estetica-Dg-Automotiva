/* ============================================================================
   CARGA SOB DEMANDA
   ----------------------------------------------------------------------------
   Para aguentar muitos acessos, a abertura da página só baixa o que aparece primeiro
   (o filme, que anda com a rolagem). O resto espera chegar perto da tela:

   1. as faixas de animação dos serviços (imagens de fundo no CSS, ~5 MB):
      veiculo.css as esconde até <html> ganhar .strips-on, o que acontece quando a
      seção de serviços está a pouco mais de uma tela de distância;
   2. os vídeos da seção "detalhes" (data-lazy-src): carregam perto da tela, tocam
      só enquanto visíveis e pausam ao sair.

   Sem IntersectionObserver ou com erro, tudo é liberado de uma vez (como era antes).
   Com movimento reduzido ou economia de dados, os vídeos não tocam sozinhos.
   ========================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var lite = !!(conn.saveData || /2g$/.test(conn.effectiveType || ''));

  function releaseAll() {
    html.classList.add('strips-on');
    Array.prototype.forEach.call(document.querySelectorAll('video[data-lazy-src]'), function (v) {
      if (!v.src) v.src = v.getAttribute('data-lazy-src');
    });
  }

  try {
    if (!('IntersectionObserver' in window)) { releaseAll(); return; }

    // 1) faixas de animação dos serviços
    var servicos = document.getElementById('servicos');
    if (servicos) {
      new IntersectionObserver(function (entries, io) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          html.classList.add('strips-on');
          io.disconnect();
        });
      }, { rootMargin: '120% 0px' }).observe(servicos);
    } else {
      html.classList.add('strips-on');
    }

    // 2) vídeos da seção "detalhes"
    var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-lazy-src]'));
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.src) { v.src = v.getAttribute('data-lazy-src'); v.preload = 'auto'; }
          if (v.hasAttribute('data-lazy-play') && !reduce && !lite) {
            var p = v.play(); if (p && p.catch) p.catch(function () {});
          }
        } else if (v.hasAttribute('data-lazy-play')) {
          v.pause();
        }
      });
    }, { rootMargin: '60% 0px' });
    videos.forEach(function (v) { seen.observe(v); });
  } catch (err) {
    if (window.console) console.error('[carga] liberando tudo:', err);
    releaseAll();
  }
})();
