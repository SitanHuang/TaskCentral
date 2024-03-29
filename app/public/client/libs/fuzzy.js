function fzy_compile(q) {
  if (q.indexOf('\\v') == 0)
    return new RegExp(q.substring(2));
  q = ("^[^.]*" + q
    .replace(/\*/g, '␞')
    .replace(/\./g, '[^.]*\\.[^.]*')
    .replace(/([a-z])/gi, '[^.]*$1[^.]*') + '[^.]*$')
    .replace(/\[\^\.\]\*\[\^\.\]\*/g, '[^.]*')
    .replace(/\[\^\.\]\*\.\*/g, '.*')
    .replace(/␞/g, '.*?');

  return new RegExp(q, 'i');
}

function fzy_compile_name(q) {
  if (q.indexOf('\\v') == 0)
    return new RegExp(q.substring(2));
  else
    return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
