STATUS = [
  'start', // started via task.log.push()
  'default', // any status that is not started, shouldn't mean anything UI wise
  'completed', // completed (not deleted/abandoned)
];

function task_new(override) {
  let stamp = timestamp();

  return Object.assign({
    id: uuidv4(),
    name: '',
    project: null,
    tags: {}, // TODO: stub
    created: stamp,
    hidden: false, // unlike complete, this one can hide everything
    due: null,
    earliest: null, // earliest time to begin working
    until: null, // latest time that the task is still relevant
    status: 'default',
    // [notes: string],
    priority: 5, // 0-10 inclusive, relative degree of importance
    weight: 0, // 0-10 inclusive, relative amount of work
    progress: null, // latest progress, updated via task.log.push(), null same as 0
    total: 0, // total difference in timestamp spent on working (start -> default)
    // TODO: stub
    // [subtasks: []],
    // status change should pay attention to log
    // ex. if status==completed, can't start/pause task
    log: [
      { type: 'default', time: stamp } // always first
      // { type: 'start', time: timestamp },
      // { type: 'default', time: timestamp },
      // { type: 'progress', time: timestamp, progress: int 0-100 },
    ]
  }, override);
}

/**
 * This function shall be run whenever a task is "touched" by the system for
 * the purpose of updating certain metadata.
 *
 * "touched" defined:
 *   - when the task is getting to be displayed to the user
 *   - when the task is updated by the user
 *
 * It sets backend to dirty on its own.
 *
 * Currently, this is run during:
 *   - query_exec()
 *   - task_set()
 */
function task_run_ontouch_hook(task) {
  let dirty = false;
  const now = timestamp();

  // update snoozed
  if (task.snoozed < now) {
    delete task.snoozed;
    dirty = true;
  }

  if (dirty)
    back.set_dirty();
}

/**
 * Sets a task as snoozed until tomorrow midnight.
 */
function task_snooze(task, snooze) {
  if (!snooze) {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    snooze = nextDay.getTime();
  }

  task.snoozed = snooze.getTime ? snooze.getTime() : snooze;

  back.set_dirty();
}

function task_unsnooze(task) {
  delete task.snoozed;

  back.set_dirty();
}

/*
 * Calcs eta of task or task[] using weights done & time spent
 *
 * returns milliseconds of estimated time left
 *
 * returns -1 if N/A
 */
function task_calc_eta(tasks) {
  if (!Array.isArray(tasks))
    tasks = [tasks];

  let total_weights = 0;
  let weights_done = 0;
  let time_tot = 0;

  for (let task of tasks) {
    if (!task.weight)
      continue;

    const progress = task.status == 'completed' ? 100 : task.progress;

    total_weights += task.weight;
    weights_done += task.weight * progress / 100;
    time_tot += task.total;
  }

  const weights_left = total_weights - weights_done;

  if (time_tot && weights_done) {
    const rate = weights_done / time_tot;

    return Math.ceil(weights_left / rate);
  }

  return -1;
}

/*
 * Calcs weight/time rate of task or task[] using weights done & time spent
 *
 * returns rate in weights done over time total
 *
 * returns -1 if N/A
 */
function task_calc_wt_rate(tasks) {
  if (!Array.isArray(tasks))
    tasks = [tasks];

  let total_weights = 0;
  let weights_done = 0;
  let time_tot = 0;

  for (let task of tasks) {
    if (!task.weight)
      continue;

    const progress = task.status == 'completed' ? 100 : task.progress;

    total_weights += task.weight;
    weights_done += task.weight * progress / 100;
    time_tot += task.total;
  }

  if (time_tot && weights_done)
    return weights_done / time_tot;

  return -1;
}


