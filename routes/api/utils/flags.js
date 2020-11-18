// Takes in an integer and checks it against a flag, returns true/false
function checkFlag(integer, flag) {
  return (flag & integer) == flag
}

module.exports = checkFlag