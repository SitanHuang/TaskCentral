async function ui_confirm(message="") {
  return await _ui_raise_dialog({ message, cancel: true });
}

async function ui_alert(message = "") {
  await _ui_raise_dialog({ message, cancel: false });
}

async function _ui_raise_dialog({
  message = "",
  cancel  = true,
  // TODO: input = false
} = {}) {
  $("#modal-ui-dialog .modal__btn.cancel").toggle(!!cancel);

  return new Promise(resolve => {
    document.querySelector("#modal-ui-dialog .modal__content").textContent = message;

    MicroModal.show('modal-ui-dialog');

    const primaryBtn = document.querySelector("#modal-ui-dialog .modal__btn.modal__btn-primary");
    primaryBtn.onclick = function () {
      MicroModal.close('modal-ui-dialog');

      resolve(true);
    };

    const closeBtn = document.querySelector("#modal-ui-dialog .modal__close");
    closeBtn.onclick = closeModalAndResolve;

    function closeModalAndResolve() {
      primaryBtn.onclick = null;
      closeBtn.onclick = null;

      resolve(false);
    }
  });
}