export class AuthData {
    token: string;

    constructor() {
        this.token = '';
    }
    setToken(newToken: string) {
        this.token = newToken;
    }
    getToken(): string {
        return this.token;
    }
}