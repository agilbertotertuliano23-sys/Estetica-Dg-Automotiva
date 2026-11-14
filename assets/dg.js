const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
  mobileNav.hidden = isOpen;
});

mobileNav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
  });
});

const dialog = document.querySelector('.service-dialog');
const dialogImage = dialog?.querySelector('.dialog-image');
const dialogVideo = dialog?.querySelector('.dialog-video');
const dialogTitle = dialog?.querySelector('#dialog-title');
const dialogDescription = dialog?.querySelector('#dialog-description');
const dialogSource = dialog?.querySelector('.dialog-source');
const dialogBody = dialog?.querySelector('.dialog-copy');
const dialogSub = dialog?.querySelector('.dialog-sub');
const dialogList = dialog?.querySelector('.dialog-list');
const dialogResult = dialog?.querySelector('.dialog-result');
const dialogWhats = dialog?.querySelector('.dialog-whats');
const dialogInsta = dialog?.querySelector('.dialog-insta');
const dialogHint = dialog?.querySelector('.dialog-hint');
const mirrorTransition = document.querySelector('.mirror-transition');
let openingService = false;

// Mensagens prontas por servico: o WhatsApp abre a conversa ja com o texto; o Instagram nao aceita texto pronto, entao a mensagem e copiada
const WHATS_NUMBER = '5583999080287';
const INSTA_USER = 'douglas_da__estetica';
const serviceMessages = {
  'Limpeza completa': 'Olá, DG! Vi no site a Limpeza completa (exterior + interior) e quero agendar uma avaliação. Podem me passar valores e horários disponíveis?',
  'Higienização detalhada': 'Olá, DG! Vi no site a Higienização detalhada e quero saber como funciona e o valor para o meu carro. Têm horário disponível?',
  'Lavagem técnica': 'Olá, DG! Tenho interesse na Lavagem técnica. Podem me passar o valor e os próximos horários livres?',
  'Descontaminação da pintura': 'Olá, DG! Quero saber sobre a Descontaminação da pintura. Podem avaliar meu carro e me passar o valor?',
  'Polimento técnico': 'Olá, DG! Quero agendar uma avaliação para o Polimento técnico da pintura do meu carro. Quais os valores e horários?',
  'Vitrificação da pintura': 'Olá, DG! Tenho interesse na Vitrificação da pintura. Podem me explicar como é o processo e passar o valor?',
  'Couro e plásticos': 'Olá, DG! Quero saber sobre o cuidado de Couro e plásticos do interior. Podem me passar o valor e os horários?',
  'Rodas e pneus': 'Olá, DG! Tenho interesse na limpeza de Rodas e pneus. Qual o valor e quando posso levar o carro?',
  // serviços para moto (cards que sobem e grade de serviços): o título leva "da moto" para não colidir com os de carro
  'Lavagem técnica completa da moto': 'Olá, DG! Tenho uma moto e quero saber sobre a Lavagem técnica completa. Podem me passar o valor e os horários disponíveis?',
  'Polimento técnico da moto': 'Olá, DG! Tenho uma moto e quero saber sobre o Polimento técnico da pintura. Podem avaliar e me passar o valor?',
  'Vitrificação da pintura da moto': 'Olá, DG! Tenho uma moto e tenho interesse na Vitrificação da pintura. Podem me explicar como é o processo e passar o valor?',
  'Limpeza de rodas e pneus': 'Olá, DG! Tenho uma moto e quero saber sobre a Limpeza de rodas e pneus. Podem me passar o valor e os horários disponíveis?',
  'Limpeza do banco e dos plásticos': 'Olá, DG! Tenho uma moto e quero saber sobre a Limpeza do banco e dos plásticos. Podem me passar o valor e os horários disponíveis?',
  'Limpeza externa do motor': 'Olá, DG! Tenho uma moto e quero saber sobre a Limpeza externa do motor. Podem me passar o valor e os horários disponíveis?',
  'Limpeza e lubrificação da relação': 'Olá, DG! Tenho uma moto e quero saber sobre a Limpeza e lubrificação da relação. Podem me passar o valor e os horários disponíveis?'
};
let currentMessage = '';
const messageFor = title => serviceMessages[title] || `Olá, DG! Vim pelo site e tenho interesse em ${title}. Podem me passar valores e horários disponíveis?`;

dialogInsta?.addEventListener('click', () => {
  navigator.clipboard?.writeText(currentMessage).then(() => { if (dialogHint) dialogHint.hidden = false; }).catch(() => {});
});

// Os cards abrem com duplo clique (ou duplo toque); o primeiro toque so "acende" o card. Teclado (Enter/Espaco) abre direto.
const DOUBLE_TAP_MS = 900;
let armed = null;
let armedAt = 0;
let armTimer = 0;
const disarm = () => {
  window.clearTimeout(armTimer);
  armed?.classList.remove('is-armed');
  armed = null;
};

