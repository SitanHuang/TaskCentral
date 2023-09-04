async function ui_confirm(message="") {
  return new Promise(resolve => {
    document.querySelector("#modal-ui-confirm .modal__content").textContent = message;

    MicroModal.show('modal-ui-confirm');

    const primaryBtn = document.querySelector("#modal-ui-confirm .modal__btn.modal__btn-primary");
    primaryBtn.onclick = function () {
      MicroModal.close('modal-ui-confirm');

      resolve(true);
    };

    const closeBtn = document.querySelector("#modal-ui-confirm .modal__close");
    closeBtn.onclick = closeModalAndResolve;

    function closeModalAndResolve() {
      primaryBtn.onclick = null;
      closeBtn.onclick = null;

      resolve(false);
    }
  });
}