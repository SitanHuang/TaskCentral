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
  let tasks2; // those with priority & weight
  let startDate;
  let endDate;
  
  /*
  TODO:
  tasks involved (all),
  tasks ready (all),
  intervals (all),
  intervals per task (all),
  intervals per day (all),
  time per day (all),
  time recorded (all),
  time per interval (all),
  time per task (all),
  % tracked

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
  intervals per day,
  intervals per task,
  time per day,
  time recorded,
  time per interval,
  time per task,
  time recorded,
  tasks completed per interval (with progress),
  tasks completed per time (with progress),
  assigned days per task,
  days per task,
  % tracked
  */

  function explanation(e) {
    return `<span class="explanation">${e}</span>`;
  }

  function days(start, end) {
    return Math.ceil((end - start) / 8.64e+7);
  }

  const functions = {
    duration: [
      (start, end) => `${days(start, end)} days <br> (${Math.ceil((end - start) / 3.6e+6)} hrs)`,
      days
    ],

    "Tasks at Start (All)": [
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).length +
        explanation('Including weightless & priority-less tasks'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).length
    ],

    "Tasks Remaining (All)": [
      (start, end) => {
        let tsks = _query_generate_gantt_periods(
                      tasks.filter(x => x.status != 'completed' || task_completed_stamp(x) > end),
                    [start, end]).map(x => x.task);
        let started = tsks.filter(x => task_progress_at_stamp(x, end)).length;
        return `${tsks.length} <br> (${started} started) ${explanation('Including weightless & priority-less tasks')}`;
      },
      (start, end) =>
        _query_generate_gantt_periods(
          tasks.filter(x => x.status != 'completed' || task_completed_stamp(x) > end),
        [start, end]).length
    ],

    "Tasks Completed (All)": [
      (start, end) => {
        let count = _query_generate_gantt_periods(
                      tasks.filter(x => x.status == 'completed' && task_completed_stamp(x) < end),
                    [start, end]).length;
        return `${count} <br> (${(count / days(start, end)).toFixed(2)} / day)` +
                explanation('Including weightless & priority-less tasks');
      },
      (start, end) =>
        _query_generate_gantt_periods(
          tasks.filter(x => x.status == 'completed' && task_completed_stamp(x) < end))
    ],

    "Work Left at Start (All)": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('task * (progress remaining)<br>Including weightless & priority-less tasks.'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100
    ],

    "Work Left at End (All)": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('task * (progress remaining)<br>Including weightless & priority-less tasks.'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100
    ],

    "Work Completed (All)": [
      (start, end) => {
        let w = _query_generate_gantt_periods(tasks, [start, end])
                  .map(x => task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start))
                  .reduce((a,b) => a + b, 0) / 100;
        return w.toFixed(1) + `<br>${(w / days(start, end)).toFixed(1)} / day` +
               explanation('task * (delta progress)<br>Including weightless & priority-less tasks.')
      },
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100
    ],

    // ========= has priority & weight =========

    "Tasks at Start": (start, end) =>
      _query_generate_gantt_periods(tasks2, [start, end]).length,

    "Tasks Remaining": [
      (start, end) => {
        let tsks = _query_generate_gantt_periods(
                      tasks2.filter(x => x.status != 'completed' || task_completed_stamp(x) > end),
                    [start, end]).map(x => x.task);
        let started = tsks.filter(x => task_progress_at_stamp(x, end)).length;
        return `${tsks.length} <br> (${started} started)`;
      },
      (start, end) =>
        _query_generate_gantt_periods(
          tasks2.filter(x => x.status != 'completed' || task_completed_stamp(x) > end),
        [start, end]).length
    ],

    "Tasks Completed": [
      (start, end) => {
        let count = _query_generate_gantt_periods(
                      tasks2.filter(x => x.status == 'completed' && task_completed_stamp(x) < end),
                    [start, end]).length;
        return `${count} <br> (${(count / days(start, end)).toFixed(2)} / day)`;
      },
      (start, end) =>
        _query_generate_gantt_periods(
          tasks2.filter(x => x.status == 'completed' && task_completed_stamp(x) < end),
        [start, end]).length
    ],

    "Work Left at Start": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks2, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('task * (progress remaining)'),
      (start, end) =>
        _query_generate_gantt_periods(tasks2, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100
    ],

    "Work Left at End": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks2, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('task * (progress remaining)'),
      (start, end) =>
        _query_generate_gantt_periods(tasks2, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100
    ],

    "Work Completed": [
      (start, end) => {
        let w = _query_generate_gantt_periods(tasks2, [start, end])
                  .map(x => task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start))
                  .reduce((a,b) => a + b, 0) / 100;
        return w.toFixed(1) + `<br>${(w / days(start, end)).toFixed(1)} / day` +
               explanation('task * (delta progress)')
      },
      (start, end) =>
        _query_generate_gantt_periods(tasks2, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100
    ],
    
  };

  ui_metrics_render = function (stamp, chevron) {
    function _add_metric(name, html, exp) {
      container.find('.content.pure-g').append(
        `<stat class="pure-u-1-1 pure-u-md-12-24 pure-u-lg-1-5">
          <strong>${name}</strong>
          ${html}
        </stat>`
      );
    }
    
    console.time('Re-render metrics');
  
    stamp = stamp || METRICS_QUERY.queries[0].from;
    let diff = METRICS_QUERY.queries[0].to - METRICS_QUERY.queries[0].from;
  
    startDate = new Date(stamp);
    endDate = new Date(stamp + diff);

    let query = JSON.parse(JSON.stringify(METRICS_QUERY));
    query.queries[0].from = startDate.getTime();
    query.queries[0].to = endDate.getTime();
    query.queries[0].useGantt = true;
  
    tasks = query_exec(query)[0].tasks;
    tasks2 = tasks.filter(x => x.priority && x.weight);
  
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
      _add_metric(f, (functions[f][0] || functions[f])(startDate, endDate));
  
    console.timeEnd('Re-render metrics');
  };
};
