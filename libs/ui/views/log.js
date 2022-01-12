let _log_con;
let _log_mtime;
let _log_css_inserted;

function ui_menu_select_log() {
  _log_con = $('.content-container > div.log');

  let target_provider = () => LOG_QUERY;
  let callback_provider = () => ui_log_render;

  if (_log_mtime != (_log_mtime = back.mtime))
    ui_log_render();

  ui_filter_update_holders(target_provider, callback_provider);
}

const LOG_DEFAULT_QUERY = (() => {
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

  let day = now.getDay();
  
  // get monday (assume monday is first day of week)
  now.setDate(now.getDate() - day + (day == 0 ? -6 : 1)); // adjust when day is sunday
  query.queries[0].from = now.getTime();

  // get sunday (last day of week, assuming monday is first day of week)
  now.setDate(now.getDate() + 7);
  query.queries[0].to = now.getTime();

  return query;
})();

LOG_QUERY = JSON.parse(JSON.stringify(LOG_DEFAULT_QUERY));

// should only be executed on initial load/query change
function ui_log_render() {
  console.time('Re-render log');

  let container = _log_con.find('log-container');
  _ui_log_render_daily_render();

  console.timeEnd('Re-render log');
}

function _ui_log_render_daily_render() {
  let now = midnight();
  let daily = now >= LOG_QUERY.queries[0].from && now <= LOG_QUERY.queries[0].to ?
                now : LOG_QUERY.queries[0].from;
  _ui_log_render_daily_change(daily);
}

// date is reset after each render
// user interaction shouldn't trigger re-render
function _ui_log_render_daily_change(stamp) {
  let date = new Date(stamp);

  let periods = query_generate_log_daily_periods(
    query_generate_log_daily_tasks(LOG_QUERY, date),
    date
  ).sort((a, b) => b.from - a.from);
  
  let container = _log_con.find('daily');

  container.find('.title').text(
      date.toLocaleDateString(navigator.language, { weekday: 'long' }) +
      ' ' + date.toLocaleDateString()
  );

  container.find('.fa.fa-chevron-left')[0].onclick = () => {
    date.setDate(date.getDate() - 1);
    _ui_log_render_daily_change(date.getTime());
  };
  container.find('.fa.fa-chevron-right')[0].onclick = () => {
    date.setDate(date.getDate() + 1);
    _ui_log_render_daily_change(date.getTime());
  };

  let content = container.find('.content').html('');

  let total = 0;
  
  for (let period of periods) {
    total += period.to - period.from;

    let $p = $(document.createElement('period'));
    $p.html(
      `
      <name></name>
      <div class="project"></div>
      <time></time>
      `
    );
    $p.find('name').text(period.task.name);
    
    let proj = period.task.project;
    if (proj && back.data.projects[proj]) {
      project_create_chip(proj)
        .click(() => {
          LOG_QUERY.queries[0].projects.push(proj);
          ui_log_render();
          _ui_log_render_daily_change(stamp);
        })
        .appendTo($p.find('.project'));
    }

    $p.find('time').html(
      new Date(period.from).toLocaleTimeString() + ' - ' +
      new Date(period.to).toLocaleTimeString() +
      `<span>${timeIntervalStringShort(period.to - period.from)}</span>`
    );

    $p.click(() => {
        ui_menu_select('home');
        ui_detail_select_task(period.task);
      })
      .appendTo(content);
  }

  container.find('.stats num[name=num]')
    .text(periods.length);
  container.find('.stats num[name=avg]')
    .text(timeIntervalStringShort((total / periods.length) || 0));
  container.find('.stats num[name=sum]')
    .text(timeIntervalStringShort(total));
}