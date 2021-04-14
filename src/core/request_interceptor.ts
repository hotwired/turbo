export class RequestInterceptor {
  static interceptor?: (request: any) => void

  static register(interceptor: (request: any) => void) {
    this.interceptor = interceptor
  }

  static get() {
    return this.interceptor
  }
}
