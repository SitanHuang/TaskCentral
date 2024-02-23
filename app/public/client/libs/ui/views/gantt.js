let _gantt_con;
let _gantt_mtime;
let _gantt_css_inserted;

function ui_menu_select_gantt() {
  _gantt_con = $('.content-container > div.gantt');

  let target_provider = () => GANTT_QUERY;
  let callback_provider = () => ui_gantt_render;

  if (_gantt_mtime != (_gantt_mtime = back.mtime))
    ui_gantt_render();

  if (!_gantt_css_inserted) {
    _gantt_css_inserted = true;
    document.head.insertAdjacentHTML(
      "beforeend",
      `<style>
      .content-container > div.gantt {
        --gantt-day-width: ${GANTT_DAY_WIDTH}px;
      }
      </style>`
    );
  }

  ui_filter_update_holders(target_provider, callback_provider);
}

const GANTT_DEFAULT_QUERY = (() => {
  let query = {
    queries: [{
      status: [],
      collect: ['tasks'],
      hidden: false,
    }]
  };
  // default last 1 months to future 4 months

  let now = new Date();

  now.setDate(1); // set to first day of month
  now.setHours(0, 0, 0, 0); // set to midnight

  now.setMonth(now.getMonth() - 1);
  query.queries[0].from = now.getTime();

  now.setMonth(now.getMonth() + 1 + 4);
  query.queries[0].to = now.getTime();

  return query;
})();

GANTT_QUERY = JSON.parse(JSON.stringify(GANTT_DEFAULT_QUERY));

GANTT_DAY_WIDTH = 40; // px

