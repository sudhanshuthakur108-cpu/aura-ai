import { demoActionGateway } from './demo/actionGateway'
import { demoChatService } from './demo/chatResponder'
import type { ActionGateway, ChatService } from './types'

export interface Services {
  chat: ChatService
  actions: ActionGateway
}

/** Swap these for real implementations when a backend exists. */
export const services: Services = {
  chat: demoChatService,
  actions: demoActionGateway,
}
