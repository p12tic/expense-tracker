import axios from "axios";
import {AxiosRequestConfig, AxiosResponse} from "axios";

export function getApiUrl(location: Location) {
  return `${location.protocol}//${location.host}/api/`;
}

export function getApiUrlForCurrentWindow() {
  return getApiUrl(window.location);
}

export class AuthAxios {
  static get(
    url: string,
    token: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.get(getApiUrlForCurrentWindow() + url, config);
  }

  static delete(
    url: string,
    token: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.delete(getApiUrlForCurrentWindow() + url, config);
  }

  static head(
    url: string,
    token: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.head(getApiUrlForCurrentWindow() + url, config);
  }

  static options(
    url: string,
    token: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.options(getApiUrlForCurrentWindow() + url, config);
  }

  static put(
    url: string,
    token: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.put(getApiUrlForCurrentWindow() + url, config);
  }

  static post(
    url: string,
    token: string,
    data: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.post(getApiUrlForCurrentWindow() + url, data, config);
  }

  static patch(
    url: string,
    token: string,
    data: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    config = AuthAxios.buildConfig(token, config);
    return axios.patch(getApiUrlForCurrentWindow() + url, data, config);
  }

  private static buildConfig(
    token: string,
    config?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    if (config === undefined) {
      config = {};
    }
    if (config.headers === undefined) {
      config.headers = {};
    }
    config.headers["Authorization"] = `Token ${token}`;
    return config;
  }
}