// should only be executed on initial load/query change
async function ui_gantt_render() {
  console.time('Re-render gantt');

  let container = _gantt_con.find('gantt-container');
  let header = container.find('gantt-header').html('');
  let graph = container.find('gantt-graph').html('');

  const diff = GANTT_QUERY.queries[0].to - GANTT_QUERY.queries[0].from;

  // if more than 1 year
  if (1 < diff / 3.154e+10) {
    if (!(await ui_confirm(`Query range is too big (${timeIntervalStringShort(diff, 0, Infinity)}). App might freeze. Continue?`)))
      return false;
  }

  let tasks = query_exec(GANTT_QUERY)[0].tasks;

  let range = [GANTT_QUERY.queries[0].from, GANTT_QUERY.queries[0].to];
  let [from, to] = range;
  let days = Math.ceil((to - from) / 8.64e+7);

  let tracks = query_generate_gantt_tracks(tasks, range);

  let today_indicator;

  // =========== create header ===========
  let _previousLeft = 0;

  for (
    let index = new Date(from);
    // first day less than end
    index <= to;
    // go to first day of next month
    index.setDate(1) &&
    index.setMonth(index.getMonth() + 1)
  ) {
    // total number of days this month / to
    let maxDays = new Date(Math.min(
      new Date(index.getFullYear(), index.getMonth() + 1, 0),
      to
    )).getDate();
    // index might not start with first day of month
    let days = maxDays - index.getDate() + 1;

    let date = $(document.createElement('date'));
    let width = days * GANTT_DAY_WIDTH;
    date
      .css('width', width)
      .css('left', _previousLeft + 1)
      .text(index.toLocaleString('default', { month: 'long' }) +
            ' ' + index.getFullYear())
      .appendTo(header);

    for (let day = index.getDate(); day <= maxDays; day++) {
      let date2 = $(document.createElement('date'));
      date2
        .css('width', GANTT_DAY_WIDTH)
        .css('top', 'calc(2 * var(--header-row-height))')
        .css('left', _previousLeft + 1)
        .text(day)
        .appendTo(header);

      if (isToday(new Date(index.getFullYear(), index.getMonth(), day))) {
        date2.addClass('today');

        let now = new Date();
        let percOfDay = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000) / 86400;

        today_indicator = $(document.createElement('today'));
        today_indicator.attr('id', 'gantt-today-indicator');
        today_indicator.css('left', _previousLeft + percOfDay * GANTT_DAY_WIDTH);
        today_indicator.appendTo(graph);
      }

      let dow = (index.getDay() + (day - index.getDate())) % 7;
      let code = [' ', 'M', 'T', 'W', 'R', 'F', ' '][dow];

      let date3 = $(document.createElement('date'));
      let width = GANTT_DAY_WIDTH;
      date3
        .css('width', width)
        .css(
          'border-right',
          dow == 0 || dow == 5 ? '1px solid var(--gantt-border-color)' : '0'
        )
        .css('top', 'var(--header-row-height)')
        .css('left', _previousLeft + 1)
        .text(code)
        .appendTo(header);

      _previousLeft += GANTT_DAY_WIDTH;
    }
  }

  header.css('width', _previousLeft + 1);

  // =========== create graph ===========
  // backdrop:
  graph
    .attr(
      'style',
      `
        width: ${GANTT_DAY_WIDTH * (days + 1)}px;
        height: ${GANTT_DAY_WIDTH * tracks.length}px;
      `
    );

  const PERIOD_PADDING = 5;

  // maps uuid to period elements
  const $periods = {};

  for (let row = 0;row < tracks.length; row++) {
    let track = tracks[row];

    for (let period of track) {
      let start = Math.ceil((period.from - from) / 8.64e+7) * GANTT_DAY_WIDTH;
      let length = (Math.ceil((period.to - period.from) / 8.64e+7) + 1) * GANTT_DAY_WIDTH;

      let proj = back.data.projects[period.task.project || 'default'];

      let $p = $(document.createElement('period'));
      $p.css('background-color', proj.color)
        .css('top', 'calc((var(--gantt-day-width) - var(--period-height)) / 2 + ' + (row * GANTT_DAY_WIDTH) + 'px)')
        .css('left', start + PERIOD_PADDING)
        .css('color', proj.fontColor)
        .css('width', length - PERIOD_PADDING * 2)
        .click(() => {
          ui_menu_select('home');
          ui_detail_select_task(period.task);
        })
        .appendTo(graph)
        [0].task = period.task;
      $p[0].row = row;
      $p[0].left = start + PERIOD_PADDING;
      $p[0].width = length - PERIOD_PADDING * 2;

      $periods[period.task.id] = $p[0];

      if (period.task.status == 'completed')
        $p.addClass('completed');

      if (period.task.status == 'default' && period.task.progress) {
        if (proj.fontColor.toLowerCase() != 'white')
          $p.css(
            'background-image',
            `linear-gradient(90deg, rgba(0,0,0,0.1) ${period.task.progress}%,
                                    rgba(0,0,0,0.1) ${period.task.progress}%,
                                    rgba(0,0,0,0) ${period.task.progress}%,
                                    rgba(0,0,0,0) 100%)`
          );
        else
          $p.css(
            'background-image',
            `linear-gradient(90deg, rgba(0,0,0,0.25) ${period.task.progress}%,
                                    rgba(0,0,0,0.25) ${period.task.progress}%,
                                    rgba(0,0,0,0) ${period.task.progress}%,
                                    rgba(0,0,0,0) 100%)`
          );
      }

      if (!period.startCapped)
        $p.addClass('start-round');
      if (!period.endCapped)
        $p.addClass('end-round');

      let text = $(document.createElement('span'));
      text
        .text(period.task.name.trim())
        .appendTo($p);

      let spanWidth = text[0].offsetWidth;

      // if containable, repeat
      if (spanWidth <= $p[0].offsetWidth) {
        $p.css('text-align', 'left');

        let interval = Math.ceil(Math.max(
          spanWidth + GANTT_DAY_WIDTH,
          window.innerWidth * 0.75,
          GANTT_DAY_WIDTH * 15
        ));

        interval = Math.min(interval, $p[0].offsetWidth);

        text.css('min-width', interval);

        let repeats = $p[0].offsetWidth / interval + 1;
        for (let i = 1;i < repeats;i++) {
          text.clone().appendTo($p);
        }

      } else { // or overlay + visible
        let clone = $p.clone();
        clone
          .css('color', '')
          .addClass('overlay')
          .appendTo(graph);
      }
    }
  }

  _ui_gantt_render_dependencies($periods, graph, PERIOD_PADDING);
  ui_gantt_scroll_to_today();

  if (localStorage.ganttShowDep)
    ui_gantt_show_dependencies();
  else
    ui_gantt_hide_dependencies();

  console.timeEnd('Re-render gantt');
}

