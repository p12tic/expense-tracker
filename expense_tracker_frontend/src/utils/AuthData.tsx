import axios from "axios";
import {makeAutoObservable} from "mobx";

import {getApiUrlForCurrentWindow} from "./Network";

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
  clearToken() {
    this.token = "";
    localStorage.removeItem("token");
  }
  async validateToken(): Promise<boolean> {
    if (!this.token) {
      return false;
    }
    try {
      const response = await axios.get(
        `${getApiUrlForCurrentWindow()}api/token`,
        {
          headers: {
            Authorization: `Token ${this.token}`,
          },
        },
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
export const authData = new AuthData();
