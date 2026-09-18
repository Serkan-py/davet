(() => {
  'use strict';
  const music = document.querySelector('#wedding-music');
  const button = document.querySelector('[data-music-toggle]');
  if (!music || !button) return;
  music.controls = false;
  const label = button.querySelector('.music-control-label');
  let enabled = true;
  let resumeOnReturn = false;
  let unavailable = false;
  let requestGeneration = 0;

  const syncUI = () => {
    const playing = !music.paused && !music.ended;
    const text = playing ? 'Müziği kapat' : 'Müziği aç';
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', text);
    button.setAttribute('title', text);
    if (label) label.textContent = text;
  };

  // play(), dokunma olayının içinde doğrudan çağrılır; öncesinde timer,
  // fetch veya await yoktur. Tarayıcının kullanıcı etkinleştirmesi korunur.
  const start = async () => {
    if (!enabled || unavailable || document.hidden) return false;
    const generation = ++requestGeneration;
    music.muted = false;
    try { music.volume = 0.24; } catch (_) { /* Ses düzeyini cihaz yönetebilir. */ }
    try {
      await music.play();
      if (!enabled || document.hidden) {
        music.pause();
        syncUI();
        return false;
      }
      if (generation === requestGeneration) syncUI();
      return true;
    } catch (_) {
      // İzin reddedilmesi, düğmede gerçekte çalmayan sesi açık göstermemeli.
      if (generation === requestGeneration) syncUI();
      return false;
    }
  };

  const stopByUser = () => {
    enabled = false;
    resumeOnReturn = false;
    requestGeneration += 1;
    music.autoplay = false;
    music.pause();
    syncUI();
  };

  const firstInteraction = event => {
    if (event.target?.closest?.('[data-music-toggle]')) return;
    if (event.type === 'keydown' && !['Enter', ' ', 'Spacebar'].includes(event.key)) return;
    if (enabled && music.paused) start();
  };
  // touchend, Safari'nin dokunma sonundaki etkinleştirmesini de yakalar.
  // Olaylar kaydırmayı engellemez ve kullanıcı sesi kapattıysa ses açılmaz.
  document.addEventListener('touchend', firstInteraction, { capture: true, passive: true });
  document.addEventListener('pointerup', firstInteraction, { capture: true, passive: true });
  document.addEventListener('click', firstInteraction, true);
  document.addEventListener('keydown', firstInteraction, true);

  button.addEventListener('click', event => {
    event.stopPropagation();
    if (!music.paused) stopByUser();
    else {
      enabled = true;
      music.autoplay = true;
      start();
    }
  });

  music.addEventListener('play', () => {
    if (!enabled || document.hidden) music.pause();
    syncUI();
  });
  music.addEventListener('playing', syncUI);
  music.addEventListener('pause', syncUI);
  music.addEventListener('ended', syncUI);
  const onError = () => {
    unavailable = true;
    enabled = false;
    music.autoplay = false;
    music.pause();
    button.hidden = true;
  };
  music.addEventListener('error', onError);
  music.querySelectorAll('source').forEach(source => source.addEventListener('error', onError));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resumeOnReturn = enabled && !music.paused;
      music.pause();
    } else if (resumeOnReturn) {
      resumeOnReturn = false;
      start();
    }
  });
  window.addEventListener('pagehide', () => {
    resumeOnReturn = resumeOnReturn || (enabled && !music.paused);
    music.pause();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && resumeOnReturn && enabled) {
      resumeOnReturn = false;
      start();
    }
  });
  // Yükleme sonundaki deneme, kullanıcının kapatma kararını geri alamaz.
  window.addEventListener('load', () => {
    if (enabled && music.paused && !document.hidden) start();
  }, { once: true });

  music.preload = 'auto';
  syncUI();
  start();
})();