function _ui_gantt_render_dependencies($periods, graph, PERIOD_PADDING) {
  for (const id in $periods) {
    const $p = $periods[id];
    const task = $p.task;

    const $hoverGroup = [$p];

    for (const id2 in (task.dependedBy || {})) {
      const $p2 = $periods[id2];
      const child = $p2?.task;

      $hoverGroup.push($p2);

      if (!child)
        continue;

      const proj = back.data.projects[child.project || 'default'];

      // create vertical line
      if ($p.row != $p2.row) {
        const low = Math.min($p.row, $p2.row);
        const high = Math.max($p.row, $p2.row);

        let $d = $(document.createElement('depends'));
        $d.css('--proj-color', proj.color)
          .css('top', 'calc((var(--gantt-day-width) - var(--period-height)) / 2 + ' + ((low + 0.27) * GANTT_DAY_WIDTH) + 'px)')
          .css('height', (high - low + 0.25) * GANTT_DAY_WIDTH)
          .css('left', $p.left + $p.width - GANTT_DAY_WIDTH * 0.45)
          .css('color', proj.fontColor)
          .addClass('vertical')
          .appendTo(graph);
        if (child.status == 'completed' && task.status == 'completed')
          $d.addClass('completed');
        $hoverGroup.push($d);
      }

      if ($p.left != $p2.left) {
        // create horizontal line
        let $d = $(document.createElement('depends'));
        $d.css('--proj-color', proj.color)
          .css('top', 'calc((var(--gantt-day-width) - var(--period-height)) / 2 + ' + (($p2.row + 0.27) * GANTT_DAY_WIDTH) + 'px)')
          .css('width', $p2.left - ($p.left + $p.width - GANTT_DAY_WIDTH))
          .css('left', $p.left + $p.width - GANTT_DAY_WIDTH * 0.45)
          .css('color', proj.fontColor)
          .appendTo(graph);
        if (child.status == 'completed' && task.status == 'completed')
          $d.addClass('completed');
        $hoverGroup.push($d);
      }
    }

    $hoverGroup.forEach(ele => {
      ele = $(ele);
      ele.on("mouseenter", function () {
        $hoverGroup.forEach(hover => $(hover).addClass('hover'));
      });
      ele.on("mouseleave", function () {
        $hoverGroup.forEach(hover => $(hover).removeClass('hover'));
      });
    });
  }
}

function ui_gantt_scroll_to_today() {
  let today_indicator = document.getElementById('gantt-today-indicator');
  let container = _gantt_con.find('gantt-container');
  if (today_indicator) {
    container[0].scrollLeft = Math.max(
      0,
      today_indicator.offsetLeft - container[0].clientWidth / 3
    );
    if (!isFirefox())
      today_indicator.scrollIntoViewIfNeeded();
  }
}
function ui_gantt_show_dependencies(btn) {
  localStorage.ganttShowDep = true;
  _gantt_con.find('button.show-dependencies').hide().next().show();
  _gantt_con.find('gantt-graph').addClass('show-dependencies');
}
function ui_gantt_hide_dependencies(btn) {
  delete localStorage.ganttShowDep;
  _gantt_con.find('button.hide-dependencies').hide().prev().show();
  _gantt_con.find('gantt-graph').removeClass('show-dependencies');
}