document.querySelectorAll('.service-open').forEach(button => {
  const openService = () => {
    if (!dialog || openingService) return;
    openingService = true;
    const openDialog = () => {
      const videoUrl = button.dataset.video;
      dialogImage.hidden = Boolean(videoUrl);
      dialogVideo.hidden = !videoUrl;
      dialog.classList.toggle('has-video', Boolean(videoUrl));
      if (videoUrl) {
        dialogVideo.src = videoUrl;
        dialogVideo.poster = videoUrl.replace(/\.mp4$/, '.jpg');
        dialogVideo.setAttribute('aria-label', `Demonstração de ${button.dataset.title}`);
      } else {
        dialogImage.src = button.dataset.image;
        dialogImage.alt = button.querySelector('img')?.alt || button.querySelector('[role="img"]')?.getAttribute('aria-label') || '';
      }
      dialogSource.hidden = !button.dataset.source;
      if (button.dataset.source) dialogSource.href = button.dataset.source;
      dialogTitle.textContent = button.dataset.title;
      currentMessage = messageFor(button.dataset.title);
      if (dialogWhats) dialogWhats.href = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(currentMessage)}`;
      if (dialogInsta) dialogInsta.href = `https://ig.me/m/${INSTA_USER}`;
      if (dialogHint) dialogHint.hidden = true;
      dialogDescription.textContent = button.dataset.description;
      const itens = (button.dataset.itens || '').split('|').filter(Boolean);
      dialogList.replaceChildren(...itens.map(texto => Object.assign(document.createElement('li'), { textContent: texto })));
      dialogList.hidden = dialogSub.hidden = !itens.length;
      dialogResult.hidden = !button.dataset.resultado;
      dialogResult.querySelector('span').textContent = button.dataset.resultado || '';
      dialogBody.scrollTop = 0;
      dialog.showModal();
      document.body.classList.add('dialog-open');
      openingService = false;
      if (videoUrl) dialogVideo.play().catch(() => {});
    };
    if (mirrorTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      mirrorTransition.classList.remove('is-active');
      void mirrorTransition.offsetWidth;
      mirrorTransition.classList.add('is-active');
      window.setTimeout(() => {
        mirrorTransition.classList.remove('is-active');
        openDialog();
      }, 580);
    } else {
      openDialog();
    }
  };
  button.addEventListener('click', event => {
    const now = Date.now();
    if (event.detail === 0 || event.detail >= 2 || (armed === button && now - armedAt < DOUBLE_TAP_MS)) {
      disarm();
      openService();
      return;
    }
    disarm();
    armed = button;
    armedAt = now;
    button.classList.add('is-armed');
    armTimer = window.setTimeout(disarm, 1800);
  });
});
document.addEventListener('pointerdown', event => {
  if (armed && !armed.contains(event.target)) disarm();
});

dialog?.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  dialogVideo.pause();
  dialogVideo.removeAttribute('src');
  dialogVideo.load();
});
dialog?.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});

// Fundo de pontos (WebGL2): só a partir da logo (#marca) até o fim de #fechamento; recortado pelo topo da logo.
const dotBg = document.querySelector('.dot-bg');
const dotCanvas = dotBg?.querySelector('canvas');
if (dotCanvas && window.createDotGrid) {
  const dots = window.createDotGrid(dotCanvas, {
    dotSize: 4, gap: 20, baseColor: '#2a2623', activeColor: '#ff6a00', proximity: 150,
    shockRadius: 320, shockStrength: 5, glow: 0.5, opacity: 1
  });
  if (dots) {
    dotBg.classList.add('is-ready');
    const start = document.getElementById('marca');
    const limit = document.getElementById('fechamento');
    let shown = null;
    const check = () => {
      const top = start ? start.getBoundingClientRect().top : 0;
      const show = top < window.innerHeight && (!limit || limit.getBoundingClientRect().bottom > 0);
      dotBg.style.clipPath = show ? 'inset(' + Math.max(0, Math.round(top)) + 'px 0 0 0)' : '';
      if (show === shown) return;
      shown = show;
      dotBg.classList.toggle('is-off', !show);
      dots.setPaused(!show);
    };
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
  }
}

// Card "Couro e conforto": toca a limpeza e, em seguida, o resultado; depois recomeça.
{
  const clips = [...document.querySelectorAll('video[data-seq]')];
  const tag = document.querySelector('.seq-tag');
  if (clips.length > 1) {
    const go = (i) => {
      clips.forEach((v, k) => v.classList.toggle('on', k === i));
      if (tag) tag.textContent = i === 0 ? 'LIMPANDO' : 'RESULTADO';
      clips[i].currentTime = 0;
      clips[i].play().catch(() => {});
    };
    clips.forEach((v, i) => v.addEventListener('ended', () => go((i + 1) % clips.length)));
  }
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
