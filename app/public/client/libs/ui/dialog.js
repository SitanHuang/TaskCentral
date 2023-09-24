async function ui_confirm(message="", opts={}) {
  return await _ui_raise_dialog(Object.assign({ message, cancel: true }, opts));
}

async function ui_alert(message = "", opts={}) {
  await _ui_raise_dialog(Object.assign({ message, cancel: false }, opts));
}

async function _ui_raise_dialog({
  message = "",
  cancel  = true,
  wide    = false
  // TODO: input = false
} = {}) {
  $("#modal-ui-dialog").toggleClass('wide', !!wide);

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
      MicroModal.close('modal-ui-dialog');

      primaryBtn.onclick = null;
      closeBtn.onclick = null;

      resolve(false);
    }
  });
}
