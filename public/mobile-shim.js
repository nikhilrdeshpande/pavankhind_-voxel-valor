// Dev: add ?mobile to URL to force mobile mode on desktop for testing
if (new URLSearchParams(location.search).has('mobile')) {
  var origMM = window.matchMedia;
  window.matchMedia = function(q) {
    if (q === '(pointer: coarse)') return { matches: true, media: q, onchange: null, addListener: function(){}, removeListener: function(){}, addEventListener: function(){}, removeEventListener: function(){}, dispatchEvent: function(){ return true; } };
    return origMM.call(window, q);
  };
  Object.defineProperty(navigator, 'maxTouchPoints', { get: function(){ return 5; }, configurable: true });
}
