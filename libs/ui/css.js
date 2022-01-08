(function() {
  document.getElementById('splash').className = 'init';
  document.getElementById('splash-status').innerText = 'Loading CSS';

  const links = [
    'libs/ui/fontawesome/css/all.css',

    // components
    'libs/ui/micromodal.css',
    'libs/ui/sliders.css',

    // pure
    'libs/ui/pure-min.css',
    'libs/ui/grids-responsive-min.css',

    'libs/ui/index.css',
    
    'libs/ui/views/home.css',
    'libs/ui/views/details.css',
  ];

  const images = [
    'assets/nothing.png'
  ];

  const assets_length = links.length + images.length;

  let counter = 0;
  function link_onload() {
    document.getElementById('splash-status').innerText = `Loading assets ${counter + 1}/${assets_length}`;
    if (++counter >= assets_length) {
      // all stylesheets loaded
      document.getElementById('splash-status').innerText = 'Loading JS...';
      window.addEventListener('load', function() {
        // all js files loaded
        document.getElementById('splash-status').innerText = 'Downloading data...';

        back.init().then(function() {
          back.start_monitor();
          ui_update_sync_status();
          ui_menu_init();

          if (back.data.started)
            timer_start_task(back.data.tasks[back.data.started]);

          // wait til transitions finish
          setTimeout(() => {
            document.getElementById('splash').remove();
          }, 200);
        });
      });
    }
  }

  images.forEach(x => {
    let img = new Image();
    img.src = x;
    img.onload = link_onload;
  });

  links.forEach(x => {
    var link = document.createElement('link');
    link.href = x;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.onload = link_onload;
    document.getElementsByTagName('head')[0].appendChild(link);
  });
})();