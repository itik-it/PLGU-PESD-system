// Must be first: loads and validates server/.env, exits if it is invalid.
const env = require('./env')

const app = require('./app')

app.listen(env.PORT, () => {
  console.log(`LGU PESO server listening on port ${env.PORT}`)
})