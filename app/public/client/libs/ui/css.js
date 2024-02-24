(function() {
  document.getElementById('splash').className = 'init';
  document.getElementById('splash-status').innerText = 'Loading CSS';

  const links = [
    'libs/external/fontawesome/css/all.css',

    // components
    'libs/external/micromodal.css',
    'libs/ui/sliders.css',

    // pure
    'libs/external/pure-min.css',
    'libs/external/grids-responsive-min.css',

    // d3
    'libs/external/d3_timeseries.min.css',

    'libs/ui/index.css',

    'libs/ui/views/home.css',
    'libs/ui/views/details.css',
    'libs/ui/views/gantt.css',
    'libs/ui/views/log.css',
    'libs/ui/views/metrics.css',
    'libs/ui/views/forecast.css',
    'libs/ui/views/settings.css',

    'libs/ui/themes/index.css',
    'libs/ui/themes/default-dark/colors.css',
    'libs/ui/themes/solarized/colors.css',
    'libs/ui/themes/solarized-dark/colors.css',
    'libs/ui/themes/pink/colors.css',
    'libs/ui/themes/pink-dark/colors.css',
    'libs/ui/themes/nord/colors.css',
    'libs/ui/themes/nord-dark/colors.css',
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

          if (back.user.status >= 99)
            $('.su-only').show();

          if (back.data.started)
            timer_start_task(back.data.tasks[back.data.started]);

          ui_settings_apply_user_stylesheets();

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
    img.src = x + '?releaseDate=' + encodeURIComponent(RELEASE_DATE);
    img.onload = link_onload;
  });

  links.forEach(x => {
    var link = document.createElement('link');
    link.href = x + '?releaseDate=' + encodeURIComponent(RELEASE_DATE);
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.onload = link_onload;
    document.getElementsByTagName('head')[0].appendChild(link);
  });
})();
