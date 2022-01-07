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
    progress: null, // latest progress, updated via task.log.push()
    total: 0, // total difference in timestamp spent on working (start -> default)
    log: [
      { type: 'default', time: stamp } // always first
      // { type: 'start', time: timestamp },
      // { type: 'default', time: timestamp },
      // { type: 'progress', time: timestamp, progress: int 0-100 },
    ]
  }, override);
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
  return [
    Math.min(task.created, task.earliest),
    Math.max(timestamp(), task.due || task.until)
  ];
}

function task_is_overlap(task, range) {
  let e = task_get_endpoints(task);
  return (e[0] <= range[1]) && (range[0] <= e[1]);
}