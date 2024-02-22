function project_new(obj) {
  obj = Object.assign({
    color: randomColor({luminosity: 'dark'}),
    fontColor: 'white',
    lastUsed: new Date().getTime(), // creation date
    number: 0 // accurate number of current tasks
  }, obj);

  if (!obj.hidden)
    delete obj.hidden;

  return obj;
}

function project_create_chip(name) {
  const proj = back.data.projects[name] || back.data.projects.default;
  const $p = $(document.createElement('project'));
  if (proj.hidden)
    $p.addClass('hidden-project');
  return $p.css('background-color', proj.color)
           .css('color', proj.fontColor)
           .text(name);
}

function project_color_element(ele, name) {
  const proj = back.data.projects[name] || back.data.projects.default;
  return ele.css('background-color', proj.color)
    .css('color', proj.fontColor);
}

function project_get_user_sorting() {
  return back.data.settings.projectSort || "time";
}

function _project_user_sort_func() {
  if (project_get_user_sorting() == "alpha") {
    return (a, b) =>
      (!!back.data.projects[a].hidden - !!back.data.projects[b].hidden) || // hidden projects go last
      a.localeCompare(b); // alphabetical sort of project names
  }

  return (a, b) =>
    (!!back.data.projects[a].hidden - !!back.data.projects[b].hidden) || // hidden projects go last
    (back.data.projects[b].lastUsed - back.data.projects[a].lastUsed); // last used project goes first
}