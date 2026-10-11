import type { ActionGateway } from '../types'

/** Records decisions locally. Never sends, buys, books or contacts anyone. */
export const demoActionGateway: ActionGateway = {
  async approve() {
    return {
      executedExternally: false,
      note: 'Approval recorded in this demo only — nothing was sent, bought or shared.',
    }
  },
  async reject() {
    return { executedExternally: false, note: 'Proposal rejected. Nothing will happen.' }
  },
}
