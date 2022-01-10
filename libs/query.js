/*
 * query : {
 *   queries: [{
 *     from: time,
 *     to: time,
 *     projectRegex: null, // "none" | fuzzy string
 *     projects: [], // list or projects (OR filter)
 *     status: [], // OR filter
 *     hidden: null,
 *     due: null,
 *     collect: [
 *       'tasks', // return task entries
 *     ]
 *   }]
 * }
 */
function query_exec(query) {
  if (!query.queries.length)
    return [];

  let data = [];

  let _range_min;
  let _range_max;

  // Creating a set so that the first loop can eliminate
  // based on nonoverlapping time
  let tasks = new Set(Object.keys(back.data.tasks));

  for (let q of query.queries) {
    // -------- set up query --------
    _range_min = Math.min(_range_min || q.from, q.from);
    _range_max = Math.max(_range_max || q.to, q.to);

    q.projects = q.projects || [];
    q.status = q.status || [];
    q.hidden = typeof q.hidden == "boolean" ? q.hidden : null;
    q.due = typeof q.due == "boolean" ? q.due : null;

    q._range = [q.from, q.to];

    // regex can't be serialized to JSON
    // use underscore to preserve original query
    q._projectRegex = q.projectRegex ? fzy_compile(q.projectRegex) : null;

    let d = { from: q.from, to: q.to };
    data.push(d);

    for (let c of q.collect) {
      switch (c) {
        case 'tasks':
          d.tasks = [];
          break;
        default:
          throw `Unknown collect method: ${c}`;
      }
    }

  }

  let _range = [_range_min, _range_max];

  // -------- actual query --------
  for (let uuid of tasks) {
    let task = back.data.tasks[uuid];
    if (!task_is_overlap(task, _range)) {
      // remove from set so the next query doesn't waste time
      tasks.delete(uuid);
      continue;
    }

    for (let i = 0;i < query.queries.length;i++) {
      let q = query.queries[i];

      // a task might fulfill the overall range but
      // not the range of a specific query
      if (!task_is_overlap(task, q._range))
        continue; // go to next query

      // ------- exclusive conditions -------

      if (q.hidden !== null && q.hidden !== task.hidden)
        continue;
      if (q.due !== null && (q.due != (!!task.due)))
        continue;

      if (q.projects.length) {
        // q.projects can have null value
        // if (!task.project) // task has no project
        //   continue;
        let matched = false;
        for (let p of q.projects) {
          if (p == task.project) {
            matched = true;
            break; // only need 1 match
          }
        }
        if (!matched)
          continue;
      }
      if (q.status.length) {
        let matched = false;
        for (let p of q.status) {
          if (p == task.status) {
            matched = true;
            break; // only need 1 match
          }
        }
        if (!matched)
          continue;
      }

      if (q.projectRegex == 'none') {
        if (task.project)
          continue;
      } else if (q._projectRegex && !task?.project?.match(q._projectRegex))
        continue;
      // TODO: more exclusive conditions....

      // ----------- collect -----------
      if (q.collect.indexOf('tasks') >= 0)
          data[i].tasks.push(task);
    }
  }

  return data;
}

/*
 * range should be local midnights
 */
function query_generate_gantt_tracks(tasks, range) {
  let periods = _query_generate_gantt_periods(tasks, range);

  // sort by duration, longest periods go on top tracks
  periods = periods.sort((a, b) =>
    ((b.to - b.from) - (a.to - a.from)) ||
    // if difference == 0, importance is next
    (task_calc_importance(b.task) - task_calc_importance(a.task))
  );

  let tracks = [];

  for (let period of periods) {
    let track;

    // try out each track to see if available
    TRACK:
    for (let t of tracks) {
      // check overlap
      for (let p2 of t) {
        if (isOverlapping([period.from, period.to], [p2.from, p2.to]))
          continue TRACK;
      }
      // if nothing overlap, use track
      track = t;
      break;
    }

    // if no existing track available
    if (!track)
      tracks.push(track = []);

    track.push(period);
  }

  tracks.forEach(t => {
    console.log('---------');
    console.log(t.map(x => Math.round((x.to - x.from) / 8.64e+7) + 'd:' + new Date(x.from).toLocaleDateString() + '-' + new Date(x.to).toLocaleDateString() + ':' + x.task.name).join('\n'));
  });

  return tracks;
}

function _query_generate_gantt_periods(tasks, range) {
  let [from, to] = range;
  let periods = [];

  for (let task of tasks) {
    let [f, t] = task_gantt_endpoints(task).map(x => roundDateToNearestDay(x));

    // out of range
    if (f > to || t < from)
      continue;

    // truncate range
    f = Math.max(f, from);
    t = Math.min(t, to);

    periods.push({ from: f, to: t, task: task });
  }

  return periods;
}
