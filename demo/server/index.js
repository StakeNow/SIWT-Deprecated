const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const {
  verifySignature,
  generateAccessToken,
  queryAccessControl,
  generateRefreshToken,
  generateIdToken,
  verifyAccessToken,
} = require('@stakenow/siwt')

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(bodyParser.json())

const authenticateSignIn = async (req, res, next) => {
  try {
    // decode the access token
    const accessToken = req.headers.authorization.split(' ')[1]
    const pkh = verifyAccessToken(accessToken)
    if (pkh) {
      return next()
    }
    return res.status(403).send(JSON.stringify('Forbidden'))
  } catch (e) {
    console.log(e)
    return res.status(403).send(JSON.stringify('Forbidden'))
  }
}

const authenticateAccess = async (req, res, next) => {
  try {
    // decode the access token
    const accessToken = req.headers.authorization.split(' ')[1]
    const pkh = verifyAccessToken(accessToken)
    if (pkh) {
      const accessControl = await queryAccessControl({
        contractAddress: 'KT1VsJKRrrShExaN1WnzAWpe6nbDWmp19b7G',
        parameters: {
          pkh,
        },
        test: {
          comparator: '>=',
          value: 1,
        },
      })

      if (accessControl.passedTest) {
        return next()
      }
    }
    return res.status(403).send(JSON.stringify('This data is protected you need to have the required NFT for access.'))
  } catch (e) {
    console.log(e)
    return res.status(403).send(JSON.stringify('Forbidden'))
  }
}

app.post('/signin', async (req, res) => {
  const { message, signature, pk, pkh } = req.body
  try {
    const isValidSignature = verifySignature(message, pk, signature)
    if (isValidSignature) {
      // when a user provided a valid signature, we can obtain and return the required information about the user.

      // the usage of claims is supported but not required.
      const claims = {
        iss: 'https://api.siwtdemo.stakenow.fi',
        aud: ['https://siwtdemo.stakenow.fi'],
        azp: 'https://siwtdemo.stakenow.fi',
      }

      // the minimum we need to return is an access token that allows the user to access the api. The pkh is required, extra claims are optional
      const accessToken = generateAccessToken({ pkh, claims })

      // we can use a refresh token to allow the access token to be refreshed without the user needing to log in again
      const refreshToken = generateRefreshToken(pkh)

      // we can use a long-lived ID token to return some personal information about the user to the UI.
      const access = await queryAccessControl({
        contractAddress: 'KT1VsJKRrrShExaN1WnzAWpe6nbDWmp19b7G',
        parameters: {
          pkh,
        },
        test: {
          comparator: '>=',
          value: 1,
        },
      })

      const idToken = generateIdToken({
        claims,
        userInfo: {
          ...access,
        },
      })

      return res.send({
        accessToken,
        refreshToken,
        idToken,
        tokenType: 'Bearer',
      })
    }
    return res.status(403).send(JSON.stringify('Forbidden'))
  } catch (e) {
    console.log(e)
    return res.status(403).send(JSON.stringify('Forbidden'))
  }
})

app.get('/public', (req, res) => {
  res.send(JSON.stringify('This data is public. Anyone can request it.'))
})
  
app.get('/signin-required', authenticateSignIn, (req, res) => {
  res.send(JSON.stringify('Thank you for having signed in. This is the only way.'))
})

app.get('/protected', authenticateAccess, (req, res) => {
  res.send(JSON.stringify('This data is protected but you have the required NFT so you have access to it.'))
})

app.listen(port, () => {
  console.log(`SIWT server app listening on port ${port}`)
})
