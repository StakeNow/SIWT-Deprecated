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


#### Verifying the signature
Just having the user sign this message is not enough. We also have to make sure the signature is valid before allowing the user to use our app.

To be able

This happens on the server and requires only the following:

```
const isValidSignature = verifySignature(message, pk, signature)
```

#### Putting it all together


*index.js*

```
import { DAppClient } from '@airgap/beacon-sdk'
import { createMessage, signIn } from '@stakenow/siwt'

const dAppClient = new DAppClient({ name: 'SIWT Example' })

const init = () => {
  const loginButton = document.getElementsByClassName('connect-button')[0]
  loginButton.addEventListener('click', login)
}

const login = async () => {
  try {
    // request wallet permissions with Beacon dAppClient
    const walletPermissions = await dAppClient.requestPermissions()

    // create the message to be signed
    const messagePayload = createMessagePayload({
      dappUrl: 'siwt.stakenow.fi',
      pkh: walletPermissions.address,
    })

    // request the signature
    const signature = await dAppClient.requestSignPayload(messagePayload)

    // sign in the user to our app
    const signedIn = await signIn({
      pk: walletPermissions.accountInfo.pk,
      pkh: walletPermissions.address,
      signature,
    })

    if (signedIn) {
      const contentContainer = document.getElementsByClassName('content-container')[0]
      contentContainer.innerHTML = 'Whoop whoop, you have permissions!'
    }
  } catch (error) {
    const contentContainer = document.getElementsByClassName('content-container')[0]
    contentContainer.innerHTML = error.message
  }
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
    <h1>Sign in with Tezos</h1>
    <button class="connect-button">Connect</button>
    <div class="content-container"></div>
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
import { verifySignature } = from '@stakenow/siwt'

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
```

## Running the demo

### Build the SIWT Library
Currently the demo is setup to run with a local distribution of SIWT. So until it's available through NPM we have to build the library first.

In the root folder run:
```
npm install
npm run build
```

### Start the server
From the `demo/server` folder run:
```
npm install
npm run start
``` 

If everything went correctly you should see the following message:

`SIWT server app listening on port 3000`

### Build and run the ui
In a new terminal window from the `demo/ui` folder run:
```
npm install
npm run start
```

__Happy Demo!__
