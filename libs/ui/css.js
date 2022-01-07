(function() {
  document.getElementById('splash').className = 'init';
  document.getElementById('splash-status').innerText = 'Loading CSS';

  const links = [
    'libs/ui/fontawesome/css/all.css',

    'libs/ui/micromodal.css',

    'libs/ui/pure-min.css',
    'libs/ui/grids-responsive-min.css',

    'libs/ui/index.css',
    
    'libs/ui/views/home.css',
  ];

  let counter = 0;
  function link_onload() {
    document.getElementById('splash-status').innerText = `Loading CSS ${counter + 1}/${links.length}`;
    if (++counter >= links.length) {
      // all stylesheets loaded
      document.getElementById('splash-status').innerText = 'Loading JS...';
      window.addEventListener('load', function() {
        // all js files loaded
        document.getElementById('splash-status').innerText = 'Downloading data...';

        back.init().then(function() {
          back.start_monitor();
          ui_update_sync_status();
          ui_menu_init();

          // wait til transitions finish
          setTimeout(() => {
            document.getElementById('splash').remove();
          }, 200);
        });
      });
    }
  }

  links.forEach(x => {
    var link = document.createElement('link');
    link.href = x;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.onload = link_onload;
    document.getElementsByTagName('head')[0].appendChild(link);
  });
})();