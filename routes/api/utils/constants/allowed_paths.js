// Identities
const NAME_COMMITMENTS = 'nameCommits.json'

// Currencies
const CURRENCY_BLACKLIST = 'shepherd/currencies/blacklist.json'
const CURRENCY_WHITELIST = 'shepherd/currencies/whitelist.json'
const CURRENCY_GRAYLIST = 'shepherd/currencies/graylist.json'

// Updates
const UPDATE_LOG = 'updatelog.json'

const ALLOWED_PATHS_ARR = [
  NAME_COMMITMENTS,
  CURRENCY_BLACKLIST,
  CURRENCY_GRAYLIST,
  CURRENCY_WHITELIST,
  UPDATE_LOG,
];

module.exports = {
  NAME_COMMITMENTS,
  CURRENCY_BLACKLIST,
  CURRENCY_GRAYLIST,
  CURRENCY_WHITELIST,
  ALLOWED_PATHS_ARR,
  UPDATE_LOG
}