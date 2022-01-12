let _log_con;
let _log_mtime;
let _log_css_inserted;

function ui_menu_select_log() {
  _log_con = $('.content-container > div.log');

  let target_provider = () => LOG_QUERY;
  let callback_provider = () => ui_log_render;

  if (_log_mtime != (_log_mtime = back.mtime))
    ui_log_render();
  
  if (!_log_css_inserted) {
    _log_css_inserted = true;
    document.head.insertAdjacentHTML(
      "beforeend",
      `<style>
      .content-container > div.log {
        --log-cal-height: ${LOG_CAL_HEIGHT}px;
      }
      </style>`
    );
  }

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

LOG_QUERY = JSON.parse(JSON.stringify(LOG_DEFAULT_QUERY));

// should only be executed on initial load/query change
// date is reset after each render
// user interaction for each panel
// shouldn't trigger re-render of the entirety
function ui_log_render() {
  console.time('Re-render log');

  _ui_log_render_calendar();
  _ui_log_render_daily_render();

  console.timeEnd('Re-render log');
}

LOG_CAL_HEIGHT = 50 * 24;
function _ui_log_render_calendar(stamp, chevron) {
  stamp = stamp || LOG_QUERY.queries[0].from;
  let diff = LOG_QUERY.queries[0].to - LOG_QUERY.queries[0].from;

  let startDate = new Date(stamp);
  let endDate = new Date(stamp + diff);
  let days = Math.ceil((endDate - startDate) / 8.64e+7);

  let container = _log_con.find('cal');
  let daysHeader = container.find('.days-header').html('');
  let content = container.find('.content.backdrop-container').html('');

  container
    .find('.title')
    .text(startDate.toLocaleDateString() + ' - ' + endDate.toLocaleDateString());

  // if more than 1 month
  if (1 < (diff) / 2.592e+9) {
    if (!confirm('Calendar panel: Query range is too big. App might freeze. Continue?'))
      return false;
  }

  container.find('.fa.fa-chevron-left')[0].onclick = () => {
    _ui_log_render_calendar(stamp - diff, true);
  };
  container.find('.fa.fa-chevron-right')[0].onclick = () => {
    _ui_log_render_calendar(stamp + diff, true);
  };

  let query = { queries: [] };

  // make queries
  for (let i = 0;i < days;i++) {
    let _templ = JSON.parse(JSON.stringify(LOG_QUERY.queries[0]));
    _templ.from = stamp + i * 8.64e+7;
    _templ.to = _templ.from + 8.64e+7;

    query.queries.push(_templ);
  }

  // query results
  let result = query_exec(query);
  
  let totalPeriods = 0;
  let totalTime = 0;

  let _width = 100.0 / days;

  for (let tasks of result) {
    let day = new Date(tasks.from);
    tasks = tasks.tasks;

    let $day = $(document.createElement('day')).html(
      `
      <backdrop>
      </backdrop>
      `
    ).css('width', _width + '%');

    $(`
    <day>
      <date>
        <dow>${day.toLocaleDateString(navigator.language, { weekday: 'short' })}</dow>
        ${day.getDate()}
      </date>
    </day>
   `).css('width', _width + '%').appendTo(daysHeader);

    let backdrop = $day.find('backdrop');

    let periods = query_generate_log_daily_periods(tasks, day);
    totalPeriods += periods.length;
    for (let period of periods) {
      let duration = period.to - period.from;
      totalTime += duration;

      let percOfDay = new Date(period.from);
      percOfDay = percOfDay.getHours() / 24 +
                  percOfDay.getMinutes() / 24 / 60;
      
      let height = (duration / 8.64e+7) * LOG_CAL_HEIGHT;

      let $p = $(document.createElement('period'));

      let proj = back.data.projects[period.task.project || 'default'];

      $p.css('background', proj.color)
        .css('color', proj.fontColor)
        .css('top', LOG_CAL_HEIGHT * percOfDay)
        .css('height', height)
        .text(period.task.name.trim())
        .click(() => {
          ui_menu_select('home');
          ui_detail_select_task(period.task);
        })
        .appendTo(backdrop);
    }

    $day.appendTo(content);
  }

  // make gridlines
  for (let i = 0;i < 23;i++) {
    let hr = $(document.createElement('hour'))
      .css('bottom', LOG_CAL_HEIGHT - ((i + 1) * LOG_CAL_HEIGHT / 24))
      .text((i % 12 + 1) + (i > 10 ? 'pm' : 'am'))
      .appendTo(content);
  }

  if (!chevron)
    container.find('backdrop period:last-child').each(function () {
      this.scrollIntoViewIfNeeded();
    });

  container.find('.stats num[name=num]')
    .text(totalPeriods);
  container.find('.stats num[name=avg]')
    .text(timeIntervalStringShort((totalTime / totalPeriods) || 0));
  container.find('.stats num[name=sum]')
    .text(timeIntervalStringShort(totalTime));
}

function _ui_log_render_daily_render() {
  let now = midnight();
  let daily = now >= LOG_QUERY.queries[0].from && now <= LOG_QUERY.queries[0].to ?
                now : LOG_QUERY.queries[0].from;
  _ui_log_render_daily_change(daily);
}


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