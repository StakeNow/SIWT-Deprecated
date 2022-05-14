import { DAppClient, NetworkType } from '@airgap/beacon-sdk'
import jwt_decode from 'jwt-decode'

import * as siwt from '@stakenow/siwt'

import './style.css'

const dAppClient = new DAppClient({
  name: 'SIWT Demo',
  preferredNetwork: NetworkType.ITHACANET,
})

const state = { accessToken: '' }
const API_URL = process.env.API_URL || 'http://localhost:3000'

const setBackground = (status) => {
  const DemoContainer = document.getElementsByClassName('demo-container')[0]
  // const DemoContainer = document.getElementsByClassName('message-container')[0]
  // const DemoContainer = document.getElementsByClassName('message-content')[0]
  DemoContainer.classList.remove('from-sky-500', 'to-sky-500')
  DemoContainer.classList.remove('bg-blue-700')
  if (status === 200) {
    DemoContainer.classList.add('from-green-500', 'to-sky-500')
    DemoContainer.classList.add('bg-green-500')
  } else if (status === 403) {
    DemoContainer.classList.add('from-red-500', 'to-sky-500')
    DemoContainer.classList.add('bg-red-500')
  } else {
    DemoContainer.classList.add('from-sky-500', 'to-indigo-500')
    DemoContainer.classList.add('bg-blue-700')
  }

  setTimeout(() => {
    DemoContainer.classList.remove('from-red-500', 'to-sky-500')
    DemoContainer.classList.remove('from-green-500', 'to-sky-500')
    DemoContainer.classList.add('from-sky-500', 'to-indigo-500')
    DemoContainer.classList.remove('bg-green-500')
    DemoContainer.classList.remove('bg-red-500')
    DemoContainer.classList.add('bg-blue-700')
  }, 1000)
}

const getProtectedData = () => {
  fetch(`${API_URL}/protected`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${state.accessToken}`,
    },
  })
    .then(response => {
      setBackground(response.status)
      return response.json()
    })
    .then(data => {
      // const protectedDataContainer = document.getElementsByClassName('protected-data-content-container')[0]
      // protectedDataContainer.innerHTML = data

      const MessageContent = document.getElementsByClassName('message-content')[0]
      MessageContent.innerHTML = data
    })
    .catch(error => {
      // const protectedDataContainer = document.getElementsByClassName('protected-data-content-container')[0]
      // protectedDataContainer.innerHTML = error.message

      const MessageContent = document.getElementsByClassName('message-content')[0]
      MessageContent.innerHTML = error.message
    })
}

const getSignedInData = () => {
  fetch(`${API_URL}/signin-required`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${state.accessToken}`,
    },
  })
    .then(response => {
      setBackground(response.status)
      return response.json()
    })
    .then(data => {
      // const protectedDataContainer = document.getElementsByClassName('signed-in-data-content-container')[0]
      // protectedDataContainer.innerHTML = data

      const MessageContent = document.getElementsByClassName('message-content')[0]
      MessageContent.innerHTML = data
    })
    .catch(error => {
      // const protectedDataContainer = document.getElementsByClassName('signed-in-data-content-container')[0]
      // protectedDataContainer.innerHTML = error.message

      const MessageContent = document.getElementsByClassName('message-content')[0]
      MessageContent.innerHTML = error.message
    })
}

const getPublicData = () => {
  fetch(`${API_URL}/public`, {
    method: 'GET',
  })
    .then(response => {
      setBackground(response.status)
      return response.json()
    })
    .then(data => {
      // const publicDataContainer = document.getElementsByClassName('public-data-content-container')[0]
      // publicDataContainer.innerHTML = data

      const MessageContent = document.getElementsByClassName('message-content')[0]
      MessageContent.innerHTML = data
    })
    .catch(error => {
      // const publicDataContainer = document.getElementsByClassName('public-data-content-container')[0]
      // publicDataContainer.innerHTML = error.message

      const MessageContent = document.getElementsByClassName('message-content')[0]
      MessageContent.innerHTML = error.message
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
      contentContainer.innerHTML = `<h3>You are connected with <br />${userIdInfo.pkh}</h3>`
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
  const loadSignedInDataButton = document.getElementsByClassName('load-signed-in-data-button')[0]
  loginButton.addEventListener('click', login)
  loadPublicDataButton.addEventListener('click', getPublicData)
  loadProtectedDataButton.addEventListener('click', getProtectedData)
  loadSignedInDataButton.addEventListener('click', getSignedInData)
}

window.onload = init
