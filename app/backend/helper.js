const formatVariable = (v) => {
  if (typeof v === 'string' || v instanceof String) {
    return `"${v}"`
  }
  if (Array.isArray(v)) {      
    let elems = v.map(e => {
      return formatVariable(e)
    })
    elems = elems.join(',')
    return `[${elems}]`
  }
  return v
}

module.exports = {
  formatVariable: formatVariable
};