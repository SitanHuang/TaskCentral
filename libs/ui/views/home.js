let _home_addForm;
let _home_con;

function ui_menu_select_home() {
  _home_con = $('.content-container > div.home');
  _home_addForm = $('#add-form');
  _home_addForm[0].reset();
  _home_addForm.find('input').val('').change().blur(); // to trigger all listeners
  _home_addForm.removeClass('focus-within');
}

function ui_home_focus_input() {
  _home_addForm.find('input[name=name]').focus();
}

function ui_home_add_input_focus() {
  _ui_home_add_update_actions();
  _home_addForm.addClass('focus-within');
}

function _ui_home_add_update_actions() {
  let projects = _home_addForm.find('.detail-row .projects');
  projects.html('');

  Object.keys(back.data.projects)
    .sort((a, b) => back.data.projects[b].lastUsed - back.data.projects[a].lastUsed)
    .forEach(x => {
      project_create_chip(x)
        .appendTo(projects)
        .click(() => {
          _home_addForm.find('input[name=project]').val(x).change();
        });
    });
  
  $('<a href="#" class="pure-button flat-always"><i class="fa fa-plus"></i> NEW</a>')
    .click(() => {
      let $modal = $('#modal-home-new-proj');
      $modal.find('input').val('');
      $modal.find('input[name=color]').val(randomColor());

      let $colors = $modal.find('.pure-g.colors-container');
      $colors.html('');

      for (let i = 0; i < 3 * 5; i++) {
        let c = randomColor();
        let div = $(`
        <div class="pure-u-1-5">
          <color style="background-color: ${c}"></color>
        </div>
        `)
        div.click(() => {
          $modal.find('input[name=color]').val(c);
        }).appendTo($colors);
      }

      MicroModal.show('modal-home-new-proj');
    })
    .appendTo(projects);
}

function ui_home_add_project_callback(form) {
  form = $(form);
  const name = form.find('input[name=name]').val().trim();
  if (!name) return;

  const color = form.find('input[name=color]').val();

  const red = parseInt(color.substring(1,3),16);
  const green = parseInt(color.substring(3,5),16);
  const blue = parseInt(color.substring(5,7),16);
  const brightness = red*0.299 + green*0.587 + blue*0.114;

  back.data.projects[name] = project_new({
    color: color,
    fontColor: brightness > 180 ? 'black' : 'white'
  });

  back.set_dirty();

  MicroModal.close('modal-home-new-proj');

  _ui_home_add_update_actions();
  _home_addForm.find('input[name=project]').val(name).change();
}

function ui_home_add_project_changed(input) {
  input.value = input.value.trim();
  let proj = input.value;
  let $proj = _home_addForm.find('.input-row > .project').html('');
  if (!proj)
    return;

  project_create_chip(proj)
    .addClass('removable')
    .click(() => {
      input.value = '';
      ui_home_add_project_changed(input);
      ui_home_focus_input();
    })
    .appendTo($proj);

  ui_home_focus_input();
}

function ui_home_add_date_changed(input) {
  if (!input.value) {
    _ui_home_add_remove_date();
  } else {
    _ui_home_add_show_date();
  }
}

function _ui_home_add_remove_date() {
  _home_con.find('.datepicker').show();
  _home_con.find('.date-due').hide();
}

function _ui_home_add_show_date() {
  const due = task_parse_date_input(_home_addForm.find('input[name=due]').val());
   

  _home_con.find('.datepicker').hide();
  _home_con.find('.date-due')
            .text(task_stringify_due(due))
            .attr('style', task_colorize_due(due))
            .show();
}

function ui_home_remove_due_date() {
  _home_addForm.find('input[name=due]').val('').change();
}

function ui_home_add_trigger() {
  let name = _home_addForm.find('.input-row input[name=name]').val().trim();
  if (!name) return;

  let task = task_new({
    name: name,
    project: _home_addForm.find('.input-row input[name=project]').val() || null,
    due: task_parse_date_input(_home_addForm.find('.input-row input[name=due]')
           .val()).getTime() || null
  });
  task_set(task);

  ui_menu_select_home();
}

$(window).click(function() {
  if (!$('#modal-home-new-proj').hasClass('is-open'))
    _home_addForm.removeClass('focus-within');
});

$('#add-form').click(function(event){
  event.stopPropagation();
});

MicroModal.init();