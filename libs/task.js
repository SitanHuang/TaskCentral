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

  weight /= days_left;
  // 0 is same as null
  if (task.progress)
    weight *= Math.max(0.05, (100 - task.progress) / 100);

  return weight * priority + priority;
}

function task_set(task) {
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

function task_is_overlap(task, range) {
  let e = task_get_endpoints(task);
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

function task_update_progress(task, progress) {
  task.progress = Math.max(Math.min(progress, 100), 0);

  let now = timestamp();

  // delete nearest 5min progress
  task.log = task.log
    .filter(x => !(x.type == 'progress' && Math.abs(now - x.time) < 300000));

  task.log.push({ type: 'progress', time: now, progress: task.progress });
  back.set_dirty();
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