# Sign in with Tezos

Sign in with Tezos is a small library that helps you as a Tezos dApp developer to:
- Prove a user owns the private keys to the address the user is trying to sign in with
- Add permissions to use with your API or FrontEnd

## Creating a SIWT Message
The only thing we need to create a message for signing in is the url of your dApp and the user's wallet address or pkh.

Create the message:
```
import { createMessage } from '@stakenow/siwt'

// constructing a message
const message = createMessage({
  dappUrl: 'your-cool-app.xyz',
  pkh: 'tz1',
})
```

The resulting message will look something like this:

` 0501000000bc54657a6f73205369676e6564204d6573736167653a2055524c20323032322d30342d32385430383a34383a33332e3636345a2055524c20776f756c64206c696b6520796f7520746f207369676e20696e207769746820504b482e200a2020`

Deconstructing this message it will have the following format:

- `05`: Indicates this is a Micheline expression
- `01`: Indicates it is converted to bytes
- `000000bc`: Indicates the lenght of the message in hex
- `54...`: The actual message in bytes

__This message is now ready to be signed by the user.__

## Sign the user in

When you have the user's signature you can use it to sign the user in.

To successfully sign in we need:
- The original message that was created earlier using the `createMessage` function
- The signature
- The public key of the user. (Be aware this is not the public key hash aka address. It can be obtained when asking permissions from Beacon.)

With this we cab verify the user is the actual owner of the address the user is trying to sign in with. It is very similar to a user proving the ownership of their username by providing the correct password.

This verification happens server side. This means you'll have to set up a server that provides api access. At this point the library looks for a `signin` endpoint. This (for now) is a hard requirement.

```
import { signin } from '@stakenow/siwt'

const API_URL = 'https://url-to-your-api.xyz'
const verification = signin(API_URL)({
  message
  signature,
  pk,
})
```

## Getting started

Signing in with Tezos will require a ui to interact with the user and an authentication api to make the necessary verifications and hand out permissions.

### Implementing the ui
On the ui we'll make use of [Beacon]('https://www.walletbeacon.io/') to interact with the user's wallet.

#### Connecting the wallet
```
const walletPermissions = await dAppClient.requestPermissions()
```
This will give your app permissions to interact with your user's wallet. It will give your app access to the user's public key, address and wallet information.

#### Create the message
```
const messagePayload = createMessagePayload({
  dappUrl: 'siwt.stakenow.fi',
  pkh: walletPermissions.address,
})
```

This will create a message payload that looks like this:
```
{
  signingType: 'micheline',
  payload: 'encoded message',
  sourceAddress: 'The wallet address of the user signing in',
}
```

The human readable message should look as follows

```
Tezos Signed Message: DAPP_URL DATE DAPP_URL would like you to sign in with USER_ADDRESS.
```

#### Requesting the signature
```
const signature = await dAppClient.requestSignPayload(messagePayload)
```

#### Sign the user into your app
```
const signedIn = await signIn('API_URL')({
  pk: walletPermissions.accountInfo.pk,
  pkh: walletPermissions.address,
  signature,
})
```

#### Using tokens
With a successful sign in the server will return a set of tokens:

**Access token**
Use the access token for authorization upon each protected API call. Add it as a bearer token in the `authorization` header of each API call.

**Refresh token**
If you have implemented a refresh token strategy use this token to obtain a new access token

**ID Token**
The ID token is used to obtain some information about the user that is signed in. Because it's a valid JWT token you can use any jwt decoding library to decode the token and use it's contents.

### Implementing the server
#### Verifying the signature
Just having the user sign this message is not enough. We also have to make sure the signature is valid before allowing the user to use our app.

This happens on the server and requires only the following:

```
const isValidSignature = verifySignature(message, pk, signature)
```

#### Creating tokens

Now that we have verified identity, we can let our application know all is good in the world. We do this using JSON Web Tokens or jwt for short.

For more information about JWT check https://jwt.io.

We'll use 3 different types of tokens:

#### Access Token
The access token will be used for token based authentication for the API.

