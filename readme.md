# **SIWT**

Sign In With Tezos (SIWT) is a library that supports the development of your decentralized application (dApp) by
- **proving** the users ownership of the private key to the address the user signs in with,
- adding **permissions** to use your API or FrontEnd based on the **ownership** of a Non-Fungible Token (NFT).

**Table of contents:**

- [**SIWT**](#siwt)
  - [Technical concepts](#technical-concepts)
    - [**SIWT Message**](#siwt-message)
    - [**Signing in the user**](#signing-in-the-user)
    - [**Query access control**](#query-access-control)
    - [**Tokens**](#tokens)
  - [Getting started with your project](#getting-started-with-your-project)
    - [**Implementing the ui**](#implementing-the-ui)
      - [**Connecting the wallet**](#connecting-the-wallet)
      - [**Creating the message**](#creating-the-message)
      - [**Requesting the signature**](#requesting-the-signature)
      - [**Signing the user into your dApp**](#signing-the-user-into-your-dapp)
      - [**Token types**](#token-types)
    - [**Implementing the server**](#implementing-the-server)
      - [**Verifying the signature**](#verifying-the-signature)
      - [**Creating tokens**](#creating-tokens)
    - [**Putting it all together**](#putting-it-all-together)
    - [**Implementing your authorization API**](#implementing-your-authorization-api)
  - [Run the demo](#run-the-demo)
    - [**Clone the project**](#clone-the-project)
    - [**Add environment variables**](#add-environment-variables)
    - [**Start the demo**](#start-the-demo)
    - [**Start the server**](#start-the-server)
    - [**Build and run the ui**](#build-and-run-the-ui)
  - [Built with](#built-with)
  - [Future outlook](#future-outlook)
  - [Get in contact](#get-in-contact)

## Technical concepts

### **SIWT Message**
The message is constructed from the URL to your dApp and the user's wallet address more specifically the private key hash (pkh).

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

Deconstructing this message will reveal the following format:

- `05`: Indicates that this is a Micheline expression
- `01`: Indicates it is converted to bytes
- `000000bc`: Indicates the length of the message in hex
- `54...`: Is the actual message in bytes

__This message is now ready to be signed by the user.__

### **Signing in the user**

The user specific signature derived from the signed message is used to sign the user into the dApp.

To successfully sign in you will need:
- The original message that was created earlier using the `createMessage` function,
- the signature itself and
- the public key of the user.

  (Be aware that this is not the public key hash (pkh) also known as the address. This public key can be obtained when asking permissions from Beacon.)

With this you can verify the user is the actual owner of the address he/she is trying to sign in with. It is very similar to a user proving the ownership of their username by providing the correct password. This verification happens server side. This means you will have to set up a server that provides the API access. At this point the library looks for a `signin` endpoint. This is (for now) a hard requirement.

```
import { signin } from '@stakenow/siwt'

const API_URL = 'https://url-to-your-api.xyz'
const verification = signin(API_URL)({
  message
  signature,
  pk,
})
```

### **Query access control**

Now that the user is signed in to your dApp, you can check whether your user has the required NFT to obtain permissions for your app. 
For this you can use `queryAccessControl`.

The `queryAccessControl` function requires your NFT token contract, the pkh of the user and the ruleset to test against:

```
  {
    contractAddress: 'CONTRACT_ADDRESS'
    parameters: {
      pkh: 'PKH'
    }
    test: {
      comparator: '='
      value: 1
    }
  }
```

### **Tokens**

Now that we have permissions it is time to let your dApp know. For communicating information about your user, JWT tokens are being used. SIWT provides an abstraction to make it more convenenient to work with them. It does expect you to generate secure secrets and keep them in your .env file.


## Getting started with your project
The SIWT library is available through `npm`. For contributions and building it locally see [contributing.md](./CONTRIBUTING.md).
```
npm install @stakenow/siwt
```

### **Implementing the ui**
Sign In With Tezos will require a ui to interact with the user and an authentication API to make the necessary verifications and hand out permissions. On the ui we will make use of [Beacon]('https://www.walletbeacon.io/') to interact with the user's wallet.

#### **Connecting the wallet**
```
const walletPermissions = await dAppClient.requestPermissions()
```
This will give your dApp permissions to interact with your user's wallet. It provides access to the user's information regarding public key, address and wallet.

#### **Creating the message**
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

The human readable message presents as follows:

```
Tezos Signed Message: DAPP_URL DATE DAPP_URL would like you to sign in with USER_ADDRESS.
```

#### **Requesting the signature**
```
const signature = await dAppClient.requestSignPayload(messagePayload)
```

#### **Signing the user into your dApp**
```
const signedIn = await signIn('API_URL')({
  pk: walletPermissions.accountInfo.pk,
  pkh: walletPermissions.address,
  signature,
})
```

#### **Token types**
With a successful sign in the server will return the following set of tokens:

_Access Token:_

Use the access token for authorization upon each protected API call. Add it as a bearer token in the `authorization` header of each API call.

_Refresh Token:_

If you have implemented a refresh token strategy use this token to obtain a new access token.

_ID Token:_

The ID token is used to obtain some information about the user that is signed in. Because it is a valid JWT token you can use any jwt decoding library to decode the token and use it's contents.

### **Implementing the server**
#### **Verifying the signature**
Just having the user sign this message is not enough. We also have to make sure the signature is valid before allowing the user to use our dApp. This happens on the server and requires only the following statement:

```
const isValidSignature = verifySignature(message, pk, signature)
```

#### **Creating tokens**

Now that you have verified the identity, you can let your application know all is good in the world. You do this using JSON Web Tokens or JWT for short. For more information about JWT check the [official website](https://jwt.io). You will use three different types of tokens:

_Access Token:_

The access token will be used for token based authentication for the API. To create an access token the user's pkh is required, but more claims are supported by supplying a claims object. The access token is valid for 15 minutes.

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

On each protected API route you will have to verify if the access token is still valid. Therefore the token should be sent with each call to the API in an authorization header as a bearer token and be verified:

```
const accessToken = req.headers.authorization.split(' ')[1]
const pkh = verifyAccessToken(accessToken)

```
If the access token is valid, you will receive the pkh of the valid user. Validate this with the account data that is being requested. If everything checks out, supply the user with the requested API information. If the access token is invalid, the pkh will be false. Thus the user should not get an API response.

_Refresh Token:_

By default the access token is only valid for 15 minutes. After this time the user will no longer be able to request information from the API. To make sure you will not need to make the user sign another message to retrieve a valid access token, you can implement a refresh token flow.

Creating a refresh token:
```
import { generateRefreshToken } from '@stakenow/siwt'

generateRefreshToken('PKH OF THE USER')
```

Verifying the refresh token:
```
import { verifyRefreshToken } from '@stakenow/siwt'

try {
  verifyRefreshToken('REFRESH TOKEN')
  // Refresh the access token for the user
} catch {
  // AccessToken cannot be renewed. Log your user out and request a new signed message to log in again.
}
```

Get more information on refresh tokens in general [here](https://auth0.com/docs/secure/tokens/refresh-tokens).

_ID Token:_

The ID token is an optional token, used for some extra information about your user. It is long lived and can be used to maintain some information about the user in your application. It requires the user's pkh, and takes claims and extra optionalUserInfo:

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

### **Putting it all together**

*index.js*

```
import { DAppClient } from '@airgap/beacon-sdk'
import jwt_decode from 'jwt-decode'

import * as siwt from '@stakenow/siwt'

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
          <div>
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
> For the full setup including the build process check out the demo folder.

### **Implementing your authorization API**

The library relies in the backend on your signin endpoint to be called `/signin`, which is a `POST` request that takes the following body: 
```
{
  pk: 'USER PUBLIC KEY',
  pkh: 'USER ADDRESS',
  signature: 'MESSAGE SIGNATURE',
}
```

For this example you will write this endpoint in Node.js using Express:

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
} = require('@stakenow/siwt')

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
          comparator: '>=',
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
      // when a user provided a valid signature, we can obtain and
      // return the required information about the user.

      // the usage of claims is supported but not required.
      const claims = {
        iss: 'https://api.siwtdemo.stakenow.fi',
        aud: ['https://siwtdemo.stakenow.fi'],
        azp: 'https://siwtdemo.stakenow.fi',
      }

      // the minimum we need to return is an access token that
      // allows the user to access the API. The pkh is required,
      // extra claims are optional.
      const accessToken = generateAccessToken({ pkh, claims })

      // we can use a refresh token to allow the access token to
      // be refreshed without the user needing to log in again.
      const refreshToken = generateRefreshToken(pkh)

      // we can use a long-lived ID token to return some personal
      // information about the user to the UI.
      const access = queryAccessControl({
        contractAddress: 'KT1',
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

## Run the demo
### **Clone the project**
 ```
git clone https://github.com/StakeNow/SIWT.git
cd SIWT
 ```
### **Add environment variables**
For the demo you will need to create your personal SECRETS which should be sufficently long, random and not easy to guess. For the demo it is not safety relevant but for your project please refer to [this documentation](https://jwt.io) regarding their requirements.

Create an ```.env``` file in the root folder with the following content:
```
ACCESS_TOKEN_SECRET=SECRET
REFRESH_TOKEN_SECRET=SECRET
ID_TOKEN_SECRET=SECRET
```

### **Start the demo**
Beginning from the root folder run:
```
npm install
```

### **Start the server**
```
npm run demo:server:start
``` 

If successful you should see the following message:

```
SIWT server app listening on port 3000
```

### **Build and run the ui**
In a new terminal window from the root folder run:
```
npm run demo:ui:start
```
The browser should open automatically. If not just open http://localhost:8080. Note that if port 8080 is already in use the application increments to 8081.

__Happy Demo!__

## Built with
- TZKT API: https://tzkt.io

## Future outlook

This demo proves that the concept of Signing In With Tezos to verify ownership of your pkh (public key hash aka address), and requiring ownership of certain assets (e.g. NFTs) to gain access to protected resources, works efficiently. This however is just the start of a larger discussion we would love to continue building with the Tezos community regarding these follow up topics:

- Standardisation of the message to be signed when signing in
- Standardisation of permission standards (ie. jwt claims/contents)
- Creating specialized smart contract(s) that facilitate the derivation of a user's permissions, for instance by using views
- Create a swap contract to directly obtain an NFT for a user to buy access to integrate in each individual project
- Expanding the accessControlQuery to allow for more extensive requirements
- Either remove or improve the use of indexers for retrieving accessControlQuery requirements
- Improving the abstraction created by the SIWT Package

## Get in contact
If you liked what you have seen here and want to get in touch with us just send us an email to info@stakenow.fi - any questions regarding this project can be initiated through the an Issue here on GitHub or by asking us directly in our [Discord](https://discord.com/invite/6J3bjhkpxm?utm_source=StakeNow+Discord+LP&utm_medium=Landing+Page&utm_campaign=StakeNow.Fi+Launch).
