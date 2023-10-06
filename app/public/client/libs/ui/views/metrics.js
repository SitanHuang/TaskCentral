let _metrics_con;
let _metrics_mtime;
let _metrics_css_inserted;

function ui_menu_select_metrics() {
  _metrics_con = $('.content-container > div.metrics');

  _metrics_con.find('.profile h2').text(back.user.name);
  _metrics_con.find('.profile profile-pic').text(back.user.name[0]);

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
const METRICS_YEAR_QUERY = (() => {
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
  now.setMonth(0);

  query.queries[0].from = now.getTime();

  now.setFullYear(now.getFullYear() + 1);
  query._increment = [1, 0, 0];
  query.queries[0].to = now.getTime();

  return query;
})();

METRICS_QUERY = JSON.parse(JSON.stringify(METRICS_DEFAULT_QUERY));

PRODUCTIVE_HOURS = 10;

let METRICS_FUNCTIONS;

var ui_metrics_render;
var ui_metrics_inject_tasks;
{
  let tasks;
  let tasks2; // those with priority & weight
  let startDate;
  let endDate;

  function norm(x) {
    x *= 1;
    return x == Infinity || x == -Infinity || isNaN(x) ? 0 : x;
  }

  function explanation(e) {
    return `<span class="explanation">${e}</span>`;
  }

  function days(start, end) {
    return Math.ceil((end - start) / 8.64e+7);
  }

  const RATING_FUNCS = [
    // ["Avg. Days Get-ahead", x => Math.tanh((x - 3) / 7 + 0.4) * 2, 0.05],
    ["Work Completed % of Total", x => Math.tanh(x / 100 * 1.5 - 0.1) * 2, 0.18, "The percentage of work completed out of the total amount of work in a given period, excluding tasks with priority=0 or weight=0. Work completed is calculated at the instant of the end of the period as weights * change in progress."],
    ["Work Net % of Start (All)", x => Math.tanh(-1.2 * x / 100) * 2, 0.07, "The percentage of work at the end of a given period relative to the work at the beginning of the same period. Usually, this number is the same as 'Work Completed % of Total' for period=Day. Work completed is calculated at the instant of the end of the period as weights * change in progress."],
    ["Time Tracked % Prod. (All)", x => Math.tanh(x / 1.5 / 100) * 2, 0.075, "Productive Hours is defined here as 10 hours per day. This metric is derived from the total time tracked in a given period as a percent of the Productive Hours."],
    ["Time Tracked % Prod.", x => Math.tanh(x * 1.5 / 100) * 2, 0.225, "Productive Hours is defined here as 10 hours per day. This metric is derived from the total time tracked in a given period as a percent of the Productive Hours, excluding tasks with priority=0 or weight=0."],
    ["Avg. Days Get-ahead (>1d)", x => Math.tanh((x - 3) / 7 + 0.4) * 2, 0.19, "The average number of days that a task (with >1 Gantt-period) is marked as Complete before the due date. Gantt-period of a task is shown as the endpoints of a task in the Gantt tab."],
    // ["Avg. % Get-ahead", x => Math.tanh(x * 1.5 / 100) * 2, 0.05],
    ["Avg. % Get-ahead (>1d)", x => Math.tanh(x * 1.5 / 100) * 2, 0.19, "The percentage of number of days that a task (with >1 Gantt-period) is marked as Complete before the due date out of the number of days of the task's Gantt-period. Gantt-period of a task is shown as the endpoints of a task in the Gantt tab."],
    ["Time Per Interval", x => (1.3 - Math.abs(Math.tanh((x - 0.55) * 2) * 1.6)), 0.07, "Excluding tasks with priority=0 or weight=0, how close was the average time per tracked interval (defined by a Start-Stop cycle) to the average human optimal concentration time (about 30min)."],
  ];

  let functions;
  METRICS_FUNCTIONS = functions = {
    duration: [
      (start, end) => `${days(start, end)} days <br> (${Math.ceil((end - start) / 3.6e+6)} hrs)`,
      days
    ],

    "Rating":[
      (s, e) =>
        functions["Rating"][1](s, e) + explanation("38% get-ahead, 30% time tracked, 25% work, 7% time per interval"),
      (s, e) =>
        (
          RATING_FUNCS
            .map(x => x[1](norm((functions[x[0]][1] || functions[x[0]])(s, e)) || 0) * x[2])
            .reduce((a, b) => (a || 0) + (b || 0), 0) -
          Math.tanh(days(s, e) / 4.5 - 1) * 0.15 + 0.16
        )
        .toFixed(2)
    ],

    "Time Tracked (All)": [
      (s, e) => {
        let time = functions["Time Tracked (All)"][1](s, e).toFixed(1) * 3.6e+6;
        return `${timeIntervalStringShort(time)} <br> (${(time / (e - s) * 100).toFixed(0)}% tracked)` +
                explanation('Including weightless & priority-less tasks.');
      },
      (s, e) =>
        (_query_generate_gantt_periods(tasks, [s, e - 8.64e+7])
          .map(x => task_gen_working_periods(x.task, [s, e])
                      .map(x => x.to - x.from).reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0) / 3.6e+6)
    ],

    "Time Tracked % Prod. (All)": [
      (s, e) =>
        functions["Time Tracked % Prod. (All)"][1](s, e).toFixed(1) +
        explanation(`Productive hours = ${PRODUCTIVE_HOURS}hr/day. Including weightless & priority-less tasks.`),
      (s, e) =>
        (_query_generate_gantt_periods(tasks, [s, e - 8.64e+7])
          .map(x => task_gen_working_periods(x.task, [s, e])
                      .map(x => x.to - x.from).reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0) / ((e - s) * PRODUCTIVE_HOURS / 24) * 100)
    ],

    "Time Per Interval (All)": [
      (s, e) =>
        `${functions["Time Per Interval (All)"][1](s, e).toFixed(1)}hr` +
                explanation('Including weightless & priority-less tasks.'),
      (s, e) =>
        (functions["Time Tracked (All)"][1](s, e) / functions["Intervals (All)"][1](s, e))
    ],

    "Intervals (All)": [
      (s, e) => {
        let count = functions["Intervals (All)"][1](s, e);
        return count + `<br>${(count / days(s, e)).toFixed(2)} / day` +
          explanation('Including weightless & priority-less tasks');
      },
      (s, e) =>
        _query_generate_gantt_periods(tasks, [s, e - 8.64e+7]).map(x => task_gen_working_periods(x.task, [s, e])).flat().length
    ],

    "Intervals Per Task (All)": [
      (s, e) =>
        functions["Intervals Per Task (All)"][1](s, e).toFixed(1) +
        explanation('Including weightless & priority-less tasks'),
      (s, e) =>
        (functions["Intervals (All)"][1](s, e) / functions["Tasks (All)"][1](s, e))
    ],

    "Tasks (All)": [
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end - 8.64e+7]).length +
        explanation('Including weightless & priority-less tasks'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end - 8.64e+7]).length
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
                    [start, end - 8.64e+7]).map(x => x.task);
        let started = tsks.filter(x => task_progress_at_stamp(x, end)).length;
        return `${tsks.length} <br> (${started} started) ${explanation('Including weightless & priority-less tasks')}`;
      },
      (start, end) =>
        _query_generate_gantt_periods(
          tasks.filter(x => x.status != 'completed' || task_completed_stamp(x) > end),
        [start, end - 8.64e+7]).length
    ],

    "Tasks Completed (All)": [
      (start, end) => {
        let count = _query_generate_gantt_periods(
                      tasks.filter(x => x.status == 'completed' && task_completed_stamp(x) < end),
                      [start, end - 8.64e+7]).length;
        return `${count} <br> (${(count / days(start, end)).toFixed(2)} / day)` +
                explanation('Including weightless & priority-less tasks');
      },
      (start, end) =>
        _query_generate_gantt_periods(
          tasks.filter(x => x.status == 'completed' && task_completed_stamp(x) < end),
          [start, end - 8.64e+7]).length
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
        (_query_generate_gantt_periods(tasks, [start, end - 8.64e+7]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('task * (progress remaining)<br>Including weightless & priority-less tasks.'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end - 8.64e+7]).map(x => 100 - task_progress_at_stamp(x.task, end)).reduce((a,b) => a + b, 0) / 100
    ],

    "Progress Completed (All)": [
      (start, end) => {
        let w = _query_generate_gantt_periods(tasks, [start, end - 8.64e+7])
                  .map(x => task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start))
                  .reduce((a,b) => a + b, 0) / 100;
        return w.toFixed(1) + `<br>${(w / days(start, end)).toFixed(2)} / day` +
               explanation('task * (delta progress)<br>Including weightless & priority-less tasks.')
      },
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end - 8.64e+7]).map(x => task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100
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
        (_query_generate_gantt_periods(tasks, [start, end - 8.64e+7]).map(x => (100 - task_progress_at_stamp(x.task, end)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100).toFixed(1) +
        explanation('weight/5 * (progress remaining)<br>Including priority-less tasks.'),
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end - 8.64e+7]).map(x => (100 - task_progress_at_stamp(x.task, end)) * x.task.weight / 5).reduce((a,b) => a + b, 0) / 100
    ],

    "Work Completed (All)": [
      (start, end) => {
        let w = _query_generate_gantt_periods(tasks, [start, end - 8.64e+7])
                  .map(x => x.task.weight / 5 * (task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start)))
                  .reduce((a,b) => a + b, 0) / 100;
        return w.toFixed(1) + `<br>${(w / days(start, end)).toFixed(2)} / day` +
               explanation('weight/5 * (delta progress)<br>Including priority-less tasks.')
      },
      (start, end) =>
        _query_generate_gantt_periods(tasks, [start, end - 8.64e+7])
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

    "Avg. % Get-ahead": [
      (s, e) =>
        functions["Avg. % Get-ahead"][1](s, e) +
        explanation('How early were tasks done before due date as % of assigned time'),
      (s, e) => {
        let tasks = _query_generate_gantt_periods(
                      tasks2.filter(x => x.status == 'completed' && task_completed_stamp(x) < e && (x.due || x.until)),
                      [s, e - 8.64e+7]);
        return (tasks.map(x => {
                  x = x.task;
                  let endpoints = [x.earliest ? x.earliest : x.created, (x.due || x.until)].map(x => roundDateToNearestDay(x).getTime());
                  return endpoints[0] == endpoints[1] ?
                           0 : // if due on same day as creation, 0% ahead
                           (endpoints[1] - roundDateToNearestDay(task_completed_stamp(x))) / (endpoints[1] - endpoints[0]);
                }).reduce((a, b) => a + b, 0) * 100 / tasks.length).toFixed(0);
      }
    ],
    "Avg. Days Get-ahead": [
      (s, e) =>
        functions["Avg. Days Get-ahead"][1](s, e).toFixed(0) +
        explanation('How many days were tasks done before due date'),
      (s, e) => {
        let tasks = _query_generate_gantt_periods(
                      tasks2.filter(x => x.status == 'completed' && task_completed_stamp(x) < e && (x.due || x.until)),
                      [s, e - 8.64e+7]);
        return (tasks.map(x => {
                  x = x.task;
                  let endpoints = [x.earliest ? x.earliest : x.created, (x.due || x.until)];
                  return midnight(endpoints[0]) == midnight(endpoints[1]) ?
                           0 : // if due on same day as creation, 0% ahead
                           Math.floor((endpoints[1] - midnight(task_completed_stamp(x))) / 8.64e+7);
                }).reduce((a, b) => a + b, 0) / tasks.length);
      }
    ],
    "Avg. % Get-ahead (>1d)": [
      (s, e) =>
        functions["Avg. % Get-ahead (>1d)"][1](s, e) +
        explanation('How early were tasks done before due date as % of assigned time. Excluding tasks with 1 day of assigned time'),
      (s, e) => {
        let tasks = _query_generate_gantt_periods(
                      tasks2.filter(x => x.status == 'completed' && task_completed_stamp(x) < e && (x.due || x.until)),
                      [s, e - 8.64e+7]);
        tasks = tasks.map(x => {
                  x = x.task;
                  let endpoints = [x.earliest ? x.earliest : x.created, (x.due || x.until)].map(x => roundDateToNearestDay(x).getTime());
                  return endpoints[0] == endpoints[1] ?
                           NaN : // if due on same day as creation, skip
                           (endpoints[1] - roundDateToNearestDay(task_completed_stamp(x))) / (endpoints[1] - endpoints[0]);
                }).filter(x => !isNaN(x));
        return (tasks.reduce((a, b) => a + b, 0) * 100 / tasks.length).toFixed(0);
      }
    ],
    "Avg. Days Get-ahead (>1d)": [
      (s, e) =>
        functions["Avg. Days Get-ahead (>1d)"][1](s, e).toFixed(0) +
        explanation('How many days were tasks done before due date.  Excluding tasks with 1 day of assigned time'),
      (s, e) => {
        let tasks = _query_generate_gantt_periods(
                      tasks2.filter(x => x.status == 'completed' && task_completed_stamp(x) < e && (x.due || x.until)),
                      [s, e - 8.64e+7]);
        tasks = tasks.map(x => {
                  x = x.task;
                  let endpoints = [x.earliest ? x.earliest : x.created, (x.due || x.until)];
                  return midnight(endpoints[0]) == midnight(endpoints[1]) ?
                           NaN : // if due on same day as creation, skip
                           Math.floor((endpoints[1] - midnight(task_completed_stamp(x))) / 8.64e+7);
                }).filter(x => !isNaN(x));
        return (tasks.reduce((a, b) => a + b, 0) / tasks.length);
      }
    ],

    "Time Tracked": [
      (s, e) => {
        let time = functions["Time Tracked"][1](s, e).toFixed(1) * 3.6e+6;
        return `${timeIntervalStringShort(time)} <br> (${(time / (e - s) * 100).toFixed(0)}% tracked)`;
      },
      (s, e) =>
        (_query_generate_gantt_periods(tasks2, [s, e - 8.64e+7])
          .map(x => task_gen_working_periods(x.task, [s, e])
                      .map(x => x.to - x.from).reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0) / 3.6e+6)
    ],

    "Time Tracked % Prod.": [
      (s, e) =>
        functions["Time Tracked % Prod."][1](s, e).toFixed(1) +
        explanation(`Productive hours = ${PRODUCTIVE_HOURS}hr/day.`),
      (s, e) =>
        (_query_generate_gantt_periods(tasks2, [s, e - 8.64e+7])
          .map(x => task_gen_working_periods(x.task, [s, e])
                      .map(x => x.to - x.from).reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0) / ((e - s) * PRODUCTIVE_HOURS / 24) * 100)
    ],

    "Time Per Interval": [
      (s, e) =>
        `${functions["Time Per Interval"][1](s, e).toFixed(1)}hr` +
                explanation('Including weightless & priority-less tasks.'),
      (s, e) =>
        (functions["Time Tracked"][1](s, e) / functions["Intervals"][1](s, e))
    ],

    "Intervals": [
      (s, e) => {
        let count = functions["Intervals"][1](s, e);
        return count + `<br>${(count / days(s, e)).toFixed(2)} / day`;
      },
      (s, e) =>
        _query_generate_gantt_periods(tasks2, [s, e - 8.64e+7]).map(x => task_gen_working_periods(x.task, [s, e])).flat().length
    ],

    "Intervals Per Task":
      (s, e) =>
        (functions["Intervals"][1](s, e) / functions["Tasks"](s, e)).toFixed(2),

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
        [start, end - 8.64e+7]).length
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
        [start, end - 8.64e+7]).length
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
        _query_generate_gantt_periods(tasks2, [start, end - 8.64e+7]).map(x => task_progress_at_stamp(x.task, end) - task_progress_at_stamp(x.task, start)).reduce((a,b) => a + b, 0) / 100
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
        return w.toFixed(1) + `<br>${(w / days(start, end)).toFixed(2)} / day` +
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
    "Work Completed % of Total": (s, e) => (functions["Work Completed"][1](s, e) * 100 / functions["Work All"](s, e)).toFixed(0),
  };

  $('#metrics-select-series').html(
    Object.keys(functions).sort().map(x => `<option value="${x}">${x}</option>`).join("")
  ).val('Rating');
  $('#metrics-graph-interval, #metrics-select-series').change(function () { ui_metrics_render() });

  function _ui_metrics_render_graph() {
    let funcName = document.getElementById('metrics-select-series').value;
    let func = functions[funcName][1] || functions[funcName];
    let interval = JSON.parse(document.getElementById('metrics-graph-interval').value);

    let data = [];
    let index = new Date(startDate);
    let min = 0;
    let max = 0;
    index.setHours(0, 0, 0, 0);
    while (index < endDate) {
      let to = new Date(index);
      to.setFullYear(to.getFullYear() + interval[0]);
      to.setMonth(to.getMonth() + interval[1]);
      to.setDate(to.getDate() + interval[2]);

      let row = {
        periodStart: new Date(index).toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" }),
        data: norm(func(index.getTime(), Math.min(endDate, to)))
      };

      min = Math.min(row.data, min);
      max = Math.max(row.data, max);

      data.push(row);

      index = to;
    }

    let margin = { top: 20, right: 30, bottom: 40, left: 30 };
    let width = Math.min(data.length * 50, (document.getElementById('metrics-select-series').parentElement.clientWidth - 50) / 1.2);
    let height = Math.max(300, Math.min(600, width / 1.77778));

    let y = d3.scaleLinear()
              .domain([min, max])
              .range([height, 0]);

    let heightPerPx = height / Math.abs(max - min);

    let x = d3.scaleBand()
              .domain(data.map(function(d) { return d.periodStart; }))
              .range([0, width])
              .padding(0.1);

    document.getElementById('metrics-graph-container').innerHTML = '';
    let svg = d3.select("#metrics-graph-container")
                .append("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom)
                .append("g")
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
          .attr("y", function(d) { return d.data <=0 ? y(0) : (y(0) - Math.abs(d.data * heightPerPx)); })
          .attr("x", function(d) { return x(d.periodStart); })
          .attr("height", function(d) { return Math.abs(d.data * heightPerPx); })
          .attr("width", x.bandwidth());

    // add the x Axis
    svg.append("g")
       .attr("transform", "translate(0," + y(0) + ")")
       .call(d3.axisBottom(x))
       .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", function(d) {
            return "rotate(-65)"
            });

    // add the y Axis
    svg.append("g")
       .call(d3.axisLeft(y));
  }

  function _ui_metrics_animate_rankchange(old_rank, new_rank) {
    if (old_rank.rank == new_rank.rank)
      return;

    const overlay = document.getElementById("rank-up-overlay");
    const oldRankElem = document.getElementById("old-rank");
    const newRankElem = document.getElementById("new-rank");
    const rankMask = document.getElementById("rank-mask")
    const arrowElem = document.querySelector("#rank-up-overlay .arrow");
    const deltaElem = document.querySelector("#rank-up-overlay .arrow .delta");

    const delta = new_rank.index - old_rank.index;
    deltaElem.textContent = delta ? ((delta > 0 ? '+' : '') + delta) : '';
    deltaElem.className = delta > 0 ? 'delta pos' : 'delta neg';
    deltaElem.style.opacity = '0';
    deltaElem.style.transition = '';

    oldRankElem.style.background = old_rank.color;
    oldRankElem.style.color = fontColorFromHex(old_rank.color.substring(1));
    oldRankElem.textContent = old_rank.rank;

    newRankElem.style.background = new_rank.color;
    newRankElem.style.color = fontColorFromHex(new_rank.color.substring(1));
    newRankElem.textContent = new_rank.rank;

    // Reset the mask position & arrow opacity
    rankMask.style.transform = "translateX(0)";
    arrowElem.style.opacity = "0";

    // Show the overlay
    overlay.classList.remove("hidden");
    overlay.classList.remove("fade-out");

    // Delay showing the arrow by 2 seconds
    setTimeout(() => {
      arrowElem.style.opacity = "1";
    }, 2050);

    // Delay the mask animation by 3 seconds
    setTimeout(() => {
      rankMask.style.transform = "translateX(calc(-100% - 20px))";
    }, 5000);

    setTimeout(() => {
      deltaElem.style.transition = 'opacity 300ms ease';
      deltaElem.style.opacity = '0.9';
    }, 6500);

    setTimeout(() => {
      overlay.classList.add("fade-out");
    }, 10000);

    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 11000);
  }

  function _ui_metrics_comp_recalibrate() {
    const old = comp_get_rank_obj();
    const msg = comp_rank_calc();
    if (typeof msg == 'string')
      ui_alert(msg);
    else
      _ui_metrics_animate_rankchange(old, comp_get_rank_obj());
    // even with a msg, rank can still change (ie. Unranked)
    _ui_metrics_render_profile();
  }

  function _ui_metrics_render_profile() {
    let con = _metrics_con.find('.profile-con .stat-list').html('');
    let rating = functions["Rating"][1](startDate, endDate);

    const ratingBg =
        rating < 0.5 ? '#b32436' :
        rating < 0.9 ? '#c4921d' :
        rating < 1.2 ? '#107a40' : '#68149d';

    const rank = comp_get_rank_obj();

    _metrics_con.find(".profile-con .rating")
      .text(rating)
      .css('background', ratingBg)
      .css('color', fontColorFromHex(ratingBg.substring(1)));
    _metrics_con.find(".profile-con .skill")
      .text(rank.rank)
      .css('background', rank.color)
      .css('color', fontColorFromHex(rank.color))
      .attr('title', COMP_ELO_NAMES.join("\n"));

    if (comp_check_recalc())
      _metrics_con.find(".profile-con .recalibrate").show();
    else
      _metrics_con.find(".profile-con .recalibrate").hide();

    for (let x of RATING_FUNCS) {
      // (functions[f][0] || functions[f])(startDate, endDate)
      // x[1](norm((functions[x[0]][1] || functions[x[0]])(s, e)) || 0) * x[2]
      let raw = norm((functions[x[0]][1] || functions[x[0]])(startDate, endDate)) || 0;
      let val = x[1](raw);
      let weight = x[2];
      let baselinePerc = 60; // also defined in metrics.css
      let perc = val * baselinePerc;

      let color = val < 0.5 ? '#b32436' :
                  val < 0.9 ? '#e3ae08' :
                  val < 1.2 ? '#06b319' : '#68149d';

      con.append(`
        <div class="stat">
          <span data-tooltip="${x[3]}">${x[0]}</span>
          <span><ex data-tooltip="=(actual value of the metric), (weighting coefficient in the Period Rating formula)%">(=${raw.toFixed(2)}, ${(weight * 100).toFixed()}%)</ex></span>
          <num>${val.toFixed(2)}</num>
          <div class="progress-con">
            <div class="progress" style="
              width: ${perc}%;
              background-color: ${color};
            "></div>
            <div class="baseline" style="${(val > 1.05 || '') && 'background: #e3e3e3;'}"></div>
          </div>
        </div>
      `);
    }

    ui_tooltips_init(con);
  }

  ui_metrics_inject_tasks = function (query) {
    tasks = query_exec(query)[0].tasks;
    tasks2 = tasks.filter(x => x.priority && x.weight);
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

    ui_metrics_inject_tasks(query);

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

    _ui_metrics_render_graph();
    _ui_metrics_render_profile();

    console.timeEnd('Re-render metrics');
  };
};
