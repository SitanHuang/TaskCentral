let _metrics_con;
let _metrics_mtime;
let _metrics_css_inserted;

function ui_menu_select_metrics() {
  _metrics_con = $('.content-container > div.metrics');

  let target_provider = () => METRICS_QUERY;
  let callback_provider = () => ui_metrics_render;

  if (_metrics_mtime != (_metrics_mtime = back.mtime))
    ui_metrics_render();

  ui_filter_update_holders(target_provider, callback_provider);
}

const METRICS_DEFAULT_QUERY = (() => {
  let query = {
    queries: [{
      status: [],
      hidden: null,
      due: null,
      projects: [],
      collect: ['tasks'],
    }]
  };
  // default last 1 months to future 4 months

  let now = new Date();
  now.setHours(0, 0, 0, 0);

  let day = now.getDay();

  // get monday (assume monday is first day of week)
  now.setDate(now.getDate() - day + (day == 0 ? -6 : 1)); // adjust when day is sunday
  query.queries[0].from = now.getTime();

  // get sunday (last day of week, assuming monday is first day of week)
  now.setDate(now.getDate() + 7);
  query.queries[0].to = now.getTime();

  return query;
})();

METRICS_QUERY = JSON.parse(JSON.stringify(METRICS_DEFAULT_QUERY));

function ui_metrics_render(stamp, chevron) {
  console.time('Re-render metrics');

  stamp = stamp || METRICS_QUERY.queries[0].from;
  let diff = METRICS_QUERY.queries[0].to - METRICS_QUERY.queries[0].from;

  let startDate = new Date(stamp);
  let endDate = new Date(stamp + diff);
  let days = Math.ceil((endDate - startDate) / 8.64e+7);

  let container = _metrics_con;

  container
    .find('.title')
    .text(startDate.toLocaleDateString() + ' - ' + endDate.toLocaleDateString());

  container.find('.fa.fa-chevron-left')[0].onclick = () => {
    ui_metrics_render(stamp - diff, true);
  };
  container.find('.fa.fa-chevron-right')[0].onclick = () => {
    ui_metrics_render(stamp + diff, true);
  };

  console.timeEnd('Re-render metrics');
}