To create an access token the user's PKH is required, but more claims are supported by supplying a claims object.

The access token is valid for 15 minutes

```
import { generateAccessToken } from '@stakenow/siwt'

const pkh = 'PKH'
const optionalClaims = {
  claimKey: 'claimValue',
}

const accessToken = generateAccessToken({
  pkh,
  claims: optionalClaims,
})
```

On each protected api route you'll have to verify if the access token is still valid.

Therefore the token should be sent with each call to the api in an Authorization header as a Bearer token and verified:

```
const accessToken = req.headers.authorization.split(' ')[1]
const pkh = verifyAccessToken(accessToken)

```
If the accessToken is valid, you'll receive the pkh of the valid user. Validate this with the account data that's being requested. If everything checks out, supply the user with the requested API information.

If the accessToken is invalid, pkh will be false. The user should not get an API response.

#### Refresh Token
By default the access token is valid for 15 minutes only. After this the user will no longer be able to request information from the API. To make sure you won't need to make the user sign another message to retrieve a valid access token, you can implement a refresh token flow.

Creating a refresh token:
```
import { generateRefreshToken } from '@stakenow/siwt'

generateRefreshToken('PKH OF THE USER')
```

Verifying the refresh token
```
import { verifyRefreshToken } from '@stakenow/siwt'

try {
  verifyRefreshToken('REFRESH TOKEN')
  // Refresh the access token for the user
} catch {
  // AccessToken cannot be renewd. Log your user out and request a new signed message to log in again.
}
```