function task_calc_importance(task) {
  let now = timestamp();

  if (task.status == 'completed')
    return 0;

  if (task.status == 'start')
    return 11 * (task.priority + 1) / 11;

  if (task.until && now >= task.until)
    return 0;

  // weight 10 vs priority 3
  let weight = (task.weight + 1) / 11 * 10;
  let priority = (task.priority + 1) / 11 * 3;

  let days_left = task.due ? (task.due - now) / 8.64e+7 : 100;
  // account for negative days:
  days_left = days_left >= 0 ? days_left + 1 : 1 / (1 - days_left);

  if (task.earliest && now < task.earliest)
    days_left *= 100;

  days_left = Math.pow(days_left, 2);

  weight /= days_left;

  // 0 is same as null
  if (task.progress) {
    const p = Math.max(Math.min(task.progress, 100), 0);

    weight *= (
      Math.exp(-p / 50) + // exponential decay
      2 / (104 - p) - // goes back to .60 after 85% progress
      0.02
    );
  }

  return weight * priority + priority;
}

function task_set(task) {
  task_run_ontouch_hook(task);

  back.data.tasks[task.id] = task;
  let proj = task && back.data.projects[task.project];
  if (proj) {
    proj.lastUsed = new Date().getTime();
    // IMPORTANT: only responsible for increasing #
    proj.number = (proj.number || 0) + 1;
  }
  back.set_dirty();
}

function task_stringify_due(task) {
  if (task.due)
    return task_stringify_due(task.due);
  else if (task.id)
    return 'None'; // no due date

  let date = new Date(task);
  if (isToday(date))
    return 'Today';
  if (isTomorrow(date))
    return 'Tomorrow';
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()] + ' ' +
         (date.getMonth() + 1) + '/' + date.getDate();
}

function task_colorize_due(task) {
  if (task.due)
    return task_stringify_due(task.due);
  else if (task.id)
    return ''; // no due date

  const now = new Date();
  const diff = task - now;
  if (diff <= 0) // overdue/due today
    return 'color: #b71c1c; font-weight: bold;';
  if (diff <= 2.592e+8) // 3 days
    return 'color: #b71c1c;';
  if (diff <= 6.048e+8) // 7 days
    return 'color: #f57c00;'
  else
    return '';
}

function task_parse_date_input(val) {
  val = (val && val.value) || val;
  return new Date(val + 'T00:00:00');
}

/*
 * range for gantt periods,
 * less inclusive than relavant endpoints
 */
function task_gantt_endpoints(task) {
  let start = task.earliest ? task.earliest : task.created;
  let now = timestamp();
  let end = now;

  if (task.status == 'completed') {
    end = task_completed_stamp(task);
  } else {
    // if before until, either now or due
    // cannot be after until
    if (task.due)
      end = Math.max(end, task.due);
    if (task.until)
      end = Math.min(end, task.until);
  }

  return [
    start, // start date always earliest/created
    Math.max(start, end) // cannot be before start date
  ];
}

/*
 * the range for when the task is relevant
 */
function task_get_endpoints(task) {
  let start = Math.min(task.created, task.earliest || task.created);
  let end = Math.max(timestamp(), task.due || task.until);
  return [
    Math.min(start, end),
    Math.max(start, end)
  ];
}

function task_is_overlap(task, range, gantt) {
  let e = gantt ? task_gantt_endpoints(task) : task_get_endpoints(task);
  return (e[0] <= range[1]) && (range[0] <= e[1]);
}

function task_delete(task) {
  delete back.data.tasks[task.id];
  back.set_dirty();

  if (_selected_task?.id == task?.id)
      ui_detail_close();
}

function task_complete(task) {
  task.status = 'completed';
  task.log.push({ type: 'default', time: timestamp(), note: 'Completed.' });
  back.set_dirty();
}

function task_reopen(task) {
  task.status = 'default';
  task.log.push({ type: 'default', time: timestamp(), note: 'Reopened.' });
  back.set_dirty();
}

function task_start(task) {
  if (task.status != 'default') {
    alert('FATAL: Task is not in "default" status.')
    throw 'FATAL: ' + JSON.stringify(task);
  }
  task.status = 'start';
  task.log.push({ type: 'start', time: timestamp() });
  back.data.started = task.id;
  back.set_dirty();
}

