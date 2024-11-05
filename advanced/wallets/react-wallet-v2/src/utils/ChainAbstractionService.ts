import axios from 'axios'
import { CA_ORCHESTRATOR_BASE_URL } from './ConstantsUtil'

export interface Transaction {
  from: string
  to: string
  value: string
  gas: string
  gasPrice: string
  data: string
  nonce: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  chainId: string
}

interface CheckResponse {
  requiresMultiChain: boolean
}

interface RouteResponse {
  transactions: Transaction[]
  orchestrationId: string
}
interface OrchestrationStatusResponse {
  status: 'pending' | 'completed' | 'error'
  createdAt: number
}

export class ChainAbstractionService {
  private baseUrl: string
  private projectId: string

  constructor() {
    this.baseUrl = CA_ORCHESTRATOR_BASE_URL
    if (!process.env.NEXT_PUBLIC_PROJECT_ID) {
      throw new Error('Project ID is not defined')
    }
    this.projectId = process.env.NEXT_PUBLIC_PROJECT_ID
  }

  async checkTransaction(transaction: Transaction): Promise<boolean> {
    try {
      const response = await axios.post<CheckResponse>(
        `${this.baseUrl}/check?projectId=${this.projectId}`,
        { transaction }
      )
      return response.data.requiresMultiChain
    } catch (error) {
      console.error('ChainAbstractionService: Error checking transaction:', error)
      throw error
    }
  }

  async routeTransaction(transaction: Transaction): Promise<RouteResponse> {
    try {
      const response = await axios.post<RouteResponse>(
        `${this.baseUrl}/route?projectId=${this.projectId}`,
        { transaction }
      )
      return response.data
    } catch (error) {
      console.error('ChainAbstractionService: Error routing transaction:', error)
      throw error
    }
  }
  async getOrchestrationStatus(orchestrationId: string): Promise<OrchestrationStatusResponse> {
    try {
      const response = await axios.get<OrchestrationStatusResponse>(
        `${this.baseUrl}/status?projectId=${this.projectId}&orchestrationId=${orchestrationId}`
      )
      return response.data
    } catch (error) {
      console.error('ChainAbstractionService: Error getting orchestration status :', error)
      throw error
    }
  }
}
