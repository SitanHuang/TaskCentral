let back = {
  data: {}
};

function resortTables() {
  const element = document.querySelector('.sortable th[class*=dir-]')
  if (element) {
    var reg = /dir-(u|d)/
    var class_name = element.className
    var before = reg.exec(class_name)[1]
    var after = before === 'u' ? 'd' : 'u'

    var new_class = class_name.replace(reg, ' ') + ' dir-' + after + ' '
    element.className = new_class
    element.click()
  }
}
