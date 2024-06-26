function ui_tooltips_init(container=$(document.body)) {
  container.find('*[data-tooltip]').each(function () {
    const label = $(this);
    const span = $('<span/>').text(label.text());

    span.click(function () {
      if (!$(document.body).hasClass('proMode'))
        ui_alert(label.attr('data-tooltip'));
    });

    label.html('').append(span);
  });
}

ui_tooltips_init();
