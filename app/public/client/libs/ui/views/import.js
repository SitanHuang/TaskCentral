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

    msg += x.earliest ? `Earliest ${new Date(x.earliest).toLocaleDateString()}; ` : '';
    msg += x.due ? `Due ${new Date(x.due).toLocaleDateString()}; ` : '';

    msg += '\n';
  });

  if (!(await ui_confirm(msg, { wide: true })))
    return;

  await _ui_import_exec_commands(commands);

  await ui_alert("Tasks have successfully been imported.");
}

async function _ui_import_exec_commands(commands) {
  for (const obj of commands) {
    const task = task_new(obj);

    const proj = back.data.projects[task.project];
    if (!proj) {
      await ui_alert(`Project "${task.project}" hasn't been created. System will create one for you.`);

      back.data.projects[task.project] = project_new();
    }

    task_set(task);
  }
}

function _ui_import_gen_commands(tsv) {
  const rows = tsv.split("\n");

  const fields = {
    name: 0,
    priority: 1,
    weight: 2,
    project: 3,
    earliest: 4,
    due: 5,
    notes: 6,
  };

  const reqFields = [0, 1, 2, 3];

  const commands = [];

  ROW:
  for (let row of rows) {
    row = row.split("\t");

    const dat = Object.assign({}, fields);

    // check required fields
    for (let i of reqFields)
      if (!row[i]?.trim().length)
        continue ROW;

    Object.keys(dat).forEach(key => dat[key] = row[dat[key]]?.trim());

    // check dates are good
    if (dat.earliest?.length) {
      dat.earliest = new Date(dat.earliest + ' 00:00:00').getTime();
      if (dat.earliest < new Date('2010-01-01') || dat.earliest > new Date('2099-01-01'))
        continue ROW;
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

    // check numbers
    dat.priority = parseFloat(dat.priority);
    dat.weight = parseFloat(dat.weight);
    if (!Number.isInteger(dat.priority) || dat.priority < 1 || dat.priority > 10)
      continue ROW;
    if (!Number.isInteger(dat.weight) || dat.weight < 1 || dat.weight > 10)
      continue ROW;

    if (!dat.notes?.length)
      delete dat.notes;

    commands.push(dat);
  }

  return commands;
}
