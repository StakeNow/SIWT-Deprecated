import { DAppClient } from '@airgap/beacon-sdk'
import { createMessagePayload, signIn } from '../../../dist/siwt'

import './style.css'

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
    const signedIn = await signIn('http://localhost:3000')({
      pk: walletPermissions.accountInfo.pk,
      message: messagePayload.payload,
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
