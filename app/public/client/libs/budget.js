
function tracker_new(obj) {
  obj = Object.assign({
    type: 'limit', // or 'goal'
    duration: '', // smart duration
    name: '',

    start: '', // Sugar.js smart date
    end: '', // Sugar.js smart date

    projectRegex: '',
  }, obj);

  return obj;
}

function tracker_add(tracker) {
  back.data.trackers = back.data.trackers || [];

  back.data.trackers.unshift(tracker);
  back.set_dirty();
}

function tracker_reorder(index, newIndex) {
  const trackers = back.data.trackers;
  if (newIndex < -1 || newIndex > trackers.length) return;

  if (newIndex == -1)
    // move to front
    trackers.unshift(trackers.splice(index, 1)[0]);
  else if (newIndex == trackers.length)
    // move to end
    trackers.push(trackers.splice(index, 1)[0]);
  else
    // swap elements
    [trackers[index], trackers[newIndex]] = [trackers[newIndex], trackers[index]];

  back.set_dirty();
}

function tracker_delete(index) {
  back.data.trackers.splice(index, 1);

  back.set_dirty();
}

function tracker_gen_query(trackers) {
  trackers = trackers || back.data?.trackers || [];

  const queries = trackers.map(tracker => {
    let from = Sugar.Date.create(tracker.start);
    let to = Sugar.Date.create(tracker.end);
    return {
      from, to,

      projectRegex: tracker.projectRegex,

      // useGantt: true,
      collect: to > from && from > 0 ? [ 'tasks' ] : [], // placeholder for invalids
    };
  });

  return { queries };
}

function tracker_exec_query(trackers) {
  trackers = trackers || back.data?.trackers || [];

  return query_exec(tracker_gen_query(trackers));
}