More information on [refresh tokens](https://auth0.com/docs/secure/tokens/refresh-tokens)

#### ID Token
The ID token is an optional token, used for some extra information about your user. It is long lived and can be used to maintain some information about your user in your application.

It requires the user's pkh, and takes claims and extra userInfo optionally:

```
import { generateIdToken } from '@stakenow/siwt'

const pkh = 'PKH'
const optionalClaims = {
  claimName: 'claimValue',
}
const optionalUserInfo = {
  tokenId: 'MEMBERSHIP_TOKEN_ID',
}

generateIdToken({
  pkh,
  claims: optionalClaims,
  userInfo: optionalUserInfo,
})
```

### Putting it all together


*index.js*

```
import { DAppClient } from '@airgap/beacon-sdk'
import jwt_decode from 'jwt-decode'

import * as siwt from '../../dist/siwt'

const dAppClient = new DAppClient({ name: 'SIWT Demo' })
const state = { accessToken: '' }

const getProtectedData = () => {
  fetch('http://localhost:3000/protected', {
    method: 'GET',
    headers: {
      authorization: `Bearer ${state.accessToken}`,
    },
  })
    .then(response => response.json())
    .then(data => {
      const protectedDataContainer = document.getElementsByClassName('protected-data-content-container')[0]
      protectedDataContainer.innerHTML = data
    })
    .catch(error => {
      const protectedDataContainer = document.getElementsByClassName('protected-data-content-container')[0]
      protectedDataContainer.innerHTML = error.message
    })
}

const getPublicData = () => {
  fetch('http://localhost:3000/public', {
    method: 'GET',
  })
    .then(response => response.json())
    .then(data => {
      const publicDataContainer = document.getElementsByClassName('public-data-content-container')[0]
      publicDataContainer.innerHTML = data
    })
    .catch(error => {
      const publicDataContainer = document.getElementsByClassName('public-data-content-container')[0]
      publicDataContainer.innerHTML = error.message
    })
}

const login = async () => {
  try {
    // request wallet permissions with Beacon dAppClient
    const walletPermissions = await dAppClient.requestPermissions()

    // create the message to be signed
    const messagePayload = siwt.createMessagePayload({
      dappUrl: 'siwt.stakenow.fi',
      pkh: walletPermissions.address,
    })

    // request the signature
    const signedPayload = await dAppClient.requestSignPayload(messagePayload)

    // sign in the user to our app
    const { data } = await siwt.signIn('http://localhost:3000')({
      pk: walletPermissions.accountInfo.publicKey,
      pkh: walletPermissions.address,
      message: messagePayload.payload,
      signature: signedPayload.signature,
    })

    const { accessToken, idToken } = data
    state.accessToken = accessToken

    const contentContainer = document.getElementsByClassName('content-container')[0]

    if (idToken) {
      const userIdInfo = jwt_decode(idToken)
      contentContainer.innerHTML = `<h3>You are logged in as ${userIdInfo.pkh}</h3>`
    }
  } catch (error) {
    const contentContainer = document.getElementsByClassName('content-container')[0]
    contentContainer.innerHTML = error.message
  }
}

const init = () => {
  const loginButton = document.getElementsByClassName('connect-button')[0]
  const loadPublicDataButton = document.getElementsByClassName('load-public-data-button')[0]
  const loadProtectedDataButton = document.getElementsByClassName('load-private-data-button')[0]
  loginButton.addEventListener('click', login)
  loadPublicDataButton.addEventListener('click', getPublicData)
  loadProtectedDataButton.addEventListener('click', getProtectedData)
}

window.onload = init
```

*index.html*
```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Sign In with Tezos Demo</title>
  </head>
  <body>
    <div>
        <h1>Sign in with Tezos</h1>
        <button class="connect-button">Connect</button>
        <div class="content-container"></div>
        <div>
          <div>
            <h2>Public data:</h2>
            <div class="public-data-content-container"></div>
            <button class="load-public-data-button">Load public data</button>
          </div>
          <div class="basis-1/2">
            <h2>Protected data:</h2>
            <div class="protected-data-content-container"></div>
            <button class="load-private-data-button">Load private data</button>
          </div>
        </div>
      </div>
    </div>
    <script src="main.js"></script>
  </body>
</html>
```

*For the full setup including build process check the demo folder*

### Implementing your authorization API (aka the backend)

The library relies on your signin endpoint to be called `/signin`, which is a `POST` request that takes the following body: 
```
{
  pk: 'USER ADDRESS',
  pkh: 'USER PUBLIC KEY',
  signature: 'MESSAGE SIGNATURE',
}
```

For this example we'll write this endpoint in Node.js using Express:

```
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
} = require('../../dist/siwt')

const app = express()
const port = 3000

app.use(cors())
app.use(bodyParser.json())

const authenticate = async (req, res, next) => {
  try {
    // decode the access token
    const accessToken = req.headers.authorization.split(' ')[1]
    const pkh = verifyAccessToken(accessToken)
    if (pkh) {
      const accessControl = queryAccessControl({
        contractAddress: 'KT1',
        parameters: {
          pkh,
        },
        test: {
          comparator: '=',
          value: 1,
        },
      })

      if (accessControl.tokenId) {
        return next()
      }
    }
    return res.status(403).send('Forbidden')
  } catch (e) {
    console.log(e)
    return res.status(403).send('Forbidden')
  }
}

app.post('/signin', (req, res) => {
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
      const access = queryAccessControl({
        contractAddress: 'KT1',
        parameters: {
          pkh,
        },
        test: {
          comparator: '=',
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
    return res.status(403).send('Forbidden')
  } catch (e) {
    console.log(e)
    return res.status(403).send('Forbidden')
  }
})

app.get('/public', (req, res) => {
  res.send(JSON.stringify('This data is public. Anyone can request it.'))
})

app.get('/protected', authenticate, (req, res) => {
  res.send(JSON.stringify('This data is protected but you have the required NFT so you have access to it.'))
})

app.listen(port, () => {
  console.log(`SIWT server app listening on port ${port}`)
})
```

## Running the demo

### Build the SIWT Library
Currently the demo is setup to run with a local distribution of SIWT. So until it's available through NPM we have to build the library first.

From the root folder run:
```
npm install
npm run build
```

### Start the server
From the root folder run:
```
npm run demo:server:start
``` 

If everything went correctly you should see the following message:

`SIWT server app listening on port 3000`

### Build and run the ui
In a new terminal window from the root folder run:
```
npm run demo:ui:start
```

__Happy Demo!__
