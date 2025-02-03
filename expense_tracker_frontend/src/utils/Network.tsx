import axios from "axios";
import {AxiosRequestConfig, AxiosResponse} from "axios";

export class AuthAxios {
  static get(url: string, token: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.get(url, config);
  }

  static delete(url: string, token: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.delete(url, config);
  }

  static head(url: string, token: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.head(url, config);
  }

  static options(url: string, token: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.options(url, config);
  }

  static put(url: string, token: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.put(url, config);
  }

  static post(url: string, token: string, data: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.post(url, data, config);
  }

  static patch(url: string, token: string, data: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.patch(url, data, config);
  }

  private static buildConfig(token: string, config?: AxiosRequestConfig): AxiosRequestConfig {
    if (config === undefined) {
      config = {}
    }
    if (config.headers === undefined) {
      config.headers = {};
    }
    config.headers['Authorization'] = `Token ${token}`;
    return config;
  }
}