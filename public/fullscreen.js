// Enter fullscreen + lock landscape on first user interaction (mobile)
function enterFullscreenLandscape() {
  var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches);
  if (!isMobile) return;
  var el = document.documentElement;
  var rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (rfs) {
    rfs.call(el).then(function() {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function() {});
      }
      // Trigger resize so Three.js renderer updates
      setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 100);
      setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 500);
    }).catch(function() {});
  }
}
document.addEventListener('click', enterFullscreenLandscape, { once: true });
document.addEventListener('touchstart', enterFullscreenLandscape, { once: true });

// Re-trigger resize on fullscreen change so renderer adapts
document.addEventListener('fullscreenchange', function() {
  setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 100);
});
document.addEventListener('webkitfullscreenchange', function() {
  setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 100);
});
