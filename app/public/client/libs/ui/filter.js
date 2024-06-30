let _filter_modal;
let _filter_current_target;

const filter_available_statuses = ['default', 'ready', 'start', 'completed', 'recur', 'weight', 'snoozed'];

/*
 * target: reference to query obj to be changed
 * callback: when filter updates
 */
function ui_filter_open(target, callback) {
  target = target && target.queries[0];

  // Removed, should query everything, not just default
  // target.status = target.status?.length ? target.status : ['default'];

  target.status = target.status?.length ? target.status : [];

  _filter_current_target = target;

  _filter_modal = $('#modal-filter');

  let form = _filter_modal.find('form');
  form[0].onsubmit = () => {
    // forces html5 check
    if (!form[0].checkValidity()) return false;

    Object.assign(target, _ui_filter_form_to_query());

    setTimeout(() => callback(target), 0);

    MicroModal.close('modal-filter');

    return false;
  };

  form.find('input').unbind('keydown').bind('keydown', function (e) {
    // submit form & prevent modal from closing prematurely on enter
    e.keyCode === 13 && (e.preventDefault() || form[0].onsubmit());
  });

  form.find('input[name=project]')
    .val(target.projectRegex || '');

  form.find('input[name=name]')
    .val(target.name || '');

  if (target.projects?.length)
    form.find('input[name=projects]').val(target.projects.join(', ')).parent().show();
  else
    form.find('input[name=projects]').parent().hide();

  filter_available_statuses.forEach(x => {
    form.find('#filter-checkbox-' + x)[0]
      .checked = target.status.indexOf(x) >= 0;
  });

  form.find('select[name=visibility]')
    .val(typeof target.hidden != 'boolean' ? "" : (target.hidden ? "hidden" : "visible"));

  form.find('select[name=due]')
    .val(String(target.due || null));

  ['from', 'to'].forEach(x => {
    form.find('input[name=' + x + ']')[0]
      .valueAsNumber = target[x];
  });

  MicroModal.show('modal-filter');
}

function _ui_filter_form_to_query() {
  let form = _filter_modal.find('form');

  let visibility = form.find('select[name=visibility]').val();

  let status = [];
  filter_available_statuses.forEach(x => {
    if (form.find('#filter-checkbox-' + x)[0].checked)
      status.push(x);
  });

  return {
    from: task_parse_date_input(form.find('input[name=from]').val()).getTime(),
    to: task_parse_date_input(form.find('input[name=to]').val()).getTime(),
    hidden: visibility == 'hidden' ? true : (visibility == 'visible' ? false : null),
    projectRegex: form.find('input[name=project]').val() || null,
    name: form.find('input[name=name]').val() || null,
    status: status,
    due: eval(form.find('select[name=due]').val()),
  };
}

async function ui_filter_save() {
  if (!_filter_current_target) return false;

  let form = _filter_modal.find('form');

  // forces html5 check
  if (!form[0].checkValidity()) return false;

  let name = (await ui_prompt('Enter the name of this custom filter:'))?.trim();
  if (!name) return false;

  form[0].onsubmit();

  // now _filter_current_target is ready
  back.data.filters[name] = JSON.parse(JSON.stringify(_filter_current_target));
  back.set_dirty();
  ui_filter_update_holders();
}

let _ui_filter_update_holders_prev_target_provider;
let _ui_filter_update_holders_prev_callback_provider;

function ui_filter_update_holders(target_provider, callback_provider) {
  _ui_filter_update_holders_prev_target_provider = target_provider = target_provider || _ui_filter_update_holders_prev_target_provider;
  _ui_filter_update_holders_prev_callback_provider = callback_provider = callback_provider || _ui_filter_update_holders_prev_callback_provider;

  $('.filters-holder').each(function () {
    let holder = $(this).html('');

    let tooltips = $('.filter-save-tip').show();

    Object.keys(back.data.filters).forEach(name => {
      tooltips.hide();

      let row = $(`
        <div class="pure-button-group" role="group">
          <button class="pure-button"></button>
          <button class="pure-button"><i class="fa fa-times"></i></button>
        </div>
      `);
      row.find('button:first-child').text(name).click(() => {
        let target = target_provider();
        target = target && target.queries[0];
        Object.assign(target, back.data.filters[name]);
        callback_provider()();
      });
      row.find('button:last-child').click(() => {
        delete back.data.filters[name];
        back.set_dirty();
        ui_filter_update_holders(target_provider, callback_provider);
      });
      row.appendTo(holder);
    });
  });
}
