let _import_con;

function ui_menu_select_import() {
  _import_con = $('.content-container > div.import');
}

async function ui_import_tsv() {
  const tsv = _import_con.find('textarea.import-data').val().replace(/[\n\r]+/, '\n');

  const commands = _ui_import_gen_commands(tsv);

  console.log(commands);

  let msg = `The following ${commands.length} tasks were successfully parsed. Are you okay with this?\n\n`;

  commands.forEach(x => {
    msg += `+ (${x.project}) "${x.name}" - `;

    msg += x.ref ? `ref="${x.ref}"; ` : '';
    msg += x.dependsOn ? `dependsOn="${x.dependsOn}"; ` : '';
    msg += x.earliest ? `earliest=${new Date(x.earliest).toLocaleDateString()}; ` : '';
    msg += x.due ? `due=${new Date(x.due).toLocaleDateString()}; ` : '';
    msg += x.until ? `until=${new Date(x.until).toLocaleDateString()}; ` : '';

    msg += '\n';
  });

  if (!(await ui_confirm(msg, { wide: true })))
    return;

  await _ui_import_exec_commands(commands);

  await ui_alert("Tasks have successfully been imported.");
}

async function _ui_import_exec_commands(commands) {
  const refs = new Map();

  const dependsOnCmds = [];

  for (const obj of commands) {
    let useRef = null;

    if (obj.ref) {
      useRef = obj.ref;

      delete obj.ref;
    }

    let useDependsOn = null;

    if (obj.dependsOn) {
      useDependsOn = obj.dependsOn;

      delete obj.dependsOn;
    }

    const task = task_new(obj);

    const proj = back.data.projects[task.project];
    if (!proj) {
      await ui_alert(`Project "${task.project}" hasn't been created. System will create one for you.`);

      back.data.projects[task.project] = project_new();
    }

    task_set(task);

    if (useRef) {
      refs.set(useRef, task);
    }

    if (useDependsOn) {
      useDependsOn.split(",").forEach(x => {
        dependsOnCmds.push([task, x]); // [child, parentRef]
      });
    }
  }

  for (const [child, refId] of dependsOnCmds) {
    const parent = refs.get(refId);
    if (!parent) continue;

    task_set_dependency(child, parent);
  }
}

function _ui_import_gen_commands(tsv) {
  const rows = tsv.split("\n");

  const fields = {
    ref: 0,
    name: 1,
    priority: 2,
    weight: 3,
    project: 4,
    earliest: 5,
    due: 6,
    until: 7,
    notes: 8,
  };

  const reqFields = [1, 2, 3, 4];

  const commands = [];

  const encounteredRefs = new Set();

  const dats = [];

  ROW0:
  for (let row of rows) {
    row = row.split("\t");

    const dat = Object.assign({}, fields);

    // check required fields
    for (let i of reqFields)
      if (!row[i]?.trim().length)
        continue ROW0;

    Object.keys(dat).forEach(key => dat[key] = row[dat[key]]?.trim());

    if (dat.ref?.length) {
      if (encounteredRefs.has(dat.ref)) {
        // duplicate ref
        delete dat.ref;
      } else {
        encounteredRefs.add(dat.ref);
      }
    }

    dats.push(dat);
  }

  ROW:
  for (const dat of dats) {
    // check dates are good
    if (dat.earliest?.length) {
      if (dat.earliest.split(",").every(x => encounteredRefs.has(x))) {
        dat.dependsOn = dat.earliest;
        delete dat.earliest;
      } else {
        dat.earliest = new Date(dat.earliest + ' 00:00:00').getTime();
        if (dat.earliest < new Date('2010-01-01') || dat.earliest > new Date('2099-01-01'))
          continue ROW;
      }
    } else {
      delete dat.earliest;
    }
    if (dat.due?.length) {
      dat.due = new Date(dat.due + ' 00:00:00').getTime();
      if (dat.due < new Date('2010-01-01') || dat.due > new Date('2099-01-01'))
        continue ROW;
    } else {
      delete dat.due;
    }
    if (dat.until?.length) {
      dat.until = new Date(dat.until + ' 00:00:00').getTime();
      if (dat.until < new Date('2010-01-01') || dat.until > new Date('2099-01-01'))
        continue ROW;
    } else {
      delete dat.until;
    }

    // check numbers
    dat.priority = parseFloat(dat.priority);
    dat.weight = parseFloat(dat.weight);
    if (!Number.isInteger(dat.priority) || dat.priority < 0 || dat.priority > 100)
      continue ROW;
    if (!Number.isInteger(dat.weight) || dat.weight < 0 || dat.weight > 100)
      continue ROW;

    dat.priority /= 10;
    dat.weight /= 10;

    if (!dat.notes?.length)
      delete dat.notes;

    commands.push(dat);
  }

  return commands;
}
