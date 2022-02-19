let _metrics_con;
let _metrics_mtime;
let _metrics_css_inserted;

function ui_menu_select_metrics() {
  _metrics_con = $('.content-container > div.metrics');

  let target_provider = () => METRICS_QUERY;
  let callback_provider = () => {
    delete target_provider()._increment;
    return ui_metrics_render;
  };

  if (_metrics_mtime != (_metrics_mtime = back.mtime))
    ui_metrics_render();

  ui_filter_update_holders(target_provider, callback_provider);
}

const METRICS_TODAY_QUERY = (() => {
  let query = {
    queries: [{
      status: [],
      hidden: null,
      due: null,
      projects: [],
      collect: ['tasks'],
    }]
  };

  let now = new Date();
  now.setHours(0, 0, 0, 0);

  query.queries[0].from = now.getTime();

  now.setDate(now.getDate() + 1);
  query._increment = [0, 0, 1];
  query.queries[0].to = now.getTime();

  return query;
})();
const METRICS_WEEK_QUERY = (() => {
  let query = {
    queries: [{
      status: [],
      hidden: null,
      due: null,
      projects: [],
      collect: ['tasks'],
    }]
  };

  let now = new Date();
  now.setHours(0, 0, 0, 0);

  let day = now.getDay();

  // get monday (assume monday is first day of week)
  now.setDate(now.getDate() - day + (day == 0 ? -6 : 1)); // adjust when day is sunday
  query.queries[0].from = now.getTime();

  // get sunday (last day of week, assuming monday is first day of week)
  now.setDate(now.getDate() + 7);
  query._increment = [0, 0, 7];
  query.queries[0].to = now.getTime();

  return query;
})();
const METRICS_DEFAULT_QUERY = METRICS_WEEK_QUERY;

