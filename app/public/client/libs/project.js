function project_new(obj) {
  return Object.assign({
    color: randomColor({luminosity: 'dark'}),
    fontColor: 'white',
    lastUsed: new Date().getTime(), // creation date
    number: 0 // accurate number of current tasks
  }, obj);
}

function project_create_chip(name) {
  let proj = back.data.projects[name] || back.data.projects.default;
  let $p = $(document.createElement('project'));
  return $p.css('background-color', proj.color)
           .css('color', proj.fontColor)
           .text(name);
}
