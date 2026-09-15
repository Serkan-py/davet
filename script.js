(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Hero yazısı ilk kareyi rahat bırakır; sonra yumuşakça görünür.
  const heroCopy = document.querySelector('.hero-copy');
  if (reduced.matches) heroCopy?.classList.add('is-revealed');
  else window.setTimeout(() => heroCopy?.classList.add('is-revealed'), 1900);

  // İçerik görünürlük animasyonları.
  const revealItems = document.querySelectorAll('.reveal');
  if (reduced.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach(el => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6%' });
    revealItems.forEach(el => observer.observe(el));
  }

  // Çok düşük seviyeli derinlik/parallax.
  if (!reduced.matches) {
    let pointerFrame = 0;
    window.addEventListener('pointermove', event => {
      if (window.innerWidth < 768) return;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        root.style.setProperty('--pointer-x', x.toFixed(3));
        root.style.setProperty('--pointer-y', y.toFixed(3));
      });
    }, { passive: true });

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const hero = document.querySelector('.hero-stage');
        if (hero) {
          const progress = Math.max(0, Math.min(1, window.scrollY / Math.max(hero.offsetHeight, 1)));
          root.style.setProperty('--hero-scroll', progress.toFixed(3));
        }
        ticking = false;
      });
    }, { passive: true });
  }

  // Video: yalnızca oynat / duraklat. Video bittiğinde oynat simgesi görünür.
  const video = document.querySelector('.couple-video');
  const scene = document.querySelector('.meeting-scene');
  const endPoster = document.querySelector('.scene-end-poster');
  const toggle = document.querySelector('[data-video-toggle]');
  const playIcon = document.querySelector('[data-icon-play]');
  const pauseIcon = document.querySelector('[data-icon-pause]');

  const setIcon = state => {
    if (!toggle) return;
    if (playIcon) playIcon.hidden = state !== 'play';
    if (pauseIcon) pauseIcon.hidden = state !== 'pause';
    toggle.setAttribute('aria-label', state === 'pause' ? 'Videoyu durdur' : 'Videoyu başlat');
  };

  if (video) {
    const play = async () => {
      try {
        endPoster?.classList.remove('is-visible');
        if (video.ended) video.currentTime = 0;
        await video.play();
      } catch (_) {
        setIcon('play');
      }
    };

    video.addEventListener('loadeddata', () => video.classList.add('is-ready'), { once: true });
    video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
    video.addEventListener('play', () => {
      scene?.classList.add('is-started');
      setIcon('pause');
    });
    video.addEventListener('pause', () => {
      if (!video.ended) setIcon('play');
    });
    video.addEventListener('ended', () => {
      endPoster?.classList.add('is-visible');
      setIcon('play');
    });
    video.addEventListener('error', () => {
      video.style.display = 'none';
      if (toggle) toggle.hidden = true;
    });

    toggle?.addEventListener('click', () => {
      if (video.paused || video.ended) play();
      else video.pause();
    });

    let resume = false;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        resume = !video.paused && !video.ended;
        video.pause();
      } else if (resume && !reduced.matches) {
        resume = false;
        play();
      }
    });

    if (reduced.matches) setIcon('play');
    else play();
  }

  // Fon müziği: kök dizindeki music.m4a dosyasını kullanır.
  // Mobil kaydırmayı engellememek için yalnızca gerçek tıklamada kilit açılır.
  const music = document.querySelector('#wedding-music');
  const musicToggle = document.querySelector('[data-music-toggle]');
  const musicLabel = musicToggle?.querySelector('.music-control-label');
  let musicStarted = false;
  let musicShouldResume = false;

  const setMusicUI = playing => {
    if (!musicToggle) return;
    musicToggle.classList.toggle('is-playing', playing);
    musicToggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    musicToggle.setAttribute('aria-label', playing ? 'Müziği kapat' : 'Müziği aç');
    if (musicLabel) musicLabel.textContent = playing ? 'Müziği kapat' : 'Müziği aç';
  };

  const startMusic = async () => {
    if (!music) return false;
    try {
      music.volume = 0.24;
      await music.play();
      musicStarted = true;
      setMusicUI(true);
      return true;
    } catch (_) {
      setMusicUI(false);
      return false;
    }
  };

  const stopMusic = () => {
    if (!music) return;
    music.pause();
    setMusicUI(false);
  };

  if (music && musicToggle) {
    music.addEventListener('play', () => setMusicUI(true));
    music.addEventListener('pause', () => setMusicUI(false));
    music.addEventListener('error', () => {
      musicToggle.hidden = true;
    });

    musicToggle.addEventListener('click', async event => {
      event.stopPropagation();
      if (music.paused) await startMusic();
      else stopMusic();
    });

    const unlockMusic = async event => {
      if (event.target?.closest?.('[data-music-toggle]')) return;
      if (!musicStarted && music.paused) await startMusic();
      document.removeEventListener('click', unlockMusic, true);
      document.removeEventListener('keydown', unlockMusic, true);
    };
    document.addEventListener('click', unlockMusic, true);
    document.addEventListener('keydown', unlockMusic, true);

    // Tarayıcı izin verirse açılışta başlatmayı dener; izin vermezse ilk tıklama devralır.
    window.setTimeout(() => startMusic(), 900);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        musicShouldResume = !music.paused;
        if (musicShouldResume) music.pause();
      } else if (musicShouldResume) {
        musicShouldResume = false;
        startMusic();
      }
    });
  }

  // Zarif tek satır geri sayımlar.
  const countdowns = [...document.querySelectorAll('[data-countdown]')];
  const renderCountdown = card => {
    const target = Date.parse(card.dataset.countdown || '');
    const eventName = card.dataset.eventName || 'Kutlama';
    const out = card.querySelector('[data-countdown-values]');
    const label = card.querySelector('.countdown-label');
    if (!out || !Number.isFinite(target)) return;
    const diff = target - Date.now();
    if (diff <= 0) {
      if (label) label.textContent = eventName;
      out.textContent = 'Mutluluğumuzu bizimle paylaştığınız için teşekkür ederiz.';
      return;
    }
    const total = Math.floor(diff / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor(total / 3600) % 24;
    const minutes = Math.floor(total / 60) % 60;
    const seconds = total % 60;
    out.innerHTML = `<span><b>${days}</b> Gün</span><i>·</i><span><b>${String(hours).padStart(2,'0')}</b> Saat</span><i>·</i><span><b>${String(minutes).padStart(2,'0')}</b> Dakika</span><i>·</i><span><b>${String(seconds).padStart(2,'0')}</b> Saniye</span>`;
  };
  const tick = () => countdowns.forEach(renderCountdown);
  tick();
  window.setInterval(tick, 1000);
})();