const METRICS_MONTH_QUERY = (() => {
  let query = {
    queries: [{
      status: [],
      hidden: null,
      due: null,
      projects: [],
      collect: ['tasks'],
    }]
  };

  let now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(1);

  query.queries[0].from = now.getTime();

  now.setMonth(now.getMonth() + 1);
  query._increment = [0, 1, 0];
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
  intervals (all),
  intervals per task (all),
  intervals per day (all),
  time per day (all),
  time recorded (all),
  time per interval (all),
  time per task (all),
  % tracked

  ========= has priority & weight =========

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

  let functions;
  functions = {
    duration: [
      (start, end) => `${days(start, end)} days <br> (${Math.ceil((end - start) / 3.6e+6)} hrs)`,
      days
    ],

    "Tasks (All)": [
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).length +
        explanation('Including weightless & priority-less tasks'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).length
    ],

    "Tasks at Start (All)": [
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, start]).length +
        explanation('Including weightless & priority-less tasks'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, start]).length
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

    "Progress Left at Start (All)": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks, [start, start]).map(x => 100 - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('task * (progress remaining)<br>Including weightless & priority-less tasks.'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, start]).map(x => 100 - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100
    ],

    "Progress Left at End (All)": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('task * (progress remaining)<br>Including weightless & priority-less tasks.'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100
    ],

    "Progress Completed (All)": [
      (start, end) => {
        let w = _query_generate_gantt_periods(tasks, [start, end])
                  .map(x => task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start))
                  .reduce((a,b) => a + b, 0) / 100;
        return w.toFixed(1) + `<br>${(w / days(start, end)).toFixed(2)} / day` +
               explanation('task * (delta progress)<br>Including weightless & priority-less tasks.')
      },
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).map(x => task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100
    ],

    "Progress Net (All)": (s, e) => ((functions["Progress Left at End (All)"][1](s, e) - functions["Progress Left at Start (All)"][1](s, e))).toFixed(1),
    "Progress Net % Of Start (All)": (s, e) => (functions["Progress Net (All)"](s, e) * 100 / functions["Progress Left at Start (All)"][1](s, e)).toFixed(0),


    "Work Left at Start (All)": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks, [start, start]).map(x => (100 - task_progress_at_stamp(x.task, start)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('weight/5 * (progress remaining)<br>Including priority-less tasks.'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, start]).map(x => (100 - task_progress_at_stamp(x.task, start)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100
    ],

    "Work Left at End (All)": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks, [start, end]).map(x => (100 - task_progress_at_stamp(x.task, end)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('weight/5 * (progress remaining)<br>Including priority-less tasks.'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end]).map(x => (100 - task_progress_at_stamp(x.task, end)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100
    ],

    "Work Completed (All)": [
      (start, end) => {
        let w = _query_generate_gantt_periods(tasks, [start, end])
                  .map(x => x.task.weight / 5 * (task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start)))
                  .reduce((a,b) => a + b, 0) / 100;
        return w.toFixed(1) + `<br>${(w / days(start, end)).toFixed(2)} / day` +
               explanation('weight/5 * (delta progress)<br>Including priority-less tasks.')
      },
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end])
          .map(x => x.task.weight / 5 * (task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start)))
          .reduce((a,b) => a + b, 0) / 100
    ],

    "Work All (All)": [
      (s, e) => functions["Work All (All)"][1](s, e) + explanation('Including priority-less tasks.'),
      (s, e) => ((functions["Work Left at End (All)"][1](s, e) + functions["Work Completed (All)"][1](s, e))).toFixed(1)
    ],
    "Work Net (All)": [
      (s, e) => functions["Work Net (All)"][1](s, e) + explanation('Including priority-less tasks.'),
      (s, e) => ((functions["Work Left at End (All)"][1](s, e) - functions["Work Left at Start (All)"][1](s, e))).toFixed(1)
    ],
    "Work Net % of Start (All)": [
      (s, e) => functions["Work Net % of Start (All)"][1](s, e) + explanation('Including priority-less tasks.'),
      (s, e) => (functions["Work Net (All)"][1](s, e) * 100 / functions["Work Left at Start (All)"][1](s, e)).toFixed(0)
    ],

    // ========= has priority & weight =========

    "Tasks": (start, end) =>
      _query_generate_gantt_periods(tasks2, [start, end - 8.64e+7]).length,
    "Tasks at Start": (start, end) =>
      _query_generate_gantt_periods(tasks2, [start, start]).length,

    "Tasks Remaining": [
      (start, end) => {
        let tsks = _query_generate_gantt_periods(
                      tasks2.filter(x => x.status != 'completed' || task_completed_stamp(x) > end),
                    [start, end - 8.64e+7]).map(x => x.task);
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
                    [start, end - 8.64e+7]).length;
        return `${count} <br> (${(count / days(start, end)).toFixed(2)} / day)`;
      },
      (start, end) =>
        _query_generate_gantt_periods(
          tasks2.filter(x => x.status == 'completed' && task_completed_stamp(x) < end),
        [start, end]).length
    ],

    "Progress Left at Start": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks2, [start, start]).map(x => 100 - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('task * (progress remaining)'),
      (start, end) =>
        _query_generate_gantt_periods(tasks2, [start, start]).map(x => 100 - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100
    ],

    "Progress Left at End": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks2, [start, end - 8.64e+7]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('task * (progress remaining)'),
      (start, end) =>
        _query_generate_gantt_periods(tasks2, [start, end - 8.64e+7]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100
    ],

    "Progress Completed": [
      (start, end) => {
        let w = _query_generate_gantt_periods(tasks2, [start, end - 8.64e+7])
                  .map(x => task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start))
                  .reduce((a,b) => a + b, 0) / 100;
        return w.toFixed(1) + `<br>${(w / days(start, end)).toFixed(2)} / day` +
               explanation('task * (delta progress)')
      },
      (start, end) =>
        _query_generate_gantt_periods(tasks2, [start, end]).map(x => task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100
    ],

    "Progress Net": (s, e) => ((functions["Progress Left at End"][1](s, e) - functions["Progress Left at Start"][1](s, e))).toFixed(1),
    "Progress Net % Of Start": (s, e) => (functions["Progress Net"](s, e) * 100 / functions["Progress Left at Start"][1](s, e)).toFixed(0),

    "Work Left at Start": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks2, [start, start]).map(x => (100 - task_progress_at_stamp(x.task, start)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('weight/5 * (progress remaining)'),
      (start, end) =>
        _query_generate_gantt_periods(tasks2, [start, start]).map(x => (100 - task_progress_at_stamp(x.task, start)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100
    ],

    "Work Left at End": [
      (start, end) =>
        (_query_generate_gantt_periods(tasks2, [start, end - 8.64e+7]).map(x => (100 - task_progress_at_stamp(x.task, end)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('weight/5 * (progress remaining)'),
      (start, end) =>
        _query_generate_gantt_periods(tasks2, [start, end - 8.64e+7]).map(x => (100 - task_progress_at_stamp(x.task, end)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100
    ],

    "Work Completed": [
      (start, end) => {
        let w = _query_generate_gantt_periods(tasks2, [start, end - 8.64e+7])
                  .map(x => x.task.weight / 5 * (task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start)))
                  .reduce((a,b) => a + b, 0) / 100;
        return w.toFixed(1) + `<br>${(w / days(start, end - 8.64e+7)).toFixed(2)} / day` +
               explanation('weight/5 * (delta progress)')
      },
      (start, end) =>
        _query_generate_gantt_periods(tasks2, [start, end - 8.64e+7])
          .map(x => x.task.weight / 5 * (task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start)))
          .reduce((a,b) => a + b, 0) / 100
    ],

    "Work All": (s, e) => ((functions["Work Left at End"][1](s, e) + functions["Work Completed"][1](s, e))).toFixed(1),
    "Work Net": (s, e) => ((functions["Work Left at End"][1](s, e) - functions["Work Left at Start"][1](s, e))).toFixed(1),
    "Work Net % of Start": (s, e) => (functions["Work Net"](s, e) * 100 / functions["Work Left at Start"][1](s, e)).toFixed(0),
  };

  ui_metrics_render = function (chevron) {
    function _add_metric(name, html, exp) {
      container.find('.content.pure-g').append(
        `<stat class="pure-u-1-1 pure-u-md-12-24 pure-u-lg-1-5">
          <strong>${name}</strong>
          ${html}
        </stat>`
      );
    }
    
    console.time('Re-render metrics');
  
    let diff = METRICS_QUERY.queries[0].to - METRICS_QUERY.queries[0].from;
  
    startDate = new Date(METRICS_QUERY.queries[0].from);
    endDate = new Date(METRICS_QUERY.queries[0].to);

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
      if (METRICS_QUERY._increment) {
        let date = new Date(startDate);
        date.setFullYear(date.getFullYear() - METRICS_QUERY._increment[0]);
        date.setMonth(date.getMonth() - METRICS_QUERY._increment[1]);
        date.setDate(date.getDate() - METRICS_QUERY._increment[2]);
        METRICS_QUERY.queries[0].to = startDate;
        METRICS_QUERY.queries[0].from = date;
        ui_metrics_render(true);
      } else {
        METRICS_QUERY.queries[0].to = startDate.getTime();
        METRICS_QUERY.queries[0].from = startDate.getTime() - diff;
        ui_metrics_render(true);
      }
    };
    container.find('.fa.fa-chevron-right')[0].onclick = () => {
      if (METRICS_QUERY._increment) {
        METRICS_QUERY.queries[0].from = endDate.getTime();
        let date = new Date(endDate);
        date.setFullYear(date.getFullYear() + METRICS_QUERY._increment[0]);
        date.setMonth(date.getMonth() + METRICS_QUERY._increment[1]);
        date.setDate(date.getDate() + METRICS_QUERY._increment[2]);
        METRICS_QUERY.queries[0].to = date;
        ui_metrics_render(true);
      } else {
        METRICS_QUERY.queries[0].from = endDate.getTime();
        METRICS_QUERY.queries[0].to = endDate.getTime() + diff;
        ui_metrics_render(true);
      }
    };
  
    container.find('.content.pure-g').html('');
  
    for (let f in functions)
      _add_metric(f, (functions[f][0] || functions[f])(startDate, endDate));
  
    console.timeEnd('Re-render metrics');
  };
};
