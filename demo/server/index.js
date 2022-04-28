const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const { verifySignature } = require('../../dist/siwt')

const app = express()
const port = 3000

app.use(cors())
app.use(bodyParser.json())

app.post('/signin', (req, res) => {
  const { message, signature, pk } = req.body
  try {
    const isValidSignature = verifySignature(message, pk, signature)
    if (isValidSignature) {
      // implement any further permissions checks
      res.send(true)
    }
    res.send(false)
  } catch {
    res.send('Invalid Signature')
  }
})

app.listen(port, () => {
  console.log(`SIWT server app listening on port ${port}`)
})
