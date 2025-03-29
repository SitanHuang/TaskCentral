function ui_project_rules_raise_modal() {
  const $modal = $('#modal-project-rules');

  const $list = $modal.find('.rules-container').html('');
  const rules = back.data.projectPriorityCoeffRules || [];

  rules.forEach(function (rule) {
    $list.append(_ui_project_rules_create_row(rule));
  });

  history.pushState("modal-project-rules", null, null);
  window.onpopstate = function (event) {
    if (event) {
      MicroModal.close('modal-project-rules');
      window.onpopstate = null;
    }
  };
  MicroModal.show('modal-project-rules');
}

function _ui_project_rules_create_row(rule) {
  let $row = $($('#template-project-rule-row').html());

  $row.find('input[name="project"]').val(rule.query || '');

  $row.find('input[name="coeff"]').val(!isNaN(rule.coeff) ? rule.coeff : 1);
  $row.find('input[name="offset"]').val(!isNaN(rule.offset) ? rule.offset : 0);

  $row.find('.pr-rule-remove').click(function () {
    $row.remove();
  });

  return $row;
}

function _ui_project_rules_add_row() {
  let $list = $('#modal-project-rules .rules-container');
  let $row = _ui_project_rules_create_row({ query: '', coeff: 1, offset: 0 });
  $list.append($row);
}

function _ui_project_rules_modal_save() {
  let rules = [];
  $('#modal-project-rules .rules-container .project-rule-row').each(function () {
    let query = $(this).find('input[name="project"]').val().trim();
    if (query === '') return;
    let coeff = parseFloat($(this).find('input[name="coeff"]').val());
    let offset = parseFloat($(this).find('input[name="offset"]').val());
    if (isNaN(coeff)) coeff = 1;
    if (isNaN(offset)) offset = 0;
    rules.push({ query, coeff, offset });
  });
  back.data.projectPriorityCoeffRules = rules;
  back.set_dirty();
  ui_home_update_list();
  MicroModal.close('modal-project-rules');
}