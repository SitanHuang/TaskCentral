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
function ui_gantt_render() {
  console.time('Re-render gantt');

  let tasks = query_exec(GANTT_QUERY)[0].tasks;
  
  let range = [GANTT_QUERY.queries[0].from, GANTT_QUERY.queries[0].to];
  let [from, to] = range;
  let days = Math.ceil((to - from) / 8.64e+7);

  let tracks = query_generate_gantt_tracks(tasks, range);
  
  let container = _gantt_con.find('gantt-container');
  let header = container.find('gantt-header').html('');
  let graph = container.find('gantt-graph').html('');

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
      new Date(index.getFullYear(), index.getMonth()+1, 0),
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
      let width = GANTT_DAY_WIDTH;
      date2
        .css('width', width)
        .css('top', 'var(--gantt-day-width)')
        .css('left', _previousLeft + 1)
        .text(day)
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

  for (let row = 0;row < tracks.length; row++) {
    let track = tracks[row];

    for (let period of track) {
      let start = Math.ceil((period.from - from) / 8.64e+7) * GANTT_DAY_WIDTH;
      let length = (Math.ceil((period.to - period.from) / 8.64e+7) + 1) * GANTT_DAY_WIDTH;

      let proj = back.data.projects[period.task.project || 'default'];

      let $p = $(document.createElement('period'));
      $p.css('background', proj.color)
        .css('top', 'calc((var(--gantt-day-width) - var(--period-height)) / 2 + ' + (row * GANTT_DAY_WIDTH) + 'px)')
        .css('left', start)
        .css('color', proj.fontColor)
        .css('width', length)
        .appendTo(graph);
      
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

  console.timeEnd('Re-render gantt');
}