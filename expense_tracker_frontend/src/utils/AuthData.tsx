import {makeAutoObservable} from "mobx";

export class AuthData {
  token: string = localStorage.getItem("token") || "";

  constructor() {
    makeAutoObservable(this);
  }
  setToken(newToken: string) {
    this.token = newToken;
    localStorage.setItem("token", newToken);
  }
  getToken(): string {
    return this.token;
  }
}
export const authData = new AuthData();
