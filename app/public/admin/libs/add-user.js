function admin_add_user_submit() {
  const username = $('#addUsername').val();
  const password = $('#addPassword').val();
  const status = $('#addStatus').val();

  const fail = function (jqXHR, textStatus, errorThrown) {
    alert(`Sync failed - （${textStatus}: ${errorThrown}）`);
  }

  $.ajax({
    type: "POST",
    url: "addUser",
    data: {
      status: status,
      username: username,
      password: password
    },
  }).fail(fail).done(function (dat) {
    if (dat != 'ok')
      alert('Error: ' + dat);
    else
      alert('ok');
  });
}
