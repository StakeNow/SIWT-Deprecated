import axios, { AxiosInstance } from 'axios'

export const http: AxiosInstance = axios.create({
  timeout: 1000,
})
