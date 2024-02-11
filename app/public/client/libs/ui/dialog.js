async function ui_confirm(message="", opts={}) {
  return await _ui_raise_dialog(Object.assign({ message, cancel: true }, opts));
}

async function ui_alert(message = "", opts={}) {
  return await _ui_raise_dialog(Object.assign({ message, cancel: false }, opts));
}

async function ui_prompt(message = "", defValue = "", opts={}) {
  return await _ui_raise_dialog(Object.assign({
    message,
    inputVal: defValue,
    input: "text"
  }, opts));
}

async function _ui_raise_dialog({
  message    = "",
  cancel     = true,
  wide       = false,
  cancelTxt  = "Cancel",
  okayTxt    = "OK",
  input      = false, // "text" / "number" / "password"
  min        = null,
  max        = null,
  valMinMax  = false,
  inputPlch  = '',
  inputVal   = '',
} = {}) {
  $("#modal-ui-dialog").toggleClass('wide', !!wide);

  $("#modal-ui-dialog .modal__btn.cancel").toggle(!!cancel);

  document.querySelector("#modal-ui-dialog .modal__content.text").textContent = message;

  document.querySelector("#modal-ui-dialog .modal__btn-primary").textContent = okayTxt;
  document.querySelector("#modal-ui-dialog button.cancel").textContent = cancelTxt;

  const inputContainer = document.querySelector("#modal-ui-dialog .modal__content.input");
  const inputEle = inputContainer.querySelector("input");

  if (input) {
    inputContainer.style.display = 'block';
    inputEle.type = input;
    inputEle.placeholder = inputPlch || '';
    inputEle.value = inputVal || '';
    inputEle.min = min;
    inputEle.max = max;
  } else {
    inputContainer.style.display = 'none';
  }

  MicroModal.show('modal-ui-dialog');

  inputEle.focus({ focusVisible: true });
  inputEle.select();

  return new Promise(resolve => {
    const primaryBtn = document.querySelector("#modal-ui-dialog .modal__btn.modal__btn-primary");
    primaryBtn.onclick = submitModalAndResolve;

    const closeBtn = document.querySelector("#modal-ui-dialog .modal__close");
    closeBtn.onclick = closeModalAndResolve;

    if (input) {
      $(inputEle).unbind('keydown').bind('keydown', function (e) {
        // no need to prevent modal from closing prematurely on enter since we
        // don't have form element
        e.keyCode === 13 && submitModalAndResolve();
      });
    }

    function closeModalAndResolve() {
      MicroModal.close('modal-ui-dialog');

      primaryBtn.onclick = null;
      closeBtn.onclick = null;

      resolve(input ? null : false);
    }
    function submitModalAndResolve() {
      const val = inputEle.value;

      if (valMinMax && (val < min || val > max))
        return;

      MicroModal.close('modal-ui-dialog');

      resolve(input ? val : true);
    }
  });
}
