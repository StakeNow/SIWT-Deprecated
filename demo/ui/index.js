import { DAppClient, NetworkType } from '@airgap/beacon-sdk'
import jwt_decode from 'jwt-decode'

import * as siwt from '../../dist/siwt'

import './style.css'

const dAppClient = new DAppClient({
  name: 'SIWT Demo',
  preferredNetwork: NetworkType.ITHACANET,
})

const state = { accessToken: '' }
const API_URL = process.env.API_URL || 'http://localhost:3000'

const getProtectedData = () => {
  fetch(`${API_URL}/protected`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${state.accessToken}`,
    },
  })
    .then(response => response.json())
    .then(data => {
      const protectedDataContainer = document.getElementsByClassName('protected-data-content-container')[0]
      const DemoContainer = document.getElementsByClassName('demo-container')[0]

      console.log(data)

      if (data.type === 200) {
        DemoContainer.classList.remove('from-sky-500', 'to-indigo-500')
        DemoContainer.classList.remove('from-red-600', 'to-sky-500')
        DemoContainer.classList.add('from-green-600', 'to-sky-500')
      } else {
        DemoContainer.classList.remove('from-green-600', 'to-sky-500')
        DemoContainer.classList.remove('from-sky-500', 'to-indigo-500')
        DemoContainer.classList.add('from-red-600', 'to-sky-500')
      }
      protectedDataContainer.innerHTML = data.message
    })
    .catch(error => {
      const protectedDataContainer = document.getElementsByClassName('protected-data-content-container')[0]
      protectedDataContainer.innerHTML = error.message
    })
}

const getPublicData = () => {
  fetch(`${API_URL}/public`, {
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
    const walletPermissions = await dAppClient.requestPermissions({
      network: {
        type: NetworkType.ITHACANET,
        rpcUrl: 'https://rpc.tzkt.io/ithacanet',
      },
    })

    // create the message to be signed
    const messagePayload = siwt.createMessagePayload({
      dappUrl: 'siwt.stakenow.fi',
      pkh: walletPermissions.address,
    })

    // request the signature
    const signedPayload = await dAppClient.requestSignPayload(messagePayload)

    // sign in the user to our app
    const { data } = await siwt.signIn(API_URL)({
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