function task_validate_log(log) {
  let msg = '';

  if (!Array.isArray(log))
    msg += 'Not an array.\n';

  for (let i = 0;i < log.length;i++) {
    let e = log[i];

    if (!(typeof e === 'object' &&
      !Array.isArray(e) &&
      e !== null)) {
      msg += i + 'th element: not an object.\n';
      continue;
    }

    // 1970 - 2100
    if (!(1 < new Date(e.time) && new Date(e.time) < 4102444800000))
      msg += i + 'th element: "time" property not a valid timestamp within 1970 - 2100.\n';

    switch (e.type) {
      case 'start':
      case 'default':
        break;
      case 'progress':
        if (!(0 <= e.progress && e.progress <= 100))
          msg += i + 'th element: "progress" property not valid integer from 0-100 for type \'progress\'.\n';
        break;
      default:
        msg += i + 'th element: "type" property not \'start\', \'default\', or \'progress\'.\n';
    }
  }

  return msg || null;
}

function task_gen_readable_log(task) {
  let s = '';
  task.log.forEach(x => {
    s += x.type.substring(0, 3).toUpperCase() + ' ';
    s += new Date(x.time).toLocaleString() + ' ';
    if (!isNaN(x.progress))
      s += ' int=' + x.progress.toString().padStart(2, '0') + ' ';
    if (x.note)
      s += ' "' + x.note + '" ';
    s += '\n';
  });
  return s;
}

/*
 * returns 100% if task is completed after stamp
 *
 * if a task is marked as completed before stamp, even if reopened later,
 * would still return as 100%
 */
function task_progress_at_stamp(task, stamp) {
  let comp = false;
  let p = 0;

  for (let l of task.log) {
    if (l.time > stamp)
      continue;

    if (l.type == 'default' && l.note?.toLowerCase().indexOf('completed') >= 0)
      comp = true;
    else if (l.type == 'default' || l.type == 'start')
      comp = false;
    else if (!comp && l.type == 'progress' )
      p = l.progress;
  }
  return comp ? 100 : p;
}


function task_update_progress(task, progress, note) {
  task.progress = Math.max(Math.min(progress, 100), 0);

  let now = timestamp();

  // delete nearest 5min progress
  task.log = task.log
    .filter(x => !(x.type == 'progress' && !x.note && Math.abs(now - x.time) < 300000));

  let log = { type: 'progress', time: now, progress: task.progress };

  if (note)
    log.note = note;

  task.log.push(log);
  back.set_dirty();
}

/*
 * returns total diff (new - old)
 */
function task_recalc_total(task) {
  let ot = task.total;

  let tot = 0;
  let periods = task_gen_working_periods(task);
  periods.forEach(x => {
    tot += x.to - x.from;
  });

  return (task.total = tot) - ot;
}

function task_pause(task) {
  task.status = 'default';
  task.log.push({ type: 'default', time: timestamp() });
  delete back.data.started;

  // aggregate to total time spent
  let start = task_get_latest_start_stamp(task);
  if (start)
    task.total += timestamp() - start;

  back.set_dirty();
}

function task_get_latest_start_stamp(task) {
  for (let i = task.log.length - 1; i >= 0;i--) {
    let log = task.log[i];
    if (log?.type == 'start')
      return log.time;
  }
  return null;
}

function task_completed_stamp(task) {
  let def = Math.min(task.until, timestamp());
  let d = def;
  for (let l of task.log) {
    if (l.type == 'default' && l.note?.toLowerCase().indexOf('completed') >= 0)
      d = l.time;
    else if (l.type == 'default' || l.type == 'start')
      d = def;
  }
  return d;
}

/*
 * STA -> DEF
 * STA -> now
 *
 * [capRange: [from, to]]
 */
function task_gen_working_periods(task, capRange) {
  let periods = [];
  capRange = capRange || [-Infinity, Infinity];

  let start;
  for (let log of task.log) {
    if (log.type == 'start') {
      start = Math.max(capRange[0], log.time);
    } else if (log.type == 'default' && start) {
      let end = Math.min(capRange[1], log.time);

      if (end > start)
        periods.push({ from: start, to: end, task: task });

      start = null;
    }
  }

  if (start) {
    let end = Math.min(capRange[1], timestamp());

    if (end > start)
      periods.push({ from: start, to: end, task: task });
  }

  return periods;
}
