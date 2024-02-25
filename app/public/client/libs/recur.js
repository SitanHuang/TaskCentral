
function task_recur_gen_new(template, ind_start, ind_count=1) {
  const now = timestamp();

  const recurInt = template.recurInts;

  for (let i = 0;i < ind_count;i++) {
    let ind = ind_start + i + 1;

    // deep clone
    let task = JSON.parse(JSON.stringify(template));

    // assign new uuid
    task.id = uuidv4();
    task.created = now;
    task.status = 'default';

    // remove recur stuff
    delete task.recurInts;
    delete task.recurIndex;
    delete task.recurLim;

    // new dates
    ['earliest', 'until', 'due'].forEach(x => {
      if (task[x])
        task[x] = addDateByRecurInt(task[x], recurInt, ind).getTime();
    });
    task.log.forEach(log => {
      if (log.time)
        log.time = addDateByRecurInt(log.time, recurInt, ind).getTime();
    });

    task_set(task);
  }
}

function task_recur_get_threshold(template) {
  return addDateByRecurInt(
    template.created,
    template.recurInts,
    template.recurIndex - template.recurLim + 1
  ).getTime();
}

function task_recur_gen_readable_info(template) {
  return `Instances created: ${template.recurIndex}\n` +
         `Next instance to be created after ${
          template.recurLim == 0 ?
            "∞ (Recurrence Limit=0)" :
            new Date(task_recur_get_threshold(template)).toLocaleString()
         }.`;
}

function task_recur_recalc(template) {
  if (template.status != 'recur')
    return;

  // recurrence is paused
  if (template.recurLim == 0)
    return;

  const now = timestamp();

  // generate until date of recurInd - lim + 1 > now
  while (now >= task_recur_get_threshold(template)) {
    task_recur_gen_new(template, template.recurIndex++, 1);
  }
}