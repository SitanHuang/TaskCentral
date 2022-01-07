/*
 * query : {
 *   queries: [{
 *     from: time,
 *     to: time,
 *     projects: [], // list or projects (OR filter)
 *     status: [], // OR filter
 *     hidden: null,
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
    q.hidden = q.hidden || null;

    q._range = [q.from, q.to];

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
      
      // TODO: more exclusive conditions....

      // ----------- collect -----------
      if (q.collect.indexOf('tasks') >= 0)
          data[i].tasks.push(task);
    }
  }

  return data;
}