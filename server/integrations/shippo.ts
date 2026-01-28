interface ShippoTransaction {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_state: string;
  status: string;
  tracking_number: string;
  tracking_url_provider: string;
  label_url: string;
  commercial_invoice_url: string | null;
  rate: {
    object_id: string;
    amount: string;
    currency: string;
    provider: string;
    servicelevel: {
      name: string;
      token: string;
    };
  };
  metadata: string;
  parcel: string;
  messages: any[];
}

interface ShippoShipment {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  status: string;
  address_from: any;
  address_to: any;
  parcels: any[];
  shipment_date: string;
  metadata: string;
  rates: any[];
  carrier_accounts: string[];
  messages: any[];
}

interface ShippoTrackingStatus {
  object_id: string;
  tracking_number: string;
  carrier: string;
  tracking_status: {
    status: string;
    substatus: string;
    status_date: string;
    status_details: string;
    location: {
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  tracking_history: any[];
  eta: string | null;
  address_from: any;
  address_to: any;
  servicelevel: {
    name: string;
    token: string;
  };
  metadata: string;
  messages: any[];
}

export class ShippoIntegration {
  private apiKey: string;
  private baseUrl = 'https://api.goshippo.com';

  constructor() {
    this.apiKey = process.env.SHIPPO_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ SHIPPO_API_KEY not configured');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `ShippoToken ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shippo API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getTransactions(page = 1, resultsPerPage = 100): Promise<{ results: ShippoTransaction[]; next: string | null; previous: string | null; count: number }> {
    return this.request(`/transactions?page=${page}&results=${resultsPerPage}`);
  }

  async getAllTransactions(): Promise<ShippoTransaction[]> {
    const allTransactions: ShippoTransaction[] = [];
    let page = 1;
    let hasMore = true;

    console.log('📦 [Shippo] Fetching all transactions...');
    
    while (hasMore) {
      const response = await this.getTransactions(page, 100);
      allTransactions.push(...response.results);
      console.log(`📦 [Shippo] Fetched page ${page}, got ${response.results.length} transactions (total: ${allTransactions.length})`);
      
      hasMore = !!response.next;
      page++;
      
      if (page > 50) {
        console.log('📦 [Shippo] Stopping at page 50 to prevent excessive API calls');
        break;
      }
    }

    console.log(`📦 [Shippo] Total transactions fetched: ${allTransactions.length}`);
    return allTransactions;
  }

  async getShipments(page = 1, resultsPerPage = 100): Promise<{ results: ShippoShipment[]; next: string | null; previous: string | null; count: number }> {
    return this.request(`/shipments?page=${page}&results=${resultsPerPage}`);
  }

  async getAllShipments(): Promise<ShippoShipment[]> {
    const allShipments: ShippoShipment[] = [];
    let page = 1;
    let hasMore = true;

    console.log('📦 [Shippo] Fetching all shipments...');
    
    while (hasMore) {
      const response = await this.getShipments(page, 100);
      allShipments.push(...response.results);
      console.log(`📦 [Shippo] Fetched page ${page}, got ${response.results.length} shipments (total: ${allShipments.length})`);
      
      hasMore = !!response.next;
      page++;
      
      if (page > 50) {
        console.log('📦 [Shippo] Stopping at page 50 to prevent excessive API calls');
        break;
      }
    }

    console.log(`📦 [Shippo] Total shipments fetched: ${allShipments.length}`);
    return allShipments;
  }

  async getTrackingStatus(carrier: string, trackingNumber: string): Promise<ShippoTrackingStatus> {
    return this.request(`/tracks/${carrier}/${trackingNumber}`);
  }

  async registerTrackingWebhook(carrier: string, trackingNumber: string): Promise<any> {
    return this.request('/tracks', {
      method: 'POST',
      body: JSON.stringify({
        carrier,
        tracking_number: trackingNumber,
      }),
    });
  }

  parseOrderNumberFromMetadata(metadata: string): string | null {
    if (!metadata) return null;
    
    const patterns = [
      /order[:\s#]*(\d+)/i,
      /^(\d+)$/,
      /#(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = metadata.match(pattern);
      if (match) return match[1];
    }

    return metadata.trim() || null;
  }
}

export const shippoIntegration = new ShippoIntegration();
