export class ApiHelper {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3001/v1') {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string) {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  }
}
