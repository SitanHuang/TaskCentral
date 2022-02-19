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

var ui_metrics_render;
{
  let tasks;
  let days;
  let hours;
  let startDate;
  let endDate;
  
  /*
  TODO:
  tasks involved (all),
  tasks ready (all),
  intervals (all),
  intervals per day (all),
  time per day (all),
  time recorded (all),
  time per interval (all),

  ========= has priority & weight =========

  tasks involved,
  tasks ready,
  tasks remaining at start (with progress),
  tasks remaining at end (with progress),
  tasks remaining at start (without progress),
  tasks remaining at end (without progress),
  tasks completed (with progress),
  tasks completed (without progress),
  tasks completed per day (with progress),
  tasks completed per day (without progress),
  avg. perc remaining when completed (including overdue),
  intervals,
  intervals per day (all),
  time per day (all),
  time recorded (all),
  time per interval (all),
  time recorded,
  tasks completed per interval (with progress),
  tasks completed per time (with progress)
  */

  const functions = {
    days: (start, end) => Math.ceil((end - start) / 8.64e+7)
  };

  ui_metrics_render = function (stamp, chevron) {
    function _add_metric(name, html, exp) {
      exp = exp || '';
      container.find('.content.pure-g').append(
        `<stat class="pure-u-1-1 pure-u-md-12-24 pure-u-lg-1-5">
          <strong>${name}</strong>
          ${html}
          <span class="explanation">${exp}</span>
        </stat>`
      );
    }
    
    console.time('Re-render metrics');
  
    stamp = stamp || METRICS_QUERY.queries[0].from;
    let diff = METRICS_QUERY.queries[0].to - METRICS_QUERY.queries[0].from;
  
    startDate = new Date(stamp);
    endDate = new Date(stamp + diff);
    days = Math.ceil((endDate - startDate) / 8.64e+7);
    hours = Math.ceil((endDate - startDate) / 3.6e+6);
  
    tasks = query_exec(METRICS_QUERY).tasks;
  
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
  
    container.find('.content.pure-g').html('');
  
    for (let f in functions)
      _add_metric(f, functions[f](startDate, endDate));
  
    console.timeEnd('Re-render metrics');
  };
};
