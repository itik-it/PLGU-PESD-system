// Loads server/.env no matter which folder the command is run from.
// Required first by db.js and auth/session.js.
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true })
